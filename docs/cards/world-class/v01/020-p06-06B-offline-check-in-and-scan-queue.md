# World Class Cards V01 - 020 - P06 - 06B - Offline Check-In And Scan Queue

## Objective

Implement the offline scan queue and offline check-in execution model so event-day operations can continue under degraded connectivity and later synchronize back to server truth.

This sprint builds on `019-p06-06A-offline-reliability-architecture.md` and adds:

- local queue implementation for scan actions
- offline check-in behavior
- reconnect sync flow
- queue visibility for operators
- idempotent sync submission foundations

At the end of this sprint, Dotly should be able to continue critical scan-driven event operations when offline, while preserving enough structure to reconcile safely later.

## Problem

After the architecture sprint, the trust model is defined but not yet operational.

Without a queue implementation:

- offline reliability remains theoretical
- operators still cannot continue event work during real network loss
- queue/reconnect behavior remains untested in actual product flow

The platform now needs a concrete local execution layer.

## Product Intent

This sprint should make offline mode operationally real.

The product promise is:

- scans can be captured locally
- offline check-in can proceed within defined trust boundaries
- queued items are visible and recoverable
- sync on reconnect behaves predictably

This sprint is not yet full recovery tooling. It is local execution plus safe sync foundation.

## Sprint Scope

In scope:

- local scan queue storage
- offline check-in execution within allowed rules
- queue item status model
- reconnect sync submission
- idempotent upload behavior foundation
- operator-facing queue awareness

Out of scope:

- advanced reconciliation UI
- manual conflict resolution dashboard
- complex multi-device merge logic

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

The sprint is not complete just because queue items can be stored locally. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind unreliable local queueing, wrong sync replay, or unclear operator state that blocks recovery tooling, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must keep `local queue state`, `sync submission state`, and `final server acceptance` separate.

That means:

- a queued item can be pending locally
- a queued item can be sent on reconnect
- the server can still accept, reject, or reconcile it independently

If these states are collapsed, operators will not understand what really happened.

## User Roles In This Sprint

Primary roles:

- Event operator
  - needs to continue scanning and understand queue state

- Organizer
  - needs confidence that offline operations are not being silently lost

- Platform
  - needs deterministic sync behavior before recovery tooling is built

## User Stories

### User stories

1. As an event operator, I want scans to be stored locally when offline instead of being lost.

2. As an event operator, I want to see whether queued scans are pending, syncing, or synced.

3. As an organizer, I want offline queue sync to preserve event integrity when connectivity returns.

### Platform stories

1. As the platform, I need idempotent sync submission so queued items do not create duplicate outcomes.

2. As the platform, I need queue item state transitions to be explicit and auditable.

## Queue Model

Recommended queue item states:

- `PENDING_LOCAL`
- `SYNCING`
- `SYNCED`
- `FAILED`
- `CONFLICTED`

Recommendation:

- keep queue item state simple and explicit
- do not hide failure behind silent retries only

## Functional Requirements

### FR1 - Local queue persistence

Offline-capable scan actions must be stored locally with enough metadata for later sync.

### FR2 - Offline check-in action

The operator must be able to perform allowed offline check-in actions and receive a truthful local result.

### FR3 - Queue visibility

The operator must be able to see queue size and basic queue state.

### FR4 - Reconnect sync behavior

When connectivity returns, queued items must be submitted using an idempotent contract.

### FR5 - Duplicate prevention

Local queue replay must not create duplicate successful check-ins where the server recognizes the item as already handled.

### FR6 - Failed sync visibility

Failed queue items must remain visible and not disappear silently.

### FR7 - Canonical audit compatibility

Queued actions must carry enough metadata to become server-side audit entries or reconciliation items.

### FR8 - Operator trust messaging

The UI must clearly distinguish local acceptance from server-synced completion.

### FR9 - Queue item metadata

Queued items should include:

- event id
- scan type
- pass or contact reference
- local timestamp
- operator/device context
- idempotency key

### FR10 - Partial sync safety

If some items sync and others fail, queue state must remain understandable.

### FR11 - Event check-in compatibility

Offline queueing must remain compatible with the existing event pass and check-in model.

### FR12 - Future reconciliation compatibility

The queue model must support later conflict and recovery tooling without redesign.

## Backend Scope

The backend scope for this sprint is sync ingest and idempotent replay behavior.

### Backend work

- ingest queued scan items
- respect idempotency keys
- return sync result states suitable for local queue transitions

### Backend test scope

- idempotent sync tests
- duplicate replay tests
- partial failure tests

## Frontend Scope

The frontend scope for this sprint is the local queue, offline state handling, and operator visibility.

### Frontend work

- local queue storage
- queue state rendering
- offline check-in flow
- reconnect sync lifecycle

### Frontend test scope

- queue state transitions
- offline action storage
- reconnect sync success/failure behavior
- operator messaging accuracy

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- queue persistence reliability
- duplicate replay protection
- failed sync handling
- local vs server truth clarity
- operator usability under degraded conditions

### Audit checklist

- can queued items be lost?
- can reconnect replay create duplicate outcomes?
- are failed items visible to the operator?
- does the UI clearly distinguish local and synced state?
- is queue metadata sufficient for later reconciliation?

## Fix Scope

Any issues found during audit that affect queue integrity, replay safety, failed-sync visibility, or operator trust must be fixed inside this sprint.

Must-fix categories:

- lost queue items
- duplicate replay
- invisible failed states
- misleading synced/local state labeling
- insufficient queue metadata for reconciliation

Can-defer categories only with explicit note:

- advanced queue filtering
- visual polish
- lower-priority retry ergonomics

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- queue is reliable enough for real degraded operation
- sync replay remains idempotent
- the next recovery sprint can build on a stable execution layer

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- offline queue exists
- queue item states are explicit
- reconnect sync works with idempotent semantics
- failed items remain visible
- local vs synced state remains understandable
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `021-p06-06C-recovery-reconciliation-and-operator-tooling.md` when:

- queue execution is operationally real
- sync replay is safe enough
- recovery and reconciliation tooling can now build on stable queue state

This sprint must not hand off as ready if:

- queue items can still disappear
- replay safety remains weak
- local vs synced state remains misleading

### What may continue in the next sprint

- reconciliation UI
- conflict review
- operator recovery tooling

### What must not be pushed carelessly to the next sprint

- unresolved queue-loss risk
- unresolved replay duplicates
- unresolved failed-state invisibility

## Dependencies

Technical dependencies:

- offline reliability architecture
- Event Radar check-in and pass systems

Product dependencies:

- agreement on visible queue states and degraded-mode messaging

## Non-Goals

- advanced conflict-resolution UX
- cross-device operator coordination UI
- offline analytics reporting

## Risks

### Risk 1 - Queue loss

If local storage or queue transitions are fragile, offline mode becomes unusable.

Mitigation:

- keep queue state explicit and test persistence carefully

### Risk 2 - Replay duplication

If sync replay is not idempotent, reconnect can corrupt attendance truth.

Mitigation:

- require idempotency keys and verify replay safety

### Risk 3 - Operator confusion

If users cannot tell what is local vs synced, trust drops quickly.

Mitigation:

- keep operator state messaging direct and visible

## Open Questions

1. How much queue detail should be visible to operators in V1?

2. Should failed items retry automatically before becoming visibly failed, or surface immediately?

3. Do we need device-specific queue identifiers beyond idempotency keys?

## Recommended Implementation Notes

- Keep queue states explicit.
- Prefer idempotent replay over clever retry behavior.
- Make offline/local status visible at all times.
- Treat this sprint as execution foundation, not reconciliation completion.

## Acceptance Criteria

1. Offline-capable scan actions can be queued locally.

2. Reconnect sync works safely.

3. Failed and synced states are visible and understandable.

4. Recovery tooling can build on this queue foundation next.

## Definition Of Done

This sprint is complete when:

- local queue exists
- reconnect sync exists
- queue states are visible
- audit, fix, and re-audit are completed
- documentation clearly explains how recovery and reconciliation tooling builds on this queue layer next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy offline queue execution

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat offline queue execution as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Offline scan actions can now queue and replay safely
- Operators can understand queue state and failures
- Recovery tooling can now build on a stable execution layer

Deferred:

- Optional richer queue diagnostics
- Optional smarter retry ergonomics
```
