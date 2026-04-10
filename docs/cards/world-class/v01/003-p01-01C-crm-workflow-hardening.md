# World Class Cards V01 - 003 - P01 - 01C - CRM Workflow Hardening

## Objective

Strengthen Dotly's CRM workflow layer so contacts, tasks, notes, deals, ownership, and source attribution operate as one dependable relationship system instead of loosely connected records.

This sprint builds on:

- `001-p01-01A-relationship-timeline-foundation.md`
- `002-p01-01B-identity-resolution-and-merge.md`

It adds:

- stricter CRM workflow rules
- stronger source-aware contact state
- improved task, note, and deal integrity around one person record
- cleaner ownership and stage transition behavior
- a more trustworthy CRM operating surface for individuals and teams

At the end of this sprint, the CRM layer should feel like a natural extension of relationship history instead of a separate database attached to Cards.

## Problem

The repo already has meaningful CRM foundations:

- contacts
- notes
- tasks
- deals and pipeline stages
- enrichment
- card interaction and lead capture

But without CRM hardening:

- contacts can still feel disconnected from the underlying relationship history
- task, note, and deal workflows may not preserve strong source context
- ownership may be unclear when contacts evolve across cards, teams, and events
- stage movement can become operationally inconsistent or easy to misuse
- later ROI, integrations, and team-owned relationship workflows will inherit weak CRM truth

The platform needs a stronger CRM contract so it can support real-world follow-up, attribution, and revenue workflows without turning into a noisy contact list.

## Product Intent

This sprint should make Dotly CRM feel operationally trustworthy.

The product promise is:

- one contact has one coherent CRM state
- tasks, notes, and deals belong to a relationship, not a disconnected record fragment
- source context remains visible as the relationship progresses
- ownership and stage changes feel intentional and traceable

This sprint is not trying to build advanced forecasting or automation yet. It is making the core CRM workflow dependable enough to support later intelligence and ROI layers.

## Sprint Scope

In scope:

- CRM contact workflow integrity
- deal and stage transition hardening
- task and note alignment to canonical contact identity
- ownership model review and strengthening
- source attribution visibility in CRM flows
- contact-level CRM summary improvements
- timeline-to-CRM integration tightening
- contact lifecycle consistency rules

Out of scope:

- advanced forecasting
- full account-based CRM
- external CRM sync expansion beyond compatibility consideration
- automated follow-up sequencing
- team transfer workflows beyond what is needed for core integrity

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

The sprint is not complete just because CRM fields exist. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind known CRM integrity gaps, ownership ambiguity, broken stage semantics, or source-attribution drift that block follow-up intelligence and ROI work, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must preserve separation among:

- relationship history
- contact identity
- CRM workflow state
- operational ownership

These are related, but not the same object.

Examples:

- a contact can have a rich timeline without yet being in an active deal stage
- a deal stage change is not the same as a new relationship event source
- a note added by the owner is not the same as a contact action performed by the other person
- ownership should be explicit, not inferred from the latest activity source

If these concepts are blended carelessly, the CRM will feel noisy and inconsistent.

## User Roles In This Sprint

Primary roles:

- Individual seller or founder
  - manages contacts, tasks, notes, and deals

- Team member using Dotly CRM
  - needs reliable ownership and clean workflow around contacts

- Platform
  - needs dependable CRM semantics for follow-up intelligence, integrations, and ROI layers

## User Stories

### User stories

1. As a user, I want one contact record to show the right tasks, notes, stages, and history after merge and cleanup.

2. As a user, I want to know where a contact came from while I work the relationship.

3. As a user, I want deal stage changes and tasks to feel deliberate and traceable.

4. As a user, I want the CRM to help me work the relationship, not force me to reconstruct it.

### Platform stories

1. As the platform, I need canonical contact identity to be the center of CRM workflow state.

2. As the platform, I need stage, task, note, and deal actions to preserve source and audit context.

3. As the platform, I need CRM state to be stable enough for later attribution, automation, and team ownership.

## CRM Workflow Model

This sprint should define a clearer CRM workflow contract around the canonical contact.

Recommended CRM-aligned concepts:

- canonical contact
- current owner
- current pipeline stage or deal stage
- active tasks
- notes and memories
- source summary
- recent relationship signals

The contact detail view should make these feel like one operating surface.

## Source-Aware CRM Model

CRM should preserve where the relationship came from.

Recommended source context visible in CRM:

- first source
- latest meaningful inbound source
- event source if from Event Radar later
- booking source if meeting-driven
- inbox source if message-driven

Recommendation for V1:

- preserve source metadata clearly on the contact and in timeline, not as a hidden internal-only field

## Stage Integrity Model

This sprint should tighten stage semantics.

Recommended rules:

- stage changes should be explicit user actions or controlled system actions
- stage changes should be auditable in the relationship timeline
- stage changes should not silently reset unrelated workflow state

Examples:

- moving to `Qualified` should not erase tasks
- moving to `Won` or `Closed` should be validated against existing CRM rules if those exist

## Functional Requirements

### FR1 - Canonical contact as CRM anchor

CRM workflow state must attach to the canonical contact identity established after merge.

### FR2 - Contact CRM summary

Contact detail should show a CRM summary that includes:

- owner
- current stage or active deal state
- active task count
- latest meaningful source context
- last meaningful activity

### FR3 - Source-aware contact state

The CRM surface must show where the contact came from in a meaningful way.

Examples:

- `Lead capture from card`
- `Message received via card inbox`
- `Booked meeting from card`
- `Event exchange from Expo Booth A`

### FR4 - Stage change timeline entry

Stage changes must generate or preserve timeline events so CRM actions remain visible in relationship history.

### FR5 - Task integrity

Tasks linked to a contact must remain correct after canonicalization and merge.

Recommendation:

- tasks should follow the canonical contact after merge
- completed and pending tasks must remain visible and attributable

### FR6 - Note integrity

Notes and memories linked to a contact must remain attached to the canonical record after merge and continue to appear in the relationship context.

### FR7 - Deal integrity

Deals or stage-linked CRM records must remain attached to the canonical contact and survive merge cleanly.

### FR8 - Ownership clarity

CRM surfaces must clearly show who owns the relationship at the current stage.

Recommendation for V1:

- preserve existing ownership model if present
- strengthen clarity and validation rather than inventing a new team-transfer model in this sprint

### FR9 - Contact-state consistency rules

The system must prevent obvious contradictory CRM states where possible.

Examples:

- closed or archived contact still showing active open workflow without reason
- invalid stage transitions if the pipeline model already constrains them

### FR10 - Relationship summary integration

Contact detail should unify timeline, tasks, notes, and CRM summary in a way that makes follow-up easier.

### FR11 - Auditability

Owner actions that materially change CRM workflow state should be attributable.

Examples:

- stage changes
- owner changes if supported
- merge-linked workflow reassignment outcomes

### FR12 - Future compatibility

CRM workflow hardening must support later:

- follow-up assistant
- team-owned relationships
- integrations
- attribution and ROI

without reworking the core contact model again.

## Backend Scope

The backend scope for this sprint is CRM integrity, workflow rules, and source-aware contact behavior.

### Service-layer scope

Recommended backend work:

- ensure CRM child records consistently reference canonical contacts
- ensure merge outcomes preserve deals, tasks, notes, and stage state
- expose contact CRM summary data in one reliable payload
- record stage changes as timeline events
- preserve source summary fields or derive them consistently from timeline/contact metadata

### API scope

Potential endpoints to harden or extend:

- `GET /contacts/:id`
- `GET /contacts/:id/timeline`
- task and note creation/update endpoints
- deal/stage mutation endpoints

Recommendation:

- prefer tightening existing endpoints over creating many new ones
- add only the minimal summary endpoint if current payload shape becomes too fragmented

### Data model scope

Possible additions or clarifications:

- source summary fields on contact if needed
- stronger audit metadata for stage transitions
- canonical-contact awareness in CRM child references

Recommendation:

- avoid duplicating timeline data into many summary fields unless required for practical performance or UX

### Backend validation scope

- stage transitions must respect defined workflow rules if any exist
- child record linkage must remain canonical after merge
- ownership changes must remain authorized
- CRM summary payload must remain consistent with underlying records

### Backend test scope

- contact summary correctness tests
- stage change timeline event tests
- task/note/deal preservation after merge tests
- source summary consistency tests
- authorization tests for CRM mutations

## Frontend Scope

The frontend scope for this sprint is the contact-centered CRM experience.

### Contact detail UX

Recommended structure:

- relationship summary header
- CRM summary strip or panel
- timeline
- tasks
- notes
- deal or pipeline state

This does not require a total redesign, but it should reduce fragmentation.

### CRM summary UX

Recommended fields:

- current owner
- current stage
- latest meaningful source
- last activity
- active task count

### Stage UX

Stage changes should feel explicit and traceable.

Recommended behavior:

- visible current stage
- clear action to update stage
- timeline confirmation after change

### Task and note UX

Tasks and notes should feel attached to the same contact context as timeline and deals.

The UI should avoid making them feel like separate mini-apps where possible.

### Frontend technical scope

- reuse current contact detail and CRM surfaces
- reduce fragmentation with summary and layout improvements rather than building a whole new CRM app shell
- keep UI ready for later follow-up assistant suggestions

### Frontend test scope

- contact summary rendering
- stage change rendering and feedback
- task/note/deal continuity after merge
- source context visibility

## Contact Summary Strategy

This sprint should decide what a user sees first when opening a contact.

Recommendation:

- show concise operational context first
- keep the full timeline just below it

Suggested top-level summary:

- who this is
- where they came from
- what stage they are in
- what needs doing next

This makes the later follow-up assistant much easier to layer on.

## Source Visibility Strategy

Recommended V1 source presentation:

- first source
- latest meaningful source
- optional source badge in timeline items

Do not overbuild attribution dashboards in this sprint. Keep source visibility focused on helping the user understand the relationship context.

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- CRM state integrity
- source visibility correctness
- task/note/deal continuity after merge
- stage transition correctness
- authorization for CRM changes
- UI coherence around one contact record

### Audit checklist

- after merge, do tasks, notes, and deals all still point to the canonical contact?
- does contact summary match underlying CRM state?
- do stage changes create visible timeline history?
- can unauthorized users change CRM state they should not control?
- does the UI still fragment the contact context across too many disconnected panels?
- is source context accurate and helpful rather than misleading?

## Fix Scope

Any issues found during audit that affect CRM truth, canonical-contact integrity, source context, or stage behavior must be fixed inside this sprint.

Must-fix categories:

- broken child-record continuity
- incorrect stage behavior
- missing stage audit/timeline reflection
- wrong source summary
- authorization gaps on CRM mutations
- fragmented contact experience that hides core CRM state

Can-defer categories only with explicit note:

- advanced visual polish
- optional dashboard shortcuts
- richer pipeline analytics beyond core workflow integrity
- non-blocking summary layout improvements

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- canonical contact remains the CRM anchor
- summary and timeline stay aligned
- CRM mutations remain authorized and traceable
- the next relationship-graph sprint can build on a dependable workflow layer

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- CRM workflow state is centered on canonical contact identity
- task, note, and deal continuity is preserved after merge
- source-aware CRM summary exists and is trustworthy
- stage changes are traceable and reflected in relationship history
- contact detail feels more unified and operationally usable
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for continuity, source summary, stage history, and authorization pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `004-p01-01D-relationship-graph-and-cross-surface-view.md` when:

- CRM workflow is anchored to clean contact identity
- source context and timeline are aligned
- the platform is ready to show how one person connects across cards, inbox, meetings, and events

This sprint must not hand off as ready if:

- CRM state still fragments across duplicate or semi-merged records
- source context is still weak or misleading
- stage, tasks, notes, and deal continuity remain unreliable

### What may continue in the next sprint

- cross-surface relationship summary
- `how we know this person` views
- relationship graph and source graph UI

### What must not be pushed carelessly to the next sprint

- unresolved canonical-contact workflow issues
- unresolved CRM source ambiguity
- unresolved stage integrity problems

## Dependencies

Technical dependencies:

- Sprint 001 timeline foundation
- Sprint 002 identity resolution and merge
- existing contacts, tasks, notes, deals, and enrichment surfaces

Product dependencies:

- agreement on current CRM stage semantics
- agreement on what source summary should be visible at contact level

## Non-Goals

- advanced pipeline forecasting
- account-based CRM
- sales automation
- external CRM bidirectional sync

## Risks

### Risk 1 - CRM state drift

If source summary, stage, and timeline do not agree, users will stop trusting the CRM layer.

Mitigation:

- keep source-aware summary tied to canonical contact and timeline truth

### Risk 2 - Child-record fragmentation

If tasks, notes, and deals do not stay anchored to the same contact, follow-up quality will suffer.

Mitigation:

- treat continuity across merge and workflow actions as a core requirement

### Risk 3 - Weak ownership semantics

If contact ownership remains ambiguous, later team features will become harder to build safely.

Mitigation:

- make ownership explicit and visible even if transfer workflows remain basic in this sprint

### Risk 4 - Too much CRM surface redesign

If the sprint tries to redesign the whole CRM UI, it may delay the more important workflow integrity work.

Mitigation:

- focus on summary, continuity, and traceability first

## Open Questions

1. Should source summary live as derived display logic from timeline plus contact metadata, or be persisted on contact for faster reads?

2. How strict should stage transition validation be in V1 if the current pipeline model is intentionally lightweight?

3. Should contact ownership changes also appear in the relationship timeline in this sprint, or wait until team-owned relationship work?

4. Do we need a dedicated CRM summary endpoint, or can current contact payloads be extended cleanly enough?

## Recommended Implementation Notes

- Use canonical contact identity as the center of all CRM state.
- Keep source visibility useful and restrained.
- Record meaningful CRM workflow changes in the timeline.
- Strengthen continuity before adding automation.
- Treat this sprint as the CRM integrity layer for everything that follows.

## Acceptance Criteria

1. CRM workflow state is reliably anchored to canonical contact identity.

2. Tasks, notes, deals, and stages remain coherent after merge and normal workflow actions.

3. Users can understand where a contact came from while working them in CRM.

4. CRM workflow is strong enough for the next sprint to show a relationship graph across multiple surfaces.

## Definition Of Done

This sprint is complete when:

- contact CRM summary exists
- source-aware CRM state exists
- task/note/deal continuity is preserved
- stage changes are traceable in relationship history
- audit, fix, and re-audit are completed
- documentation clearly explains how cross-surface relationship views will build on this CRM integrity next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy CRM workflow state

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat CRM workflow state as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- CRM state is centered on canonical contact identity
- Source context, timeline, and workflow state now align
- Cross-surface relationship views can now build on a dependable CRM core

Deferred:

- Optional advanced pipeline analytics
- Optional richer ownership-transfer workflows
```
