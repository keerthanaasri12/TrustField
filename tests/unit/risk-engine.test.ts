import { describe, it, expect } from 'vitest';
import { evaluateRisk, ENGINE_VERSION } from '../../src/risk-engine/engine.ts';
import { RAVI_KUMAR_RISK_INPUT } from '../../src/risk-engine/fixtures/ravi-fixture.ts';
import { RiskInput } from '../../src/types/domain.ts';

describe('TRUSTSHIELD AI - Deterministic Risk & Policy Engine', () => {
  it('evaluates the Ravi Kumar case to exactly 97 / 100, CRITICAL, and PAUSE_AND_VERIFY (P-CRITICAL-04)', () => {
    const result = evaluateRisk(RAVI_KUMAR_RISK_INPUT);

    // Exact score invariant
    expect(result.score).toBe(97);
    expect(result.band).toBe('CRITICAL');
    expect(result.policy.action).toBe('PAUSE_AND_VERIFY');
    expect(result.policy.reasonCode).toBe('P-CRITICAL-04');
    expect(result.engineVersion).toBe(ENGINE_VERSION);

    // Must return exactly 6 grounded signals
    expect(result.signals).toHaveLength(6);
    const signalIds = result.signals.map((s) => s.id);
    expect(signalIds).toContain('SIG_UNUSUAL_AMOUNT');
    expect(signalIds).toContain('SIG_NEW_DEVICE');
    expect(signalIds).toContain('SIG_NEW_BENEFICIARY_RUSH');
    expect(signalIds).toContain('SIG_MULE_NETWORK_LINK');
    expect(signalIds).toContain('SIG_PRESSURE_FREEZE_CUE');
    expect(signalIds).toContain('SIG_OFFICIAL_IMPERSONATION');

    // Check components sum up to score
    const componentTotal = result.components.reduce((acc, c) => acc + c.score, 0);
    expect(componentTotal).toBe(97);

    // Check counterfactuals recalculation: each counterfactual delta > 0 and scoreAfter < scoreBefore
    expect(result.counterfactuals).toHaveLength(6);
    for (const cf of result.counterfactuals) {
      expect(cf.scoreBefore).toBe(97);
      expect(cf.scoreAfter).toBeLessThan(97);
      expect(cf.delta).toBe(cf.scoreBefore - cf.scoreAfter);
    }
  });

  it('guarantees identical input produces identical outputs deterministically', () => {
    const run1 = evaluateRisk(RAVI_KUMAR_RISK_INPUT);
    const run2 = evaluateRisk(RAVI_KUMAR_RISK_INPUT);
    expect(run1).toEqual(run2);
  });

  it('evaluates all 4 policy bands correctly at boundaries', () => {
    // 1. Low risk: 0-29 -> APPROVE (P-LOW-01)
    const lowRiskInput: RiskInput = {
      transaction: {
        id: 'TXN-LOW-1',
        amountInr: 800,
        channel: 'UPI',
        initiatedAt: '2026-09-03T10:00:00Z',
        isNewBeneficiary: false,
        sequenceIndex: 1,
      },
      behaviour: {
        typicalAmountMinInr: 500,
        typicalAmountMaxInr: 2000,
        amountPercentile: 40,
        velocityLastHour: 0,
        typicalHours: [10],
        deviation: 0.1,
      },
      device: {
        deviceIdHash: 'device-known-1',
        isNew: false,
        locationChanged: false,
        ipRisk: 0.05,
        appReinstalled: false,
        sessionAnomaly: 0.05,
      },
      beneficiary: {
        id: 'known.friend@upi',
        ageDays: 300,
        firstPayment: false,
        priorFlags: 0,
        risk: 0.05,
      },
      network: {
        clusterSize: 0,
        hopsToFlagged: 99,
        exposureInr: 0,
        risk: 0.02,
      },
      scamContext: {
        responses: {
          pressure: false,
          account_freeze: false,
          official_impersonation: false,
          unknown_app: false,
          promise_reward: false,
        },
        label: 'NONE',
        confidence: 0,
        matchedCues: [],
      },
      supportContext: {
        firstTimeDigitalUser: false,
        needsSimplifiedFlow: false,
        trustedContactOptIn: true,
      },
    };

    const lowResult = evaluateRisk(lowRiskInput);
    expect(lowResult.score).toBeLessThan(30);
    expect(lowResult.band).toBe('LOW');
    expect(lowResult.policy.action).toBe('APPROVE');
    expect(lowResult.policy.reasonCode).toBe('P-LOW-01');

    // 2. Medium risk: 30-59 -> WARN_AND_CONFIRM (P-MEDIUM-02)
    const medInput: RiskInput = JSON.parse(JSON.stringify(lowRiskInput));
    medInput.transaction.amountInr = 7500; // ratio > 3.5 -> +12
    medInput.behaviour.amountPercentile = 85; // +2
    medInput.device.isNew = true; // +11
    medInput.transaction.isNewBeneficiary = true; // +8
    medInput.beneficiary.firstPayment = true;

    const medResult = evaluateRisk(medInput);
    expect(medResult.score).toBeGreaterThanOrEqual(30);
    expect(medResult.score).toBeLessThan(60);
    expect(medResult.band).toBe('MEDIUM');
    expect(medResult.policy.action).toBe('WARN_AND_CONFIRM');
    expect(medResult.policy.reasonCode).toBe('P-MEDIUM-02');

    // 3. High risk: 60-79 -> VERIFY_AND_DELAY (P-HIGH-03)
    const highInput: RiskInput = JSON.parse(JSON.stringify(medInput));
    highInput.transaction.amountInr = 18000; // ratio > 9 -> +18
    highInput.device.locationChanged = true; // +4
    highInput.beneficiary.ageDays = 0; // +5
    highInput.network.hopsToFlagged = 1;
    highInput.network.clusterSize = 4; // +12
    highInput.scamContext.responses['pressure'] = true; // +8

    const highResult = evaluateRisk(highInput);
    expect(highResult.score).toBeGreaterThanOrEqual(60);
    expect(highResult.score).toBeLessThan(80);
    expect(highResult.band).toBe('HIGH');
    expect(highResult.policy.action).toBe('VERIFY_AND_DELAY');
    expect(highResult.policy.reasonCode).toBe('P-HIGH-03');

    // 4. Critical risk: 80-100 -> PAUSE_AND_VERIFY (P-CRITICAL-04)
    const critResult = evaluateRisk(RAVI_KUMAR_RISK_INPUT);
    expect(critResult.score).toBeGreaterThanOrEqual(80);
    expect(critResult.band).toBe('CRITICAL');
    expect(critResult.policy.action).toBe('PAUSE_AND_VERIFY');
    expect(critResult.policy.reasonCode).toBe('P-CRITICAL-04');
  });

  it('clamps scores strictly between 0 and 100 even with maximal input weights', () => {
    const extremeInput: RiskInput = JSON.parse(JSON.stringify(RAVI_KUMAR_RISK_INPUT));
    extremeInput.transaction.amountInr = 50000000;
    extremeInput.behaviour.velocityLastHour = 100;
    extremeInput.device.ipRisk = 1.0;
    extremeInput.device.sessionAnomaly = 1.0;
    extremeInput.beneficiary.risk = 1.0;
    extremeInput.beneficiary.priorFlags = 50;
    extremeInput.network.risk = 1.0;
    extremeInput.scamContext.responses = {
      pressure: true,
      account_freeze: true,
      official_impersonation: true,
      unknown_app: true,
      promise_reward: true,
    };
    extremeInput.scamContext.confidence = 1.0;

    const result = evaluateRisk(extremeInput);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result.score)).toBe(true);
  });

  it('rejects invalid or corrupted inputs with a typed validation error', () => {
    // @ts-expect-error - testing invalid input
    expect(() => evaluateRisk({})).toThrow(/Invalid RiskInput domain parameters/);
    expect(() => evaluateRisk({ ...RAVI_KUMAR_RISK_INPUT, transaction: { ...RAVI_KUMAR_RISK_INPUT.transaction, amountInr: -50 } })).toThrow();
  });

  it('executes hard override when new device + remote access app + account takeover cue', () => {
    const overrideInput: RiskInput = JSON.parse(JSON.stringify(RAVI_KUMAR_RISK_INPUT));
    overrideInput.device.isNew = true;
    overrideInput.scamContext.responses = {
      pressure: false,
      account_freeze: false,
      official_impersonation: false,
      unknown_app: true,
      promise_reward: false,
    };
    overrideInput.scamContext.label = 'ACCOUNT_TAKEOVER';
    overrideInput.transaction.amountInr = 1000; // low amount normally
    overrideInput.network.clusterSize = 0;
    overrideInput.network.hopsToFlagged = 99;

    const result = evaluateRisk(overrideInput);
    expect(result.policy.action).toBe('PAUSE_AND_VERIFY');
    expect(result.policy.reasonCode).toBe('P-OVERRIDE-ATO');
  });
});
