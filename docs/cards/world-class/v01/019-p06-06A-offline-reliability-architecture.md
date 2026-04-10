# World Class Cards V01 - 019 - P06 - 06A - Offline Reliability Architecture

## Objective

Define the offline reliability architecture for event-day and field use cases so Dotly can continue to operate safely when connectivity is weak or unavailable.

This sprint builds on the Event Radar pass, check-in, and scan foundations and introduces:

- offline-capable event operation model
- local queue and sync contract foundation
- offline-safe credential validation strategy
- conflict and reconciliation architecture
- operator trust model for degraded conditions

At the end of this sprint, Dotly should have a clear architectural foundation for offline-safe event and scan workflows without yet claiming full offline execution maturity.

## Problem

Dotly already has or plans critical event-day operations:

- event passes
- entry validation
- check-ins
- event QR and exchange flows

But real-world events often have:

- unstable venue Wi-Fi
- weak mobile data
- scan peaks at entry points
- multiple operators working simultaneously

Without an offline reliability architecture:

- event-day trust collapses when the network degrades
- operators may double-check in attendees or reject valid ones
- scans may be lost or applied out of order
- later reconciliation becomes impossible to reason about
- building offline functionality in later sprints becomes reactive and fragile

The platform needs a first-principles offline reliability architecture before implementing queueing and recovery mechanics.

## Product Intent

This sprint should make Dotly feel operationally serious.

The product promise is:

- event-day workflows are designed for unreliable networks
- offline behavior is deliberate, not accidental
- operators can trust the system more under degraded conditions
- later scan queue and recovery tooling will build on a stable architecture instead of ad hoc patches

This sprint is not trying to ship full offline event execution yet. It is defining the contract that makes that possible.

## Sprint Scope

In scope:

- offline reliability architecture for event scanning and check-in
- local queue and sync semantics
- offline-safe pass validation strategy
- duplicate and replay risk model
- conflict and reconciliation design
- operator trust and state visibility model
- architecture-level requirements for later implementation

Out of scope:

- complete offline queue implementation
- final operator recovery UI
- full sync conflict resolution tooling
- offline analytics dashboards

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

The sprint is not complete just because an offline idea exists. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind unclear offline trust boundaries, queue semantics, or conflict rules that block queue implementation safely, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must keep `local acceptance`, `server truth`, and `reconciliation` separate.

That means:

- local device may temporarily accept a scan action under offline rules
- server remains long-term source of truth once synchronized
- reconciliation resolves conflicts and duplicates explicitly

Examples:

- local entry acceptance is not the same as final globally synchronized attendance truth
- a locally queued scan should not automatically be treated as globally authoritative until synced
- devices should not silently overwrite server truth when they reconnect

If these layers are collapsed, offline event operations become impossible to trust.

## User Roles In This Sprint

Primary roles:

- Event operator or check-in staff
  - needs dependable scan behavior under weak connectivity

- Organizer
  - needs confidence that attendance data can recover after degraded operations

- Platform
  - needs a reliable offline contract before implementing queue and recovery features

## User Stories

### User stories

1. As an event operator, I want the scanner to keep working when network connectivity drops.

2. As an organizer, I want offline scans to reconcile safely later without losing trust in attendance data.

3. As a user, I want the product to tell me when I am operating in degraded mode.

### Platform stories

1. As the platform, I need explicit local queue and reconciliation semantics before implementing offline support.

2. As the platform, I need to control duplicate and replay behavior across devices.

3. As the platform, I need a deterministic sync model for later recovery tooling.

## Offline Operation Model

This sprint should define the first version of offline operation semantics.

Recommended principles:

- device-local queue for scan attempts
- explicit offline mode indicator
- local acceptance rules bounded by cached pass or event state
- queued sync with server on reconnect
- explicit conflict states rather than silent overwrite

## Validation Model Under Offline Conditions

Recommended V1 approach:

- allow offline validation only when enough cached event/pass state exists
- otherwise require online fallback or operator-visible degraded limitations

Important rule:

- offline acceptance should be more conservative than online acceptance

Examples:

- revoked passes may not be discoverable offline unless recent cache exists
- event configuration changes made centrally may not be reflected instantly on offline devices

## Functional Requirements

### FR1 - Offline mode definition

The product must define when the scanner or event workflow is considered offline or degraded.

### FR2 - Local queue contract

The product must define what data is queued locally for later sync.

### FR3 - Local scan event model

Queued scan items must preserve enough information for later server reconciliation.

### FR4 - Offline validation boundaries

The product must define what can and cannot be validated offline.

### FR5 - Conflict model

The product must define likely conflict cases.

Examples:

- duplicate check-in across devices
- stale pass state
- wrong-event scan accepted locally by stale context

### FR6 - Replay and dedupe strategy

The architecture must define how repeated queued events are identified and deduplicated.

### FR7 - Operator state visibility

The system must define how operators know they are in degraded or offline mode.

### FR8 - Reconnect sync contract

The architecture must define what happens when connectivity returns.

### FR9 - Event audit compatibility

Offline-originated actions must remain compatible with final event audit history.

### FR10 - Security and trust boundary

The product must define what trust assumptions hold while offline and which guarantees are deferred until sync.

### FR11 - Future queue implementation compatibility

The architecture must be implementable in the next sprint without redesign.

### FR12 - Future recovery-tool compatibility

The architecture must support later operator recovery and reconciliation tooling.

## Backend Scope

The backend scope for this sprint is mostly contract definition and minimal server support planning.

Potential backend work:

- define sync ingest contract
- define event idempotency keys
- define server-side replay and dedupe expectations

### Backend test scope

- architecture-level contract tests where possible
- idempotency and replay behavior tests if partial ingest shape is added now

## Frontend Scope

The frontend scope for this sprint is mainly client/offline architecture planning and any minimal indicators or abstractions required for next-sprint implementation.

Potential frontend work:

- local queue abstraction planning
- offline/degraded mode state modeling
- visible operator-mode semantics

### Frontend test scope

- state-model tests for degraded mode where applicable
- queue payload shape tests if client abstractions are introduced

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- offline trust boundaries
- dedupe and replay risk
- stale data risk
- conflict model completeness
- architecture clarity for the next sprint

### Audit checklist

- is it clear what offline devices are allowed to trust?
- are duplicate and replay scenarios covered?
- are stale pass and stale event-config risks acknowledged?
- can the next sprint implement queueing from this design without redefining core semantics?

## Fix Scope

Any issues found during audit that affect offline trust clarity, conflict design, or queue/reconciliation semantics must be fixed inside this sprint.

Must-fix categories:

- unclear server vs local truth boundaries
- missing conflict cases
- missing replay/dedupe semantics
- unclear degraded operator state behavior

Can-defer categories only with explicit note:

- implementation details better suited to next sprint
- low-impact architecture wording refinement

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- offline architecture is implementable
- trust boundaries are clear
- the queue sprint can proceed safely

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- offline operation semantics are defined
- queue and reconciliation contract is defined
- trust boundaries between local and server state are clear
- replay/dedupe expectations are defined
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `020-p06-06B-offline-check-in-and-scan-queue.md` when:

- the offline trust model is clear
- local queue semantics are stable enough to implement
- conflict handling is well-defined enough to avoid accidental design drift

This sprint must not hand off as ready if:

- offline truth boundaries are still fuzzy
- replay or duplicate behavior is not understood
- degraded-mode assumptions remain unclear

### What may continue in the next sprint

- local queue implementation
- offline check-in handling
- sync replay on reconnect

### What must not be pushed carelessly to the next sprint

- unresolved stale-data ambiguity
- unresolved replay/dedupe ambiguity
- unresolved operator trust ambiguity

## Dependencies

Technical dependencies:

- Event Radar pass and scan foundations
- world-class trust and personalization completion

Product dependencies:

- agreement on conservative offline validation posture

## Non-Goals

- full offline implementation
- recovery tooling UI
- advanced multi-device sync logic

## Risks

### Risk 1 - Offline overconfidence

If the architecture promises too much offline certainty, operators will trust results that are not actually stable.

Mitigation:

- define explicit local vs server truth boundaries

### Risk 2 - Architecture too vague

If the offline model is underspecified, the next sprint will improvise critical trust semantics.

Mitigation:

- define queue, sync, and conflict semantics clearly now

### Risk 3 - Security blind spots

If cached validation assumptions are too permissive, offline mode may accept states that should not pass.

Mitigation:

- keep offline validation conservative

## Open Questions

1. Which event-day actions are allowed offline in V1 versus explicitly online-only?

2. How long should cached pass/event state be considered trustworthy offline?

3. Do we need per-device operator trust or device registration concepts later?

## Recommended Implementation Notes

- Be conservative.
- Prefer explicit degraded behavior over hidden best-effort magic.
- Treat this sprint as the contract sprint for offline trust.

## Acceptance Criteria

1. Dotly has a defined offline reliability architecture for event-day operations.

2. Local queue and reconciliation semantics are clear.

3. Trust boundaries between offline and server truth are explicit.

4. The next sprint can implement offline queueing safely.

## Definition Of Done

This sprint is complete when:

- offline architecture is defined
- queue/sync contract is defined
- audit, fix, and re-audit are completed
- documentation clearly explains how queue implementation builds on this architecture next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of a stable offline reliability architecture

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat offline architecture as stable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Offline event operation semantics are now explicit and conservative
- Queue and reconciliation design is clear enough to implement safely
- The next sprint can build offline execution on a stable trust contract

Deferred:

- Optional deeper device trust concepts
- Optional more advanced stale-state policies
```
