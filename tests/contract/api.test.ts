import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryDataStore, ConflictError } from '../../src/domain/adapters/in-memory-store.ts';
import { RAVI_KUMAR_RISK_INPUT } from '../../src/risk-engine/fixtures/ravi-fixture.ts';

describe('TRUSTSHIELD AI - API and Domain State Contracts', () => {
  let store: InMemoryDataStore;

  beforeEach(() => {
    store = new InMemoryDataStore();
  });

  it('preloads Ravi Kumar primary case with reproducible 97/100 score and PAUSE_AND_VERIFY', async () => {
    const raviCase = await store.findById('CASE-2026-0915');
    expect(raviCase).not.toBeNull();
    expect(raviCase!.customerId).toBe('CUS-2948');
    expect(raviCase!.amountInr).toBe(75000);
    expect(raviCase!.riskResult.score).toBe(97);
    expect(raviCase!.riskResult.policy.action).toBe('PAUSE_AND_VERIFY');
    expect(raviCase!.riskResult.policy.reasonCode).toBe('P-CRITICAL-04');
    expect(raviCase!.lossPreventedInr).toBe(75000);
  });

  it('enforces append-only audit trail on state transitions', async () => {
    const initialEvents = await store.findByCaseId('CASE-2026-0915');
    const initialCount = initialEvents.length;

    // Analyst begins review
    await store.updateStatus(
      'CASE-2026-0915',
      'IN_REVIEW',
      'Analyst Priya Sharma',
      'ANALYST',
      'ACTION_IN_REVIEW',
      'Commencing behavioral baseline check'
    );

    const updatedEvents = await store.findByCaseId('CASE-2026-0915');
    expect(updatedEvents.length).toBe(initialCount + 1);

    const lastEvent = updatedEvents[updatedEvents.length - 1];
    expect(lastEvent.previousState).toBe('OPEN');
    expect(lastEvent.newState).toBe('IN_REVIEW');
    expect(lastEvent.actor).toBe('Analyst Priya Sharma');
    expect(lastEvent.actorRole).toBe('ANALYST');
    expect(lastEvent.reasonCode).toBe('ACTION_IN_REVIEW');
  });

  it('rejects invalid state transitions with a ConflictError', async () => {
    // Resolve scam
    await store.updateStatus(
      'CASE-2026-0915',
      'RESOLVED_SCAM',
      'Analyst Priya Sharma',
      'ANALYST',
      'SCAM_CONFIRMED',
      'Customer confirmed high coercion and fraudulent phone call.'
    );

    // Attempting to move from terminal RESOLVED_SCAM to OPEN must fail
    await expect(
      store.updateStatus(
        'CASE-2026-0915',
        'OPEN',
        'Customer',
        'CUSTOMER',
        'REOPEN'
      )
    ).rejects.toThrow(ConflictError);
  });

  it('enforces trusted contact state machine progression', async () => {
    // Case starts with NOT_REQUESTED
    const c1 = await store.findById('CASE-2026-0915');
    expect(c1!.trustedContact.status).toBe('NOT_REQUESTED');

    // Transition to REQUESTED
    const c2 = await store.updateTrustedContact(
      'CASE-2026-0915',
      'REQUESTED',
      'Customer Portal',
      'CUSTOMER',
      'Out-of-band SMS dispatched to Sunita Kumar'
    );
    expect(c2.trustedContact.status).toBe('REQUESTED');
    expect(c2.trustedContact.requestedAt).toBeDefined();

    // Transition to VERIFIED_SAFE
    const c3 = await store.updateTrustedContact(
      'CASE-2026-0915',
      'VERIFIED_SAFE',
      'Sunita Kumar (Trusted Contact)',
      'CUSTOMER',
      'Confirmed spoke with Ravi, no emergency'
    );
    expect(c3.trustedContact.status).toBe('VERIFIED_SAFE');
    expect(c3.trustedContact.verifiedAt).toBeDefined();
  });

  it('re-evaluates risk dynamically when scam context is updated', async () => {
    const original = await store.findById('CASE-2026-0915');
    const originalScore = original!.riskResult.score;

    // Simulate clearing the pressure and freeze threat cues
    const updated = await store.updateScamContext(
      'CASE-2026-0915',
      {
        pressure: false,
        account_freeze: false,
        official_impersonation: false,
      },
      'Customer Update',
      'CUSTOMER'
    );

    expect(updated.riskResult.score).toBeLessThan(originalScore);
  });

  it('provides accessible graph relationships and evidence for Ravi case', async () => {
    const graph = await store.getNetworkForCase('CASE-2026-0915');
    expect(graph.nodes.length).toBeGreaterThanOrEqual(6);
    expect(graph.edges.length).toBeGreaterThanOrEqual(6);

    // Check evidence text is present on all edges
    for (const edge of graph.edges) {
      expect(edge.evidence).toBeDefined();
      expect(edge.evidence.length).toBeGreaterThan(5);
      expect(edge.relationship).toBeDefined();
    }
  });
});
