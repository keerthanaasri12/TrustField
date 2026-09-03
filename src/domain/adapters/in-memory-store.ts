import {
  CaseRecord,
  NetworkGraph,
  AuditEvent,
  CaseState,
  TrustedContactState,
  Role,
} from '../../types/domain.ts';
import {
  CaseRepository,
  GraphRepository,
  AuditRepository,
  CaseFilter,
  PaginatedCases,
  Clock,
  IdGenerator,
} from '../ports.ts';
import { generateSyntheticDataset, DEMO_SEED } from '../../data/synthetic-generator.ts';
import { evaluateRisk } from '../../risk-engine/engine.ts';
import { classifyManipulationText } from '../../risk-engine/scam-classifier.ts';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
  iso(): string {
    return new Date().toISOString();
  }
}

export class SimpleIdGenerator implements IdGenerator {
  private counter = 100;
  generateId(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${Date.now().toString(36)}-${this.counter}`;
  }
  generateCorrelationId(): string {
    return `corr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class InMemoryDataStore implements CaseRepository, GraphRepository, AuditRepository {
  private cases: Map<string, CaseRecord> = new Map();
  private auditEvents: AuditEvent[] = [];
  private graph: NetworkGraph;
  private clock: Clock;
  private idGen: IdGenerator;

  constructor(clock: Clock = new SystemClock(), idGen: IdGenerator = new SimpleIdGenerator()) {
    this.clock = clock;
    this.idGen = idGen;
    const seeded = generateSyntheticDataset(DEMO_SEED);
    this.graph = seeded.graph;

    for (const c of seeded.cases) {
      this.cases.set(c.id, JSON.parse(JSON.stringify(c)));
      for (const ev of c.auditEvents) {
        this.auditEvents.push(JSON.parse(JSON.stringify(ev)));
      }
    }
  }

  // Reset store to default seed state
  reset(seed = DEMO_SEED): void {
    this.cases.clear();
    this.auditEvents = [];
    const seeded = generateSyntheticDataset(seed);
    this.graph = seeded.graph;
    for (const c of seeded.cases) {
      this.cases.set(c.id, JSON.parse(JSON.stringify(c)));
      for (const ev of c.auditEvents) {
        this.auditEvents.push(JSON.parse(JSON.stringify(ev)));
      }
    }
  }

  async findById(caseId: string): Promise<CaseRecord | null> {
    const found = this.cases.get(caseId);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async findByPaymentId(paymentId: string): Promise<CaseRecord | null> {
    for (const c of this.cases.values()) {
      if (c.paymentId === paymentId) {
        return JSON.parse(JSON.stringify(c));
      }
    }
    return null;
  }

  async findAll(filter: CaseFilter): Promise<PaginatedCases> {
    let list = Array.from(this.cases.values());

    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.customerName.toLowerCase().includes(q) ||
          c.recipientId.toLowerCase().includes(q) ||
          c.recipientName.toLowerCase().includes(q)
      );
    }

    if (filter.riskBand && filter.riskBand !== 'ALL') {
      list = list.filter((c) => c.riskResult.band === filter.riskBand);
    }

    if (filter.status && filter.status !== 'ALL') {
      list = list.filter((c) => c.status === filter.status);
    }

    const sortField = filter.sort || 'createdAt';
    const order = filter.order === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      if (sortField === 'amountInr') {
        return (a.amountInr - b.amountInr) * order;
      }
      if (sortField === 'riskScore') {
        return (a.riskResult.score - b.riskResult.score) * order;
      }
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * order;
    });

    const page = Math.max(1, filter.page || 1);
    const pageSize = Math.max(1, Math.min(50, filter.pageSize || 10));
    const total = list.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paged = list.slice(start, start + pageSize);

    return {
      cases: JSON.parse(JSON.stringify(paged)),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async save(caseRecord: CaseRecord): Promise<void> {
    this.cases.set(caseRecord.id, JSON.parse(JSON.stringify(caseRecord)));
  }

  async updateStatus(
    caseId: string,
    nextStatus: CaseState,
    actor: string,
    role: Role,
    reasonCode: string,
    notes?: string,
    correlationId?: string
  ): Promise<CaseRecord> {
    const record = this.cases.get(caseId);
    if (!record) {
      throw new NotFoundError(`Case ${caseId} does not exist`);
    }

    const currentStatus = record.status;

    // Validate state machine transitions
    const validTransitions: Record<CaseState, CaseState[]> = {
      OPEN: ['IN_REVIEW', 'TRUSTED_CONTACT_PENDING', 'ESCALATED', 'RESOLVED_SCAM', 'RESOLVED_SAFE'],
      IN_REVIEW: ['TRUSTED_CONTACT_PENDING', 'ESCALATED', 'RESOLVED_SCAM', 'RESOLVED_SAFE', 'OPEN'],
      TRUSTED_CONTACT_PENDING: ['IN_REVIEW', 'ESCALATED', 'RESOLVED_SCAM', 'RESOLVED_SAFE'],
      ESCALATED: ['RESOLVED_SCAM', 'RESOLVED_SAFE', 'IN_REVIEW'],
      RESOLVED_SCAM: [],
      RESOLVED_SAFE: [],
    };

    if (currentStatus === nextStatus) {
      return JSON.parse(JSON.stringify(record));
    }

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new ConflictError(
        `Invalid state transition: Cannot move Case from '${currentStatus}' to '${nextStatus}'.`
      );
    }

    record.status = nextStatus;
    record.updatedAt = this.clock.iso();
    if (role === 'ANALYST') {
      record.assignedAnalyst = actor;
    }

    const corr = correlationId || this.idGen.generateCorrelationId();
    const auditEvent: AuditEvent = {
      id: this.idGen.generateId('AUD'),
      correlationId: corr,
      caseId,
      actor,
      actorRole: role,
      action: `STATUS_CHANGE_TO_${nextStatus}`,
      previousState: currentStatus,
      newState: nextStatus,
      reasonCode,
      notes: notes || `Case state changed from ${currentStatus} to ${nextStatus}`,
      timestamp: this.clock.iso(),
    };

    record.auditEvents.push(auditEvent);
    this.auditEvents.push(JSON.parse(JSON.stringify(auditEvent)));
    this.cases.set(caseId, record);

    return JSON.parse(JSON.stringify(record));
  }

  async updateTrustedContact(
    caseId: string,
    nextStatus: TrustedContactState,
    actor: string,
    role: Role,
    notes?: string,
    correlationId?: string
  ): Promise<CaseRecord> {
    const record = this.cases.get(caseId);
    if (!record) {
      throw new NotFoundError(`Case ${caseId} does not exist`);
    }

    const currentStatus = record.trustedContact.status;
    const validTransitions: Record<TrustedContactState, TrustedContactState[]> = {
      NOT_REQUESTED: ['REQUESTED'],
      REQUESTED: ['VERIFIED_SAFE', 'VERIFIED_CONCERN', 'EXPIRED'],
      VERIFIED_SAFE: [],
      VERIFIED_CONCERN: [],
      EXPIRED: ['REQUESTED'],
    };

    if (currentStatus === nextStatus) {
      return JSON.parse(JSON.stringify(record));
    }

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new ConflictError(
        `Invalid trusted contact transition: Cannot move from '${currentStatus}' to '${nextStatus}'.`
      );
    }

    record.trustedContact.status = nextStatus;
    record.updatedAt = this.clock.iso();
    if (nextStatus === 'REQUESTED') {
      record.trustedContact.requestedAt = this.clock.iso();
    } else {
      record.trustedContact.verifiedAt = this.clock.iso();
      record.trustedContact.verificationNotes = notes;
    }

    const corr = correlationId || this.idGen.generateCorrelationId();
    const auditEvent: AuditEvent = {
      id: this.idGen.generateId('AUD'),
      correlationId: corr,
      caseId,
      actor,
      actorRole: role,
      action: `TRUSTED_CONTACT_${nextStatus}`,
      previousState: currentStatus,
      newState: nextStatus,
      reasonCode: 'TC-STATE-UPDATE',
      notes: notes || `Trusted contact updated to ${nextStatus}`,
      timestamp: this.clock.iso(),
    };

    record.auditEvents.push(auditEvent);
    this.auditEvents.push(JSON.parse(JSON.stringify(auditEvent)));
    this.cases.set(caseId, record);

    return JSON.parse(JSON.stringify(record));
  }

  async updateScamContext(
    caseId: string,
    responses: Record<string, boolean | 'UNSURE'>,
    actor: string,
    role: Role,
    correlationId?: string
  ): Promise<CaseRecord> {
    const record = this.cases.get(caseId);
    if (!record) {
      throw new NotFoundError(`Case ${caseId} does not exist`);
    }

    // Merge responses into existing riskInput
    record.riskInput.scamContext.responses = {
      ...record.riskInput.scamContext.responses,
      ...responses,
    };

    // Re-classify scam label
    const classification = classifyManipulationText(
      '',
      record.riskInput.scamContext.responses as Record<string, boolean | 'UNSURE'>
    );
    record.riskInput.scamContext.label = classification.label;
    record.riskInput.scamContext.confidence = classification.confidence;
    record.riskInput.scamContext.matchedCues = classification.matchedCues;
    record.scamLabel = classification.label;
    record.manipulationCues = classification.matchedCues;

    // Pure deterministic re-evaluation
    const newRisk = evaluateRisk(record.riskInput);
    const prevScore = record.riskResult.score;
    record.riskResult = newRisk;
    record.updatedAt = this.clock.iso();

    const corr = correlationId || this.idGen.generateCorrelationId();
    const auditEvent: AuditEvent = {
      id: this.idGen.generateId('AUD'),
      correlationId: corr,
      caseId,
      actor,
      actorRole: role,
      action: 'SCAM_CONTEXT_UPDATED',
      previousState: `SCORE_${prevScore}`,
      newState: `SCORE_${newRisk.score}`,
      reasonCode: newRisk.policy.reasonCode,
      notes: `Scam context updated. Risk score updated from ${prevScore} to ${newRisk.score}. Action: ${newRisk.policy.action}`,
      timestamp: this.clock.iso(),
    };

    record.auditEvents.push(auditEvent);
    this.auditEvents.push(JSON.parse(JSON.stringify(auditEvent)));
    this.cases.set(caseId, record);

    return JSON.parse(JSON.stringify(record));
  }

  async getNetworkForCase(_caseId: string): Promise<NetworkGraph> {
    return JSON.parse(JSON.stringify(this.graph));
  }

  async append(event: AuditEvent): Promise<void> {
    this.auditEvents.push(JSON.parse(JSON.stringify(event)));
  }

  async findByCaseId(caseId: string): Promise<AuditEvent[]> {
    return this.auditEvents
      .filter((e) => e.caseId === caseId)
      .map((e) => JSON.parse(JSON.stringify(e)));
  }

  async getAll(limit = 100): Promise<AuditEvent[]> {
    const sorted = [...this.auditEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return sorted.slice(0, limit).map((e) => JSON.parse(JSON.stringify(e)));
  }
}
