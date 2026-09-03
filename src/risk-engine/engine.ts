import {
  RiskInput,
  RiskResult,
  RiskComponent,
  RiskSignal,
  RiskPolicy,
  RiskCounterfactual,
  PolicyAction,
  RiskBand,
  RiskInputSchema,
} from '../types/domain.ts';

export const ENGINE_VERSION = 'v1.4.0-deterministic';

/**
 * Pure deterministic risk evaluation engine.
 * Never performs I/O, database access, or external network calls.
 */
export function evaluateRisk(rawInput: RiskInput): RiskResult {
  // Strict schema validation at the domain boundary
  const parsed = RiskInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Invalid RiskInput domain parameters: ${issues}`);
  }

  const input = parsed.data;

  // 1. Compute Components
  // Component A: Behavioral Anomaly (0 - 25)
  let behaviourScore = 0;
  const ratio = input.transaction.amountInr / Math.max(1, input.behaviour.typicalAmountMaxInr);
  if (ratio > 10) {
    behaviourScore += 18;
  } else if (ratio > 3) {
    behaviourScore += 12;
  } else if (ratio > 1.2) {
    behaviourScore += 6;
  }

  if (input.behaviour.amountPercentile >= 95) {
    behaviourScore += 4;
  } else if (input.behaviour.amountPercentile >= 80) {
    behaviourScore += 2;
  }

  if (input.behaviour.velocityLastHour > 2) {
    behaviourScore += 3;
  } else if (input.behaviour.deviation > 0.5) {
    behaviourScore += 2;
  }
  behaviourScore = Math.min(25, Math.round(behaviourScore));

  // Component B: Device & Session Risk (0 - 20)
  let deviceScore = 0;
  if (input.device.isNew) {
    deviceScore += 11;
  }
  if (input.device.locationChanged) {
    deviceScore += 4;
  }
  if (input.device.ipRisk > 0.4) {
    deviceScore += Math.round(input.device.ipRisk * 4);
  }
  if (input.device.sessionAnomaly > 0.3) {
    deviceScore += Math.round(input.device.sessionAnomaly * 3);
  }
  if (input.device.appReinstalled) {
    deviceScore += 2;
  }
  deviceScore = Math.min(20, Math.round(deviceScore));

  // Component C: Beneficiary & Network Cluster (0 - 25)
  let beneficiaryNetworkScore = 0;
  if (input.beneficiary.firstPayment || input.transaction.isNewBeneficiary) {
    beneficiaryNetworkScore += 8;
  }
  if (input.beneficiary.ageDays < 2) {
    beneficiaryNetworkScore += 5;
  }
  if (input.network.hopsToFlagged === 1 && input.network.clusterSize > 0) {
    beneficiaryNetworkScore += 12;
  } else if (input.network.hopsToFlagged <= 2 && input.network.clusterSize > 0) {
    beneficiaryNetworkScore += 7;
  }
  if (input.beneficiary.priorFlags > 0) {
    beneficiaryNetworkScore += 4;
  }
  beneficiaryNetworkScore = Math.min(25, Math.round(beneficiaryNetworkScore));

  // Component D: Manipulation & Scam Context (0 - 30)
  let scamScore = 0;
  const resp = input.scamContext.responses;
  const isUrgentPressure = resp['pressure'] === true || resp['URGENCY'] === true;
  const isFreezeThreat = resp['account_freeze'] === true || resp['FREEZE_THREAT'] === true;
  const isImpersonation = resp['official_impersonation'] === true || resp['IMPERSONATION'] === true;
  const isUnknownApp = resp['unknown_app'] === true || resp['REMOTE_ACCESS'] === true;
  const isPromiseReward = resp['promise_reward'] === true || resp['PROMISED_RETURNS'] === true;

  if (isUrgentPressure) scamScore += 8;
  if (isFreezeThreat) scamScore += 9;
  if (isImpersonation) scamScore += 8;
  if (isUnknownApp) scamScore += 6;
  if (isPromiseReward) scamScore += 5;

  if (input.scamContext.confidence > 0.7 && input.scamContext.label !== 'NONE') {
    scamScore += 4;
  }
  scamScore = Math.min(30, Math.round(scamScore));

  // Total raw score clamped strictly between 0 and 100
  let totalScore = behaviourScore + deviceScore + beneficiaryNetworkScore + scamScore;
  totalScore = Math.max(0, Math.min(100, Math.round(totalScore)));

  // Grounded Signals (only grounded in supplied input fields)
  const signals: RiskSignal[] = [];

  if (ratio >= 5) {
    signals.push({
      id: 'SIG_UNUSUAL_AMOUNT',
      severity: 'HIGH',
      title: 'Extreme Deviation from Typical Amount',
      evidence: `Requested ₹${(input.transaction.amountInr ?? 0).toLocaleString('en-IN')} is ${(ratio).toFixed(1)}x higher than typical maximum ₹${(input.behaviour.typicalAmountMaxInr ?? 0).toLocaleString('en-IN')}`,
      sourceFields: ['transaction.amountInr', 'behaviour.typicalAmountMaxInr'],
    });
  }

  if (input.device.isNew) {
    signals.push({
      id: 'SIG_NEW_DEVICE',
      severity: 'HIGH',
      title: 'New Device First Seen Minutes Ago',
      evidence: `Initiated from unrecognized device hash ${input.device.deviceIdHash.slice(0, 8)}... with zero prior transaction history`,
      sourceFields: ['device.isNew', 'device.deviceIdHash'],
    });
  }

  if (input.transaction.isNewBeneficiary && input.beneficiary.ageDays <= 1) {
    signals.push({
      id: 'SIG_NEW_BENEFICIARY_RUSH',
      severity: 'HIGH',
      title: 'Newly Added Payee Velocity',
      evidence: `Beneficiary ${input.beneficiary.id} added less than 24 hours ago with immediate high-value transfer request`,
      sourceFields: ['transaction.isNewBeneficiary', 'beneficiary.ageDays', 'beneficiary.id'],
    });
  }

  if (input.network.clusterSize > 0 && input.network.hopsToFlagged <= 2) {
    signals.push({
      id: 'SIG_MULE_NETWORK_LINK',
      severity: 'CRITICAL',
      title: 'Direct Link to Synthetic Mule Cluster',
      evidence: `Payee is ${input.network.hopsToFlagged} hop(s) away from known synthetic mule cluster with ${input.network.clusterSize} connected nodes`,
      sourceFields: ['network.clusterSize', 'network.hopsToFlagged', 'network.risk'],
    });
  }

  if (isUrgentPressure || isFreezeThreat) {
    signals.push({
      id: 'SIG_PRESSURE_FREEZE_CUE',
      severity: 'CRITICAL',
      title: 'Coercive Urgency & Account Freeze Threats',
      evidence: 'Customer self-reported high psychological pressure and threats of account freeze if funds were not transferred immediately',
      sourceFields: ['scamContext.responses.pressure', 'scamContext.responses.account_freeze'],
    });
  }

  if (isImpersonation) {
    signals.push({
      id: 'SIG_OFFICIAL_IMPERSONATION',
      severity: 'CRITICAL',
      title: 'Authority / Bank Officer Impersonation',
      evidence: 'Customer indicated the counterparty falsely claimed to be a bank security official or regulatory authority',
      sourceFields: ['scamContext.responses.official_impersonation'],
    });
  }

  // Check for Hard Override: New Device + Remote App + Account Takeover
  let hardOverrideAction: PolicyAction | null = null;
  let hardOverrideCode = '';
  if (input.device.isNew && isUnknownApp && input.scamContext.label === 'ACCOUNT_TAKEOVER') {
    hardOverrideAction = 'PAUSE_AND_VERIFY';
    hardOverrideCode = 'P-OVERRIDE-ATO';
  }

  // Policy determination based on Section E3
  let band: RiskBand;
  let action: PolicyAction;
  let reasonCode: string;
  let requiredSteps: string[];

  if (hardOverrideAction) {
    band = 'CRITICAL';
    action = hardOverrideAction;
    reasonCode = hardOverrideCode;
    requiredSteps = ['Block immediate dispatch', 'Revoke active sessions', 'Require out-of-band biometric/agent authentication'];
  } else if (totalScore >= 80) {
    band = 'CRITICAL';
    action = 'PAUSE_AND_VERIFY';
    reasonCode = 'P-CRITICAL-04';
    requiredSteps = [
      'Pause simulated payment immediately',
      'Trigger trusted-contact verification if opted-in',
      'Mandatory analyst manipulation review before release',
    ];
  } else if (totalScore >= 60) {
    band = 'HIGH';
    action = 'VERIFY_AND_DELAY';
    reasonCode = 'P-HIGH-03';
    requiredSteps = [
      'Apply 15-minute cooling off delay',
      'Present educational manipulation checklist',
      'Require secondary SMS OTP re-confirmation',
    ];
  } else if (totalScore >= 30) {
    band = 'MEDIUM';
    action = 'WARN_AND_CONFIRM';
    reasonCode = 'P-MEDIUM-02';
    requiredSteps = [
      'Show clear cautionary advisory',
      'Ask user to confirm beneficiary identity',
    ];
  } else {
    band = 'LOW';
    action = 'APPROVE';
    reasonCode = 'P-LOW-01';
    requiredSteps = ['Proceed with standard payment dispatch'];
  }

  const policy: RiskPolicy = {
    action,
    reasonCode,
    requiredSteps,
  };

  const components: RiskComponent[] = [
    { name: 'Behavioral Anomaly', score: behaviourScore, max: 25 },
    { name: 'Device & Session Risk', score: deviceScore, max: 20 },
    { name: 'Beneficiary & Network Risk', score: beneficiaryNetworkScore, max: 25 },
    { name: 'Manipulation & Scam Context', score: scamScore, max: 30 },
  ];

  // True Counterfactual Recalculation:
  // Re-run evaluation with the specific signal facts neutralized
  const counterfactuals: RiskCounterfactual[] = [];

  for (const sig of signals) {
    const clonedInput: RiskInput = JSON.parse(JSON.stringify(input));

    if (sig.id === 'SIG_UNUSUAL_AMOUNT') {
      // Normalize amount to typical average
      clonedInput.transaction.amountInr = clonedInput.behaviour.typicalAmountMinInr;
      clonedInput.behaviour.amountPercentile = 50;
    } else if (sig.id === 'SIG_NEW_DEVICE') {
      clonedInput.device.isNew = false;
      clonedInput.device.locationChanged = false;
    } else if (sig.id === 'SIG_NEW_BENEFICIARY_RUSH') {
      clonedInput.transaction.isNewBeneficiary = false;
      clonedInput.beneficiary.firstPayment = false;
      clonedInput.beneficiary.ageDays = 120;
    } else if (sig.id === 'SIG_MULE_NETWORK_LINK') {
      clonedInput.network.clusterSize = 0;
      clonedInput.network.hopsToFlagged = 99;
      clonedInput.network.risk = 0;
    } else if (sig.id === 'SIG_PRESSURE_FREEZE_CUE') {
      clonedInput.scamContext.responses['pressure'] = false;
      clonedInput.scamContext.responses['account_freeze'] = false;
    } else if (sig.id === 'SIG_OFFICIAL_IMPERSONATION') {
      clonedInput.scamContext.responses['official_impersonation'] = false;
    }

    // Evaluate without that signal (recursive call without counterfactual calculation to avoid loops)
    const recomputed = evaluateSubScore(clonedInput);
    counterfactuals.push({
      removeSignalId: sig.id,
      scoreBefore: totalScore,
      scoreAfter: recomputed,
      delta: Math.max(0, totalScore - recomputed),
    });
  }

  return {
    score: totalScore,
    band,
    components,
    signals,
    policy,
    counterfactuals,
    engineVersion: ENGINE_VERSION,
  };
}

/**
 * Helper to compute subscore purely for counterfactual recalculation
 */
function evaluateSubScore(input: RiskInput): number {
  let behaviourScore = 0;
  const ratio = input.transaction.amountInr / Math.max(1, input.behaviour.typicalAmountMaxInr);
  if (ratio > 10) behaviourScore += 18;
  else if (ratio > 3) behaviourScore += 12;
  else if (ratio > 1.2) behaviourScore += 6;

  if (input.behaviour.amountPercentile >= 95) behaviourScore += 4;
  else if (input.behaviour.amountPercentile >= 80) behaviourScore += 2;

  if (input.behaviour.velocityLastHour > 2) behaviourScore += 3;
  else if (input.behaviour.deviation > 0.5) behaviourScore += 2;
  behaviourScore = Math.min(25, Math.round(behaviourScore));

  let deviceScore = 0;
  if (input.device.isNew) deviceScore += 11;
  if (input.device.locationChanged) deviceScore += 4;
  if (input.device.ipRisk > 0.4) deviceScore += Math.round(input.device.ipRisk * 4);
  if (input.device.sessionAnomaly > 0.3) deviceScore += Math.round(input.device.sessionAnomaly * 3);
  if (input.device.appReinstalled) deviceScore += 2;
  deviceScore = Math.min(20, Math.round(deviceScore));

  let beneficiaryNetworkScore = 0;
  if (input.beneficiary.firstPayment || input.transaction.isNewBeneficiary) beneficiaryNetworkScore += 8;
  if (input.beneficiary.ageDays < 2) beneficiaryNetworkScore += 5;
  if (input.network.hopsToFlagged === 1 && input.network.clusterSize > 0) beneficiaryNetworkScore += 12;
  else if (input.network.hopsToFlagged <= 2 && input.network.clusterSize > 0) beneficiaryNetworkScore += 7;
  if (input.beneficiary.priorFlags > 0) beneficiaryNetworkScore += 4;
  beneficiaryNetworkScore = Math.min(25, Math.round(beneficiaryNetworkScore));

  let scamScore = 0;
  const resp = input.scamContext.responses;
  const isUrgentPressure = resp['pressure'] === true || resp['URGENCY'] === true;
  const isFreezeThreat = resp['account_freeze'] === true || resp['FREEZE_THREAT'] === true;
  const isImpersonation = resp['official_impersonation'] === true || resp['IMPERSONATION'] === true;
  const isUnknownApp = resp['unknown_app'] === true || resp['REMOTE_ACCESS'] === true;
  const isPromiseReward = resp['promise_reward'] === true || resp['PROMISED_RETURNS'] === true;

  if (isUrgentPressure) scamScore += 8;
  if (isFreezeThreat) scamScore += 9;
  if (isImpersonation) scamScore += 8;
  if (isUnknownApp) scamScore += 6;
  if (isPromiseReward) scamScore += 5;

  if (input.scamContext.confidence > 0.7 && input.scamContext.label !== 'NONE') {
    scamScore += 4;
  }
  scamScore = Math.min(30, Math.round(scamScore));

  return Math.max(0, Math.min(100, Math.round(behaviourScore + deviceScore + beneficiaryNetworkScore + scamScore)));
}
