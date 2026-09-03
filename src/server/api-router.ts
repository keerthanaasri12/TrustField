import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { InMemoryDataStore, ConflictError, NotFoundError } from '../domain/adapters/in-memory-store.ts';
import { SafeExplanationService } from '../domain/adapters/ai-explanation-service.ts';
import { evaluateRisk } from '../risk-engine/engine.ts';
import { classifyManipulationText } from '../risk-engine/scam-classifier.ts';
import { RiskInputSchema, Role, CaseRecord, ScamLabel, ProblemDetails } from '../types/domain.ts';
import { RAVI_KUMAR_RISK_INPUT } from '../risk-engine/fixtures/ravi-fixture.ts';
import { generateSyntheticDataset } from '../data/synthetic-generator.ts';

export function createApiRouter(dataStore: InMemoryDataStore): Router {
  const router = Router();
  const explanationService = new SafeExplanationService();

  // Helper for RFC 9457 problem responses
  function sendProblem(
    res: Response,
    status: number,
    title: string,
    detail: string,
    errorCode: string,
    correlationId: string,
    fieldErrors?: Array<{ field: string; message: string }>
  ) {
    const problem: ProblemDetails = {
      type: `https://trustshield.ai/errors/${errorCode.toLowerCase()}`,
      title,
      status,
      detail,
      errorCode,
      correlationId,
      timestamp: new Date().toISOString(),
      fieldErrors,
    };
    return res.status(status).json(problem);
  }

  // Idempotency cache for mutation requests
  const idempotencyCache = new Map<string, { status: number; body: unknown }>();

  // Middleware to resolve correlation ID and role
  router.use((req: Request, res: Response, next: NextFunction) => {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['idempotency-key'] as string) ||
      `corr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    res.setHeader('X-Correlation-ID', correlationId);
    (req as any).correlationId = correlationId;

    const roleHeader = (req.headers['x-role'] as string)?.toUpperCase();
    const role: Role = roleHeader === 'ANALYST' || roleHeader === 'ADMIN' ? (roleHeader as Role) : 'CUSTOMER';
    (req as any).userRole = role;
    next();
  });

  // 1. Health and readiness
  router.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), mode: 'demo-synthetic' });
  });

  router.get('/readyz', (req, res) => {
    res.status(200).json({ status: 'ready', dependencies: { store: 'in-memory-ready', ai: 'optional-ready' } });
  });

  // 2. Risk Evaluation directly from pure inputs
  router.post('/risk/evaluate', (req: Request, res: Response) => {
    const parsed = RiskInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendProblem(
        res,
        400,
        'Invalid Risk Evaluation Input',
        'Payload does not adhere to strict RiskInput schema.',
        'ERR_INVALID_SCHEMA',
        (req as any).correlationId,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      );
    }
    try {
      const result = evaluateRisk(parsed.data);
      return res.status(200).json(result);
    } catch (err) {
      return sendProblem(
        res,
        500,
        'Risk Engine Computation Error',
        err instanceof Error ? err.message : 'Unknown evaluation error',
        'ERR_EVALUATION_FAILED',
        (req as any).correlationId
      );
    }
  });

  // 3. Payment Simulation (Customer initiation)
  const SimulatePaymentSchema = z.object({
    customerId: z.string(),
    recipient: z.string().min(3),
    recipientName: z.string().optional(),
    amountInr: z.number().positive().max(5000000),
    channel: z.enum(['UPI', 'IMPS', 'NEFT']),
    note: z.string().optional(),
    scamResponses: z.record(z.string(), z.union([z.boolean(), z.literal('UNSURE')])).optional(),
  });

  router.post('/payments/simulate', async (req: Request, res: Response) => {
    const correlationId = (req as any).correlationId;
    const idempotencyKey = req.headers['idempotency-key'] as string;

    if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
      const cached = idempotencyCache.get(idempotencyKey)!;
      return res.status(cached.status).json(cached.body);
    }

    const parsed = SimulatePaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendProblem(
        res,
        400,
        'Invalid Payment Simulation Request',
        'Missing or invalid payment parameters.',
        'ERR_INVALID_PAYMENT',
        correlationId,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      );
    }

    const { customerId, recipient, recipientName, amountInr, channel, scamResponses } = parsed.data;

    // Check if this matches Ravi's primary demo case
    const isRaviCase =
      customerId === 'CUS-2948' &&
      recipient.toLowerCase().includes('quickpay') &&
      amountInr >= 50000;

    let riskInput = JSON.parse(JSON.stringify(RAVI_KUMAR_RISK_INPUT));
    if (isRaviCase) {
      riskInput.transaction.amountInr = amountInr;
      riskInput.transaction.channel = channel;
      if (scamResponses) {
        riskInput.scamContext.responses = {
          ...riskInput.scamContext.responses,
          ...scamResponses,
        };
      }
    } else {
      // Build dynamic risk input for general customer payments
      const isLarge = amountInr > 25000;
      const responses = scamResponses || {};
      const hasPressure = responses['pressure'] === true;
      const hasFreeze = responses['account_freeze'] === true;

      riskInput = {
        transaction: {
          id: `TXN-${Date.now().toString(36)}`,
          amountInr,
          channel,
          initiatedAt: new Date().toISOString(),
          isNewBeneficiary: isLarge,
          sequenceIndex: 1,
        },
        behaviour: {
          typicalAmountMinInr: 500,
          typicalAmountMaxInr: 3000,
          amountPercentile: isLarge ? 98 : 45,
          velocityLastHour: isLarge ? 2 : 0,
          typicalHours: [10, 11, 14, 18],
          deviation: isLarge ? 0.8 : 0.1,
        },
        device: {
          deviceIdHash: 'dev-hash-customer-current',
          isNew: isLarge && hasFreeze,
          locationChanged: isLarge && hasFreeze,
          ipRisk: isLarge ? 0.6 : 0.05,
          appReinstalled: false,
          sessionAnomaly: isLarge ? 0.4 : 0.05,
        },
        beneficiary: {
          id: recipient,
          ageDays: isLarge ? 0 : 90,
          firstPayment: isLarge,
          priorFlags: isLarge ? 1 : 0,
          risk: isLarge ? 0.8 : 0.05,
        },
        network: {
          clusterSize: isLarge ? 4 : 0,
          hopsToFlagged: isLarge ? 1 : 99,
          exposureInr: isLarge ? amountInr * 3 : 0,
          risk: isLarge ? 0.75 : 0.02,
        },
        scamContext: {
          responses,
          label: hasFreeze ? 'ACCOUNT_FREEZE_SCAM' : hasPressure ? 'FAKE_SUPPORT' : 'NONE',
          confidence: hasFreeze || hasPressure ? 0.85 : 0,
          matchedCues: hasFreeze ? ['pressure', 'freeze threat'] : [],
        },
        supportContext: {
          firstTimeDigitalUser: false,
          needsSimplifiedFlow: false,
          trustedContactOptIn: true,
        },
      };
    }

    const riskResult = evaluateRisk(riskInput);
    const caseId = `CASE-2026-${Date.now().toString(36).toUpperCase()}`;
    const paymentId = riskInput.transaction.id;

    // Create case record
    const newCase: CaseRecord = {
      id: caseId,
      customerId,
      customerName: customerId === 'CUS-2948' ? 'Ravi Kumar' : 'Simulated Customer',
      accountNumberMasked: '•••• •••• 8492',
      paymentId,
      amountInr,
      recipientId: recipient,
      recipientName: recipientName || recipient,
      channel,
      status: riskResult.score >= 80 ? 'OPEN' : 'RESOLVED_SAFE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      riskResult,
      riskInput,
      scamLabel: riskInput.scamContext.label as ScamLabel,
      manipulationCues: riskInput.scamContext.matchedCues,
      trustedContact: {
        name: 'Sunita Kumar',
        relationship: 'Spouse',
        phoneMasked: '+91 98221 •••••',
        status: 'NOT_REQUESTED',
      },
      lossPreventedInr: riskResult.score >= 80 ? amountInr : 0,
      assignedAnalyst: 'Unassigned',
      auditEvents: [
        {
          id: `AUD-${Date.now().toString(36)}`,
          correlationId,
          caseId,
          actor: 'Customer Portal',
          actorRole: 'CUSTOMER',
          action: 'PAYMENT_SIMULATION_SUBMITTED',
          previousState: 'DRAFT',
          newState: riskResult.policy.action === 'PAUSE_AND_VERIFY' ? 'PAUSED' : 'EVALUATED',
          reasonCode: riskResult.policy.reasonCode,
          timestamp: new Date().toISOString(),
          notes: `Simulated payment of ₹${(amountInr ?? 0).toLocaleString('en-IN')} scored ${riskResult.score}/100. Action: ${riskResult.policy.action}`,
        },
      ],
    };

    await dataStore.save(newCase);

    const responseBody = {
      caseId: newCase.id,
      paymentId,
      status: newCase.status,
      riskResult,
      isPaused: riskResult.policy.action === 'PAUSE_AND_VERIFY',
      lossPreventedInr: newCase.lossPreventedInr,
      trustedContactAvailable: true,
      message:
        riskResult.policy.action === 'PAUSE_AND_VERIFY'
          ? `Simulated payment paused to protect customer from manipulation. Score: ${riskResult.score}/100.`
          : `Simulated payment processed under policy ${riskResult.policy.action}.`,
    };

    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, { status: 201, body: responseBody });
    }

    return res.status(201).json(responseBody);
  });

  // 4. Update Scam Context for an active Case
  router.post('/cases/:caseId/scam-context', async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const correlationId = (req as any).correlationId;
    const role = (req as any).userRole;

    const schema = z.object({
      responses: z.record(z.string(), z.union([z.boolean(), z.literal('UNSURE')])),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return sendProblem(
        res,
        400,
        'Invalid Scam Context Responses',
        'Answers must be boolean or UNSURE.',
        'ERR_INVALID_RESPONSES',
        correlationId
      );
    }

    try {
      const updated = await dataStore.updateScamContext(
        caseId,
        parsed.data.responses as Record<string, boolean | 'UNSURE'>,
        'Customer / Scam Dialog',
        role,
        correlationId
      );
      return res.status(200).json(updated);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return sendProblem(res, 404, 'Case Not Found', err.message, 'ERR_CASE_NOT_FOUND', correlationId);
      }
      return sendProblem(res, 500, 'Context Update Error', String(err), 'ERR_CONTEXT_UPDATE', correlationId);
    }
  });

  // 5. Trusted Contact Request
  router.post('/cases/:caseId/trusted-contact-request', async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const correlationId = (req as any).correlationId;
    const role = (req as any).userRole;

    const schema = z.object({
      action: z.enum(['REQUEST', 'VERIFY_SAFE', 'VERIFY_CONCERN']),
      notes: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return sendProblem(res, 400, 'Invalid Trusted Contact Action', 'Missing action parameter.', 'ERR_INVALID_TC', correlationId);
    }

    const nextState =
      parsed.data.action === 'REQUEST'
        ? 'REQUESTED'
        : parsed.data.action === 'VERIFY_SAFE'
        ? 'VERIFIED_SAFE'
        : 'VERIFIED_CONCERN';

    try {
      const updated = await dataStore.updateTrustedContact(
        caseId,
        nextState,
        'Customer / Trusted Contact Portal',
        role,
        parsed.data.notes,
        correlationId
      );
      return res.status(200).json(updated);
    } catch (err) {
      if (err instanceof ConflictError) {
        return sendProblem(res, 409, 'Conflict in Trusted Contact State', err.message, 'ERR_TC_CONFLICT', correlationId);
      }
      if (err instanceof NotFoundError) {
        return sendProblem(res, 404, 'Case Not Found', err.message, 'ERR_CASE_NOT_FOUND', correlationId);
      }
      return sendProblem(res, 500, 'Server Error', String(err), 'ERR_TC_ERROR', correlationId);
    }
  });

  // 6. Analyst Case Decisions
  router.post('/cases/:caseId/decisions', async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const correlationId = (req as any).correlationId;
    const role = (req as any).userRole;

    // Server-side role check
    if (role !== 'ANALYST' && role !== 'ADMIN') {
      return sendProblem(
        res,
        403,
        'Forbidden Role',
        'Analyst decision operations require ANALYST or ADMIN role authorization.',
        'ERR_ROLE_UNAUTHORIZED',
        correlationId
      );
    }

    const schema = z.object({
      decision: z.enum(['APPROVE', 'REJECT', 'REQUEST_REVIEW', 'CONFIRM_SCAM']),
      reasonCode: z.string().min(3),
      notes: z.string().min(5),
      analystName: z.string().min(2),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return sendProblem(
        res,
        400,
        'Invalid Decision Parameters',
        'Decision, reasonCode, and notes are strictly required.',
        'ERR_INVALID_DECISION',
        correlationId,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      );
    }

    const { decision, reasonCode, notes, analystName } = parsed.data;

    let targetState = 'IN_REVIEW';
    if (decision === 'APPROVE') targetState = 'RESOLVED_SAFE';
    else if (decision === 'CONFIRM_SCAM' || decision === 'REJECT') targetState = 'RESOLVED_SCAM';
    else if (decision === 'REQUEST_REVIEW') targetState = 'ESCALATED';

    try {
      const updated = await dataStore.updateStatus(
        caseId,
        targetState as any,
        analystName,
        role,
        reasonCode,
        notes,
        correlationId
      );
      return res.status(200).json({
        caseId: updated.id,
        status: updated.status,
        assignedAnalyst: updated.assignedAnalyst,
        updatedAt: updated.updatedAt,
        decisionRecorded: decision,
      });
    } catch (err) {
      if (err instanceof ConflictError) {
        return sendProblem(res, 409, 'Conflict in Case State Transition', err.message, 'ERR_STATE_CONFLICT', correlationId);
      }
      if (err instanceof NotFoundError) {
        return sendProblem(res, 404, 'Case Not Found', err.message, 'ERR_CASE_NOT_FOUND', correlationId);
      }
      return sendProblem(res, 500, 'Server Error', String(err), 'ERR_DECISION_FAILED', correlationId);
    }
  });

  // 7. Get paginated cases
  router.get('/cases', async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 10;
    const sort = (req.query.sort as any) || 'createdAt';
    const order = (req.query.order as any) || 'desc';
    const riskBand = req.query.riskBand as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const result = await dataStore.findAll({ page, pageSize, sort, order, riskBand, status, search });
    return res.status(200).json(result);
  });

  // 8. Get case by ID
  router.get('/cases/:caseId', async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const correlationId = (req as any).correlationId;
    const record = await dataStore.findById(caseId);
    if (!record) {
      return sendProblem(res, 404, 'Case Not Found', `No case found for ID ${caseId}`, 'ERR_CASE_NOT_FOUND', correlationId);
    }
    return res.status(200).json(record);
  });

  // 9. Case Network Graph
  router.get('/cases/:caseId/network', async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const graph = await dataStore.getNetworkForCase(caseId);
    return res.status(200).json(graph);
  });

  // 10. Explain Case Intervention
  router.get('/cases/:caseId/explain', async (req: Request, res: Response) => {
    const { caseId } = req.params;
    const correlationId = (req as any).correlationId;
    const record = await dataStore.findById(caseId);
    if (!record) {
      return sendProblem(res, 404, 'Case Not Found', `No case found for ID ${caseId}`, 'ERR_CASE_NOT_FOUND', correlationId);
    }

    const explanation = await explanationService.explainIntervention({
      customerName: record.customerName,
      amountInr: record.amountInr,
      riskScore: record.riskResult.score,
      policyAction: record.riskResult.policy.action,
      signals: record.riskResult.signals.map((s) => ({ title: s.title, evidence: s.evidence })),
    });

    return res.status(200).json(explanation);
  });

  // 11. Analytics Summary
  router.get('/analytics/summary', (req: Request, res: Response) => {
    const seeded = generateSyntheticDataset();
    return res.status(200).json(seeded.analytics);
  });

  // 12. Red-Team Simulator Run
  router.post('/simulator/run', async (req: Request, res: Response) => {
    const schema = z.object({
      presetId: z.string(),
      step: z.number().int().min(1).max(5).optional(),
    });
    const parsed = schema.safeParse(req.body);
    const correlationId = (req as any).correlationId;

    if (!parsed.success) {
      return sendProblem(res, 400, 'Invalid Simulator Request', 'presetId required', 'ERR_INVALID_SIMULATOR', correlationId);
    }

    const dataset = generateSyntheticDataset();
    const preset = dataset.scamPresets.find((p) => p.id === parsed.data.presetId) || dataset.scamPresets[0];

    // Return preset events and risk outcomes
    return res.status(200).json({
      preset,
      step: parsed.data.step || 5,
      completed: (parsed.data.step || 5) >= 5,
      lossPreventedInr: preset.simulatedAmountInr,
      simulatedOutcome: preset.expectedFriction,
      auditTimestamp: new Date().toISOString(),
    });
  });

  // 13. Demo Reset endpoint
  router.post('/simulator/reset', (req: Request, res: Response) => {
    dataStore.reset();
    return res.status(200).json({ status: 'reset_successful', message: 'Seeded synthetic demo data restored to initial state.' });
  });

  // 14. Audit Trail query
  router.get('/audit-log', async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const events = await dataStore.getAll(limit);
    return res.status(200).json({ events, total: events.length });
  });

  return router;
}
