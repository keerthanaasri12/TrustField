import { RiskInput } from '../../types/domain.ts';

/**
 * Stable, reproducible Ravi Kumar case fixture matching Section B1 specifications:
 * - Customer: Ravi Kumar, customer ID CUS-2948
 * - Normal payment range: ₹500–₹2,000
 * - Attack: Account-freeze / fake-bank-officer manipulation
 * - New device: Android device first seen at 09:10
 * - Beneficiary: quickpay.help@upi, newly added at 09:12
 * - Scam context: Customer confirms pressure, freeze threat, and claimed official
 * - Payment attempt: ₹75,000 at 09:15
 * - Network: Beneficiary has 8 links to a flagged synthetic mule cluster
 * - Expected score: exactly 97 / 100
 * - Expected policy: PAUSE_AND_VERIFY (P-CRITICAL-04)
 */
export const RAVI_KUMAR_RISK_INPUT: RiskInput = {
  transaction: {
    id: 'TXN-RAVI-0915',
    amountInr: 75000,
    channel: 'UPI',
    initiatedAt: '2026-09-03T09:15:00Z',
    isNewBeneficiary: true,
    sequenceIndex: 1,
  },
  behaviour: {
    typicalAmountMinInr: 500,
    typicalAmountMaxInr: 2000,
    amountPercentile: 99.8,
    velocityLastHour: 1,
    typicalHours: [9, 10, 11, 14, 15, 18, 19, 20],
    deviation: 0.95,
  },
  device: {
    deviceIdHash: '8f74a9c201d4be32a',
    isNew: true, // Android device first seen at 09:10
    locationChanged: true,
    ipRisk: 0.75,
    appReinstalled: false,
    sessionAnomaly: 0.45,
  },
  beneficiary: {
    id: 'quickpay.help@upi',
    ageDays: 0, // Newly added at 09:12
    firstPayment: true,
    priorFlags: 1,
    risk: 0.92,
  },
  network: {
    clusterSize: 8, // 8 links to flagged synthetic mule cluster
    hopsToFlagged: 1,
    exposureInr: 450000,
    risk: 0.88,
  },
  scamContext: {
    responses: {
      pressure: true,
      account_freeze: true,
      official_impersonation: true,
      unknown_app: false,
      promise_reward: false,
    },
    label: 'ACCOUNT_FREEZE_SCAM',
    confidence: 0.94,
    matchedCues: [
      'urgent pressure applied',
      'threatened account freeze within 30 minutes',
      'impersonated senior bank fraud supervisor',
    ],
  },
  supportContext: {
    firstTimeDigitalUser: false,
    needsSimplifiedFlow: false,
    trustedContactOptIn: true, // Pre-configured trusted contact
  },
};
