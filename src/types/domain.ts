import { z } from 'zod';

export type ScamLabel =
  | 'NONE'
  | 'KYC_SCAM'
  | 'ACCOUNT_FREEZE_SCAM'
  | 'DIGITAL_ARREST'
  | 'FAKE_INVESTMENT'
  | 'QR_SCAM'
  | 'FAKE_SUPPORT'
  | 'ACCOUNT_TAKEOVER';

export type PolicyAction =
  | 'APPROVE'
  | 'WARN_AND_CONFIRM'
  | 'VERIFY_AND_DELAY'
  | 'PAUSE_AND_VERIFY';

export type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type Role = 'CUSTOMER' | 'ANALYST' | 'ADMIN';

export type PaymentSimulationState =
  | 'DRAFT'
  | 'EVALUATING'
  | 'APPROVED'
  | 'WARNED'
  | 'VERIFYING'
  | 'PAUSED'
  | 'RESOLVED';

export type CaseState =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'TRUSTED_CONTACT_PENDING'
  | 'ESCALATED'
  | 'RESOLVED_SCAM'
  | 'RESOLVED_SAFE';

export type TrustedContactState =
  | 'NOT_REQUESTED'
  | 'REQUESTED'
  | 'VERIFIED_SAFE'
  | 'VERIFIED_CONCERN'
  | 'EXPIRED';

// Schema validation for input
export const RiskInputSchema = z.object({
  transaction: z.object({
    id: z.string(),
    amountInr: z.number().positive(),
    channel: z.enum(['UPI', 'IMPS', 'NEFT']),
    initiatedAt: z.string(),
    isNewBeneficiary: z.boolean(),
    sequenceIndex: z.number().int().nonnegative(),
  }),
  behaviour: z.object({
    typicalAmountMinInr: z.number().nonnegative(),
    typicalAmountMaxInr: z.number().positive(),
    amountPercentile: z.number().min(0).max(100),
    velocityLastHour: z.number().nonnegative(),
    typicalHours: z.array(z.number().min(0).max(23)),
    deviation: z.number().min(0).max(1),
  }),
  device: z.object({
    deviceIdHash: z.string(),
    isNew: z.boolean(),
    locationChanged: z.boolean(),
    ipRisk: z.number().min(0).max(1),
    appReinstalled: z.boolean(),
    sessionAnomaly: z.number().min(0).max(1),
  }),
  beneficiary: z.object({
    id: z.string(),
    ageDays: z.number().nonnegative(),
    firstPayment: z.boolean(),
    priorFlags: z.number().nonnegative(),
    risk: z.number().min(0).max(1),
  }),
  network: z.object({
    clusterSize: z.number().nonnegative(),
    hopsToFlagged: z.number().nonnegative(),
    exposureInr: z.number().nonnegative(),
    risk: z.number().min(0).max(1),
  }),
  scamContext: z.object({
    responses: z.record(z.string(), z.union([z.boolean(), z.literal('UNSURE')])),
    label: z.enum([
      'NONE',
      'KYC_SCAM',
      'ACCOUNT_FREEZE_SCAM',
      'DIGITAL_ARREST',
      'FAKE_INVESTMENT',
      'QR_SCAM',
      'FAKE_SUPPORT',
      'ACCOUNT_TAKEOVER',
    ]),
    confidence: z.number().min(0).max(1),
    matchedCues: z.array(z.string()),
  }),
  supportContext: z.object({
    firstTimeDigitalUser: z.boolean(),
    needsSimplifiedFlow: z.boolean(),
    trustedContactOptIn: z.boolean(),
  }),
});

export type RiskInput = z.infer<typeof RiskInputSchema>;

export interface RiskComponent {
  name: string;
  score: number;
  max: number;
}

export interface RiskSignal {
  id: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  evidence: string;
  sourceFields: string[];
}

export interface RiskPolicy {
  action: PolicyAction;
  reasonCode: string;
  requiredSteps: string[];
}

export interface RiskCounterfactual {
  removeSignalId: string;
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
}

export interface RiskResult {
  score: number; // integer 0..100
  band: RiskBand;
  components: RiskComponent[];
  signals: RiskSignal[];
  policy: RiskPolicy;
  counterfactuals: RiskCounterfactual[];
  engineVersion: string;
}

export interface AuditEvent {
  id: string;
  correlationId: string;
  caseId: string;
  actor: string;
  actorRole: Role;
  action: string;
  previousState: string;
  newState: string;
  reasonCode: string;
  notes?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface TrustedContactInfo {
  name: string;
  relationship: string;
  phoneMasked: string;
  status: TrustedContactState;
  requestedAt?: string;
  verifiedAt?: string;
  verificationNotes?: string;
}

export interface CaseRecord {
  id: string;
  customerId: string;
  customerName: string;
  accountNumberMasked: string;
  paymentId: string;
  amountInr: number;
  recipientId: string;
  recipientName: string;
  channel: 'UPI' | 'IMPS' | 'NEFT';
  status: CaseState;
  createdAt: string;
  updatedAt: string;
  riskResult: RiskResult;
  riskInput: RiskInput;
  scamLabel: ScamLabel;
  manipulationCues: string[];
  trustedContact: TrustedContactInfo;
  lossPreventedInr: number;
  assignedAnalyst?: string;
  auditEvents: AuditEvent[];
}

export interface GraphNode {
  id: string;
  type: 'Customer' | 'Account' | 'Device' | 'Beneficiary' | 'MuleCluster' | 'NetworkContext';
  label: string;
  flagged?: boolean;
  properties: Record<string, string | number | boolean>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: 'OWNS' | 'USES' | 'ADDED_BENEFICIARY' | 'SENT_SIMULATED_PAYMENT' | 'LINKED_TO' | 'OBSERVED_FROM';
  evidence: string;
  timestamp?: string;
}

export interface NetworkGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface AnalyticsSummary {
  transactionsMonitored: number;
  highRiskFlagged: number;
  pausedInterventions: number;
  totalLossPreventedInr: number;
  medianRiskScore: number;
  activeInvestigations: number;
  falsePositiveDemoRate: number; // percentage
  topScamTypologies: Array<{ label: ScamLabel; count: number; preventedInr: number }>;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  errorCode: string;
  correlationId: string;
  timestamp: string;
  fieldErrors?: Array<{ field: string; message: string }>;
}
