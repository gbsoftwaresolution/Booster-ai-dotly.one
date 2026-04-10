# Event Radar V01

## Purpose

This directory contains the full Event Radar `v01` roadmap pack for Cards.

The pack is organized as a sprint-by-sprint specification set across three product phases:

- `P01` - Event QR Exchange
- `P02` - Registration And Identity
- `P03` - Passes, Check-In, And Post-Event Ops

Each sprint document is written as an execution-ready product and engineering spec with:

- objective
- scope
- backend scope
- frontend scope
- audit scope
- fix scope
- re-audit scope
- GREEN criteria
- continue or stop gate
- definition of done
- sprint closeout message

## Directory Structure

### Phase 1 - Event QR Exchange

1. `001-p01-01A-event-foundation.md`
   - event model, ownership, lifecycle, defaults

2. `002-p01-01B-stall-and-qr-exchange.md`
   - event nodes, stalls, node QR routing, card assignment

3. `003-p01-01C-sharing-rules-and-consent.md`
   - scope rules, field-level consent, exchange persistence

4. `004-p01-01D-leads-dashboard-and-export.md`
   - event/stall dashboards, exports, CRM-ready reporting

### Phase 2 - Registration And Identity

5. `005-p02-02A-registration-and-participant-identity.md`
   - registration model, participant identity, approval states

6. `006-p02-02B-directory-and-mutual-exchange.md`
   - participant directory, visibility rules, mutual networking

7. `007-p02-02C-organizer-and-exhibitor-operations.md`
   - organizer ops, stall staffing, operational permissions

### Phase 3 - Passes, Check-In, And Post-Event Ops

8. `008-p03-03A-event-pass-and-wallet-foundation.md`
   - event pass model, issuance, wallet foundation

9. `009-p03-03B-entry-check-in-and-scan-types.md`
   - entry validation, scan types, check-in audit trail

10. `010-p03-03C-post-event-ops-and-crm-routing.md`

- post-event closeout, CRM routing, follow-up operations

## Recommended Execution Order

Execute strictly in document order.

Recommended sequence:

1. `001`
2. `002`
3. `003`
4. `004`
5. `005`
6. `006`
7. `007`
8. `008`
9. `009`
10. `010`

Do not skip foundational sprints unless the skipped capabilities are intentionally removed from scope.

## GREEN Model

Every sprint in this pack uses the same delivery gate.

A sprint is only considered complete when all of the following are true:

- implementation scope is complete
- audit is complete
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- all sprint-specific GREEN criteria are satisfied

If a sprint is not GREEN, the next sprint must not assume that foundation is safe.

## Handoff Rules

Each sprint includes a `Continue Or Stop Gate` section.

Use it to decide whether:

- the next sprint can proceed safely
- work must pause until blocking issues are resolved

This is especially important for Event Radar because later phases depend heavily on the correctness of:

- ownership and authorization
- consent and privacy
- participant identity
- pass integrity
- scan validation
- CRM routing truthfulness

## Product Arc

Event Radar evolves in this pack as follows:

1. Event-scoped QR and exchange foundation
2. Participant registration and event identity
3. Pass issuance and event-day validation
4. Post-event follow-up and CRM routing

This means the product grows from:

- `Cards + event-aware QR exchange`

into:

- `event identity, networking, and operational follow-up`

## Key Design Principles

These principles should remain consistent across all implementation work:

- keep `registration`, `identity`, `exchange`, `pass`, and `check-in` as separate concepts
- prefer truthful operational behavior over inflated metrics or vague UX
- preserve event and node attribution everywhere
- never overstate participant visibility or mutual exchange permissions
- treat audit, fix, and re-audit as part of the sprint, not post-work

## Completion Standard

Event Radar `v01` is complete only when `010-p03-03C-post-event-ops-and-crm-routing.md` exits with:

- `GREEN - v01 Complete`

or

- `GREEN - v01 Complete With Noted Deferrals`

If the final sprint is not GREEN, the roadmap pack should be treated as incomplete.
