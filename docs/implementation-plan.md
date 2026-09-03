# TRUSTSHIELD AI — Implementation Plan

## Phase 1: Foundation & Domain Engine (In Progress)
- [x] Analyze requirements, dependencies, and environment constraints.
- [x] Configure metadata.json, index.html, and package.json with test and full-stack scripts.
- [x] Define typed domain models (`src/types/domain.ts`) with Zod schemas.
- [x] Implement pure deterministic risk and policy engine (`src/risk-engine/engine.ts`).
- [x] Implement deterministic scam classifier (`src/risk-engine/scam-classifier.ts`).
- [x] Validate Ravi Kumar fixture produces exactly 97/100, `PAUSE_AND_VERIFY`, `P-CRITICAL-04`, and ₹75,000 loss prevented.

## Phase 2: Synthetic Data & Repository Adapters
- [x] Implement deterministic seeded RNG (`src/data/synthetic-generator.ts`) generating 500+ synthetic customers, accounts, devices, beneficiaries, and mule network graph.
- [x] Implement domain ports and in-memory repository (`src/domain/adapters/in-memory-store.ts`) with correlation keys and append-only audit trail.
- [x] Implement safe AI explanation service with deterministic fallback (`src/domain/adapters/ai-explanation-service.ts`).

## Phase 3: Backend Services & API Endpoints
- [x] Implement Express API router (`src/server/api-router.ts`) matching all specification routes.
- [x] Add RFC 9457 problem detail errors, role checks (`CUSTOMER`, `ANALYST`, `ADMIN`), idempotency, and structured logging.
- [x] Implement `/healthz` and `/readyz` endpoints.
- [x] Integrate Vite middleware in `server.ts`.

## Phase 4: Customer Protection Portal UI
- [x] Customer account overview with masked account, ₹2.84L synthetic balance, normal transactions, and trusted-contact consent.
- [x] Real-time simulated payment form with validation and fraud manipulation checks.
- [x] Live risk decision screen with friction progression (Approve, Warn, Verify, Pause).
- [x] Scam context assessment modal (pressure, freeze threat, impersonation, unknown app).
- [x] Critical protection pause screen with trusted contact alert and safe alternatives.
- [x] Scam reporting and official non-emergency guidance dialog.

## Phase 5: Bank Security Command Center & Fraud Network
- [x] Real-time KPI dashboard (monitored, flagged, paused, loss prevented, median score).
- [x] Review queue with status/risk filters, sorting, and pagination.
- [x] Deep case investigation drawer with behavioral baseline, timeline, and analyst decision workflow.
- [x] Interactive Fraud Network Explorer with visual nodes/edges and accessible relationship evidence table.
- [x] Explainability panel with grounded signal cards, counterfactual recalculation, and model transparency.

## Phase 6: Red-Team Manipulation Simulator & Testing
- [x] Red-Team scenario laboratory with 7 scam presets.
- [x] 5-step animated replayable scenario for Ravi's account-freeze attack.
- [x] Unit, contract, and end-to-end automated test suite verifying all invariants.
- [x] Documentation suite (`README.md`, `architecture.md`, `threat-model.md`, `data-dictionary.md`, `demo-script.md`, `runbook.md`).
