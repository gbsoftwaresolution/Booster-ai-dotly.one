# World Class Cards V01 - 021 - P06 - 06C - Recovery Reconciliation And Operator Tooling

## Objective

Complete the Event Reliability program and close World Class Cards v01 by adding recovery, reconciliation, and operator tooling for offline-originated event operations.

This sprint builds on:

- `019-p06-06A-offline-reliability-architecture.md`
- `020-p06-06B-offline-check-in-and-scan-queue.md`

It adds:

- reconciliation workflow
- conflict review model
- operator recovery surfaces
- sync health visibility
- final event reliability closeout standards

At the end of this sprint, Dotly should have a full operational path for degraded event-day conditions: define trust, execute offline, then recover and reconcile safely.

## Problem

After Sprint 020, Dotly can queue offline event actions and sync them later. But without recovery and reconciliation tooling:

- failed items remain hard to interpret
- operators may not know which scans need attention
- organizers may not trust final attendance truth after degraded operations
- conflict cases remain operationally hidden
- the offline system is usable in theory but still incomplete in practice

The platform now needs the final reliability layer: helping humans recover from degraded operation safely and visibly.

## Product Intent

This sprint should make Dotly feel operationally resilient.

The product promise is:

- offline event-day work can be recovered, not just queued
- conflicts are visible and manageable
- operators understand what synced, what failed, and what needs review
- final event attendance and audit history remain trustworthy after degraded operation

This sprint is not trying to create a huge operations control center. It is creating the minimum trustworthy tooling required to close the loop.

## Sprint Scope

In scope:

- reconciliation state model
- failed/conflicted queue review
- retry and recovery flows
- operator-visible sync health states
- organizer/operator conflict awareness
- final event reliability closeout rules

Out of scope:

- complex distributed device management
- enterprise fleet management
- advanced operational analytics beyond recovery truth

## Sprint Delivery Structure

Every World Class Cards sprint should be executable and reviewable through the same delivery frame used in Event Radar and Card Privacy.

Required sections for every sprint:

- backend scope
- frontend scope
- audit scope
- fix scope
- re-audit scope
- GREEN criteria
- handoff decision: can the remaining work continue in the next sprint or not

### Sprint completion rule

The sprint is not complete just because failed queue items are visible. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

This sprint is intended to close World Class Cards v01.

If recovery and reconciliation remain untrustworthy, the v01 roadmap pack must be treated as incomplete.

## Core Design Principle

This sprint must keep `failure visibility`, `retry behavior`, and `final resolution` separate.

That means:

- failed items must be visible
- operators may retry where appropriate
- some cases may become conflicted and require explicit resolution or final server-side status

If these states are collapsed into one vague `error` bucket, recovery becomes hard to operate.

## User Roles In This Sprint

Primary roles:

- Event operator
  - needs to understand and recover from sync failures

- Organizer
  - needs confidence in final event-day truth after degraded operation

- Platform
  - needs a recovery layer strong enough to call offline reliability complete

## User Stories

### User stories

1. As an operator, I want to know which offline actions failed to sync and what I can do next.

2. As an operator, I want to retry recoverable items safely.

3. As an organizer, I want final attendance and scan history to remain trustworthy even after offline disruptions.

### Platform stories

1. As the platform, I need conflict states explicit rather than hidden behind generic failures.

2. As the platform, I need a final recovery view that makes sync health understandable.

3. As the platform, I need a clean completion standard for event reliability in v01.

## Reconciliation Model

Recommended final queue/reconciliation states:

- `SYNCED`
- `FAILED_RETRYABLE`
- `FAILED_TERMINAL`
- `CONFLICTED`
- `RESOLVED`

Recommendation:

- make these visible in operator tooling
- do not silently bury conflicted outcomes

## Functional Requirements

### FR1 - Recovery view

Operators must be able to see queue items that failed or conflicted.

### FR2 - Retry flow

Retryable items must support safe retry.

### FR3 - Conflict visibility

Conflicted items must be distinguishable from generic failure.

### FR4 - Sync health summary

The system should provide a summary such as:

- all synced
- some pending
- some failed
- conflicts need review

### FR5 - Final resolution state

Recovered items should eventually reach a visible final state.

### FR6 - Audit compatibility

Recovery and reconciliation outcomes must remain compatible with event audit history.

### FR7 - Organizer visibility

Organizers or authorized operators should be able to understand whether event-day data is fully reconciled.

### FR8 - Safe retry behavior

Retry actions must not create duplicate event outcomes if the server already accepted the original item.

### FR9 - Operator usability

The recovery tooling must be understandable under real event pressure.

### FR10 - No silent failure

No recoverable or unresolved queue item should disappear without a visible final state.

### FR11 - Program closeout compatibility

This sprint must define when event reliability is considered complete enough for World Class Cards v01.

### FR12 - Documentation closeout

This sprint must close the event reliability story inside the broader world-class roadmap.

## Backend Scope

The backend scope for this sprint is reconciliation state support and safe retry behavior.

### Backend work

- expose failed and conflicted queue item states
- support retry actions safely
- preserve final resolution states

### Backend test scope

- retry idempotency tests
- conflict visibility tests
- final-state resolution tests

## Frontend Scope

The frontend scope for this sprint is operator recovery and sync health visibility.

### Frontend work

- recovery list or panel
- retry actions
- sync health status UI
- conflict and failure explanations

### Frontend test scope

- recovery state rendering
- retry flow
- conflict visibility
- synced vs failed vs conflicted status clarity

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- failure visibility
- retry safety
- conflict clarity
- operator understanding
- final attendance trust after reconciliation

### Audit checklist

- are failed items clearly visible?
- are conflicted items distinguishable?
- can retry create duplicate outcomes?
- does the operator understand whether the event is fully reconciled?
- does final state remain compatible with event audit truth?

## Fix Scope

Any issues found during audit that affect recovery visibility, retry safety, conflict handling, or final trust must be fixed inside this sprint.

Must-fix categories:

- invisible failures
- unsafe retries
- hidden or ambiguous conflicts
- misleading sync health states
- unresolved final-state ambiguity

Can-defer categories only with explicit note:

- advanced recovery dashboards
- visual polish
- lower-priority operator ergonomics

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- recovery tooling is operationally trustworthy
- retries remain safe
- final event reliability is credible enough to close the roadmap pack

Re-audit output should classify remaining issues as:

- blocking
- acceptable for v01
- intentionally deferred after v01

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- recovery tooling exists
- failed and conflicted states are visible
- retry is safe and idempotent
- organizers/operators can understand reconciliation status
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

This sprint is intended to close World Class Cards v01.

If it exits GREEN, the world-class roadmap pack is complete.

If it does not exit GREEN, World Class Cards v01 must be treated as incomplete.

### What may continue after v01

- richer event reliability analytics
- more advanced team operations
- deeper personalization optimization
- broader integration ecosystem

### What must not be claimed before v01 is GREEN

- fully trustworthy event reliability under degraded conditions
- complete world-class roadmap readiness

## Dependencies

Technical dependencies:

- offline architecture
- offline queue implementation
- Event Radar pass and check-in systems

Product dependencies:

- agreement on the minimum operator recovery surface for v01 completion

## Non-Goals

- complex device fleet tooling
- advanced reconciliation analytics
- enterprise-scale operations dashboards

## Risks

### Risk 1 - Hidden unresolved states

If failed or conflicted items are not visible enough, recovery becomes performative.

Mitigation:

- make unresolved items explicit and persistent

### Risk 2 - Unsafe retries

If retry behavior is not idempotent, reconciliation can worsen the data.

Mitigation:

- enforce safe retry semantics strictly

### Risk 3 - Operator overload

If recovery tooling is too complex, real event teams may ignore it.

Mitigation:

- keep the first recovery surface narrow and operational

## Open Questions

1. What is the smallest useful recovery UI that still qualifies as world-class reliable?

2. Should conflicted items always require explicit human review, or can some be auto-resolved safely?

3. Should event-level reconciliation status be visible only to organizers, or also to lead operators/staff?

## Recommended Implementation Notes

- Make recovery states explicit.
- Keep retry logic safe and conservative.
- Favor operator clarity over breadth.
- Treat this sprint as the final operational trust layer for the roadmap.

## Acceptance Criteria

1. Operators can see and act on failed or conflicted offline items.

2. Retry behavior is safe.

3. Organizers can understand whether event-day data is fully reconciled.

4. World Class Cards v01 can be credibly treated as complete.

## Definition Of Done

This sprint is complete when:

- recovery tooling exists
- failed/conflicted state handling exists
- retry flow exists
- audit, fix, and re-audit are completed
- documentation clearly closes the World Class Cards v01 roadmap pack

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - v01 Complete`
  - sprint passed implementation, audit, fix, and re-audit
  - World Class Cards v01 is complete as a roadmap pack and implementation target

- `GREEN - v01 Complete With Noted Deferrals`
  - World Class Cards v01 is complete and safe to proceed with
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - v01 Incomplete`
  - blocking issues remain
  - World Class Cards v01 must not be treated as complete

Recommended closeout message format:

```md
Status: GREEN - v01 Complete

Why:

- Offline execution, recovery, and reconciliation are now complete enough to trust
- Operators and organizers can understand and recover degraded event-day workflows
- The World Class Cards roadmap now closes with a credible operational reliability layer

Deferred:

- Optional richer recovery analytics
- Optional deeper device-management concepts
```
