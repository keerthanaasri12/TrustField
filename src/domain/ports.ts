import {
  CaseRecord,
  NetworkGraph,
  AuditEvent,
  CaseState,
  TrustedContactState,
  Role,
  RiskResult,
  RiskInput,
} from '../types/domain.ts';

export interface Clock {
  now(): Date;
  iso(): string;
}

export interface IdGenerator {
  generateId(prefix: string): string;
  generateCorrelationId(): string;
}

export interface CaseFilter {
  page?: number;
  pageSize?: number;
  sort?: 'createdAt' | 'amountInr' | 'riskScore';
  order?: 'asc' | 'desc';
  riskBand?: string;
  status?: string;
  search?: string;
}

export interface PaginatedCases {
  cases: CaseRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CaseRepository {
  findById(caseId: string): Promise<CaseRecord | null>;
  findByPaymentId(paymentId: string): Promise<CaseRecord | null>;
  findAll(filter: CaseFilter): Promise<PaginatedCases>;
  save(caseRecord: CaseRecord): Promise<void>;
  updateStatus(
    caseId: string,
    nextStatus: CaseState,
    actor: string,
    role: Role,
    reasonCode: string,
    notes?: string,
    correlationId?: string
  ): Promise<CaseRecord>;
  updateTrustedContact(
    caseId: string,
    nextStatus: TrustedContactState,
    actor: string,
    role: Role,
    notes?: string,
    correlationId?: string
  ): Promise<CaseRecord>;
  updateScamContext(
    caseId: string,
    responses: Record<string, boolean | 'UNSURE'>,
    actor: string,
    role: Role,
    correlationId?: string
  ): Promise<CaseRecord>;
}

export interface GraphRepository {
  getNetworkForCase(caseId: string): Promise<NetworkGraph>;
}

export interface AuditRepository {
  append(event: AuditEvent): Promise<void>;
  findByCaseId(caseId: string): Promise<AuditEvent[]>;
  getAll(limit?: number): Promise<AuditEvent[]>;
}

export interface ExplanationService {
  explainIntervention(facts: {
    customerName: string;
    amountInr: number;
    riskScore: number;
    policyAction: string;
    signals: Array<{ title: string; evidence: string }>;
  }): Promise<{
    explanation: string;
    source: 'DETERMINISTIC_GROUNDED' | 'AI_GROUNDED_MODEL';
    factHash: string;
  }>;
}
