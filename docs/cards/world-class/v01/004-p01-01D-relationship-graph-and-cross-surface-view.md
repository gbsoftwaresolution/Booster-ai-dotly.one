# World Class Cards V01 - 004 - P01 - 01D - Relationship Graph And Cross-Surface View

## Objective

Turn the timeline, identity, and CRM groundwork from the first three sprints into a cross-surface relationship view that shows how Dotly knows a person and where that relationship lives across the product.

This sprint adds:

- relationship graph model
- cross-surface relationship summary
- `how we know this person` view
- source-to-surface mapping across cards, inbox, scheduling, CRM, and Event Radar-ready contexts
- relationship context UI that makes a contact feel connected rather than fragmented

At the end of this sprint, a user should be able to open a contact and understand not only what happened over time, but also which product surfaces and contexts contributed to the relationship.

## Problem

After the first three sprints in Relationship OS, Dotly can have:

- a unified relationship timeline
- safer identity resolution and merge
- stronger CRM workflow integrity

But a user may still not understand the full structure of the relationship.

Without a cross-surface relationship view:

- a contact still feels like a flat CRM record with a long history list
- users cannot quickly tell whether this person came from a card, event, booking, message, or several of them
- the value of Dotly's multi-surface product remains hidden
- later attribution, follow-up, personalization, and team workflows lose context that should be obvious

The platform needs a relationship-layer summary that answers:

- how did this relationship start?
- where has this person interacted with me?
- through which cards, events, messages, bookings, or CRM actions has the relationship evolved?
- what surfaces are currently active in this relationship?

## Product Intent

This sprint should make Dotly feel like a relationship graph, not just a contact database.

The product promise is:

- one person can be understood across many touchpoints
- source and surface context remain visible and meaningful
- the user can quickly understand relationship depth before deciding what to do next
- later AI, attribution, team, and ROI features can build on one shared cross-surface model

This sprint is not trying to create a complex visual network graph for its own sake. It is creating a practical, trustworthy relationship summary layer.

## Sprint Scope

In scope:

- relationship graph model or summary model
- cross-surface source mapping
- contact-level `how we know this person` view
- surface summary for cards, inbox, booking, CRM, and Event Radar-ready sources
- relationship health/context summary foundation
- timeline-to-surface grouping support where needed

Out of scope:

- algorithmic relationship scoring
- advanced AI summarization
- organization-level account graph
- team-wide relationship graph views
- revenue or ROI dashboards
- fully visual node-link graph UI if not needed for clarity

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

The sprint is not complete just because a new summary panel exists. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind source ambiguity, weak cross-surface linkage, or misleading relationship summaries that block follow-up intelligence and inbox routing work, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must preserve the distinction among:

- person identity
- timeline events
- current CRM state
- relationship surfaces

These are connected, but not interchangeable.

Examples:

- a person may have one identity but multiple surfaces: card lead, inbox message, booking, event exchange
- the relationship graph should summarize these surfaces without replacing the underlying timeline
- a relationship summary should not erase chronology or detail

If the graph layer becomes too abstract, it will look impressive but become operationally useless.

## User Roles In This Sprint

Primary roles:

- Individual user managing contacts
  - wants to quickly understand a person's relationship context

- Team member using CRM
  - wants to know how a contact entered and evolved across Dotly surfaces

- Platform
  - needs a shared relationship-context layer for follow-up, routing, personalization, and attribution

## User Stories

### User stories

1. As a user, I want to know how Dotly knows a person, not just what happened in chronological order.

2. As a user, I want to see whether a person came through card activity, inbox, booking, event, or multiple surfaces.

3. As a user, I want to quickly understand the depth of a relationship before deciding how to follow up.

4. As a user, I want cross-surface context without losing the detailed timeline underneath.

### Platform stories

1. As the platform, I need a relationship-summary layer that works across cards, inbox, scheduling, CRM, and events.

2. As the platform, I need cross-surface source mapping that remains explainable and attributable.

3. As the platform, I need a stable relationship context model before building smarter follow-up suggestions and inbox routing.

## Relationship Graph Model

This sprint should define a practical relationship graph model.

Recommendation for V1:

- do not start with a complex graph engine
- start with a structured relationship summary model built from:
  - canonical contact identity
  - known surfaces
  - first source
  - latest meaningful source
  - active relationship channels
  - recent meaningful interactions

Possible relationship surfaces:

- `CARD`
- `INBOX`
- `SCHEDULING`
- `CRM`
- `EVENT_RADAR`
- `AI_ENRICHMENT`

This can later evolve into richer graph behavior if needed.

## Cross-Surface View Model

The `how we know this person` view should answer:

- first known touchpoint
- all known relationship surfaces
- current active surfaces
- last meaningful interaction by surface
- current relationship state summary

Examples:

- `First known through card lead capture`
- `Later sent a message and booked a meeting`
- `Currently active in CRM and inbox`

## Relationship Context Summary

This sprint should create a concise contact-level context summary.

Recommended summary signals:

- first source
- latest meaningful source
- active task status
- booking history presence
- inbox activity presence
- event interaction presence when applicable

The goal is to help the user answer:

- who is this person in my business context?
- what channels are active?
- what relationship depth exists?

## Functional Requirements

### FR1 - Cross-surface relationship summary

The contact experience must include a structured summary of relationship surfaces tied to the contact.

### FR2 - `How we know this person` view

The contact experience must expose a clear explanation of how the system knows this person.

Recommended information:

- first source
- additional surfaces seen later
- important relationship milestones

### FR3 - Surface inventory per contact

The backend must be able to resolve which product surfaces are associated with a contact.

Recommended initial surfaces:

- card interaction/lead capture
- inbox messages
- bookings
- CRM tasks/notes/deals
- event relationships when available later

### FR4 - First and latest meaningful source

The system should resolve and display:

- first known source
- latest meaningful source

These should be derived in a trustworthy and explainable way.

### FR5 - Surface-specific last activity

For each relationship surface included in summary, the system should be able to show a last meaningful activity timestamp or status.

### FR6 - Timeline connection

The relationship summary must link cleanly to the underlying timeline.

The summary must not become a replacement for detailed history.

### FR7 - Contact header integration

The contact detail view should use the relationship graph/context summary near the top of the page so it improves decision-making immediately.

### FR8 - No fake graphing

The UI must not imply advanced graph certainty if only summary-level relationship context is implemented.

### FR9 - Future Event Radar compatibility

The model must leave room to include:

- event attendance
- event exchange
- booth/stall interaction
- participant identity

without redesigning the contact summary from scratch.

### FR10 - Future personalization compatibility

The model must also support later dynamic card modes and context-aware personalization by preserving relationship-surface context.

### FR11 - Access control

Only authorized users should be able to view a contact's cross-surface relationship summary.

### FR12 - Truthful summary language

The UI must avoid overstating certainty.

Examples:

- `Has interacted through inbox and booking` is better than pretending full intent classification
- `Known from event exchange` is better than implying a strong business relationship where only one touchpoint exists

## Backend Scope

The backend scope for this sprint is the relationship-summary and surface-resolution layer.

### Service-layer scope

Recommended backend work:

- resolve relationship surfaces per contact
- derive first source and latest meaningful source
- compute surface-level summary metadata
- expose a contact relationship summary payload

### API scope

Two acceptable approaches:

1. extend `GET /contacts/:id`
2. add a dedicated summary endpoint such as:
   - `GET /contacts/:id/relationship-summary`

Recommendation:

- use the cleanest shape that avoids bloating the contact payload too much

### Data model scope

This sprint may not need a large new table.

Recommendation:

- derive the summary from canonical contact, timeline, and source-linked records where possible
- only persist summary fields if performance or consistency clearly requires it

### Backend validation scope

- only valid, linked surfaces should appear in summary
- first-source and latest-source rules must be deterministic
- unauthorized users must not access another contact's relationship summary

### Backend test scope

- relationship summary derivation tests
- first-source resolution tests
- latest meaningful source tests
- surface inventory correctness tests
- authorization tests

## Frontend Scope

The frontend scope for this sprint is the contact-level cross-surface relationship view.

### Contact header or summary panel UX

Recommended elements:

- `How we know this person`
- first source badge or sentence
- surface list
- latest meaningful interaction
- shortcuts to relevant surfaces if useful

### Surface summary UX

Possible rows or chips:

- `Card lead`
- `Message received`
- `Meeting booked`
- `CRM active`
- `Event exchange`

This should be easy to scan and grounded in real data.

### Relationship depth UX

Without over-scoring, the UI can still show a sense of depth.

Examples:

- multiple active channels
- recent inbound activity
- booking completed

Recommendation:

- keep this descriptive, not numerical in V1

### Contact detail integration

The summary should sit above or alongside timeline and CRM summary so the user can quickly orient themselves.

### Frontend technical scope

- reuse current contact detail surfaces
- avoid building an abstract graph visualization unless it truly adds clarity
- prioritize clarity and speed of understanding

### Frontend test scope

- summary rendering with multiple surfaces
- first-source and latest-source presentation
- empty or sparse relationship summary state
- relationship-summary and timeline linkage

## Summary Strategy

Recommended V1 output shape:

- first known source
- latest meaningful source
- list of known surfaces
- summary sentence or structured bullets

Example:

- `First known from card lead capture`
- `Later sent a message and booked a meeting`
- `Currently active in CRM with open follow-up tasks`

This gives practical relationship context without pretending to be a full graph explorer.

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- surface resolution correctness
- source derivation correctness
- UI truthfulness
- cross-surface summary usefulness
- authorization

### Audit checklist

- does the system correctly identify which surfaces belong to the contact?
- is first source deterministic and sensible?
- is latest meaningful source derived correctly?
- does the UI overstate relationship depth?
- can unauthorized users access cross-surface relationship summary?
- does the summary remain connected to timeline truth instead of drifting into guesswork?

## Fix Scope

Any issues found during audit that affect source correctness, summary truthfulness, surface mapping, or authorization must be fixed inside this sprint.

Must-fix categories:

- wrong surface attribution
- unstable first-source logic
- misleading relationship summaries
- authorization gaps
- summary disconnected from underlying timeline truth

Can-defer categories only with explicit note:

- more advanced visual graphing
- optional descriptive relationship-depth indicators
- non-blocking layout polish
- richer shortcuts across surfaces

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- relationship summary remains trustworthy
- first-source and latest-source logic remain stable
- summary is useful enough for the next follow-up intelligence sprint
- authorization remains correct

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- contact relationship summary exists
- cross-surface source mapping is trustworthy
- `how we know this person` view is understandable and useful
- summary remains grounded in canonical identity and timeline truth
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for summary derivation, source logic, and authorization pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `005-p02-02A-follow-up-signals-foundation.md` when:

- the platform can explain relationship context across surfaces
- follow-up signals can build on trustworthy cross-surface relationship knowledge
- the user can orient quickly before receiving assistant suggestions

This sprint must not hand off as ready if:

- source context is still ambiguous
- cross-surface summaries are misleading
- relationship summary still feels disconnected from timeline and CRM truth

### What may continue in the next sprint

- follow-up signal modeling
- recency and intent signals
- suggestion and prioritization foundations

### What must not be pushed carelessly to the next sprint

- unresolved source ambiguity
- unresolved summary truth problems
- unresolved weak linkage across surfaces

## Dependencies

Technical dependencies:

- Sprint 001 timeline foundation
- Sprint 002 identity resolution and merge
- Sprint 003 CRM workflow hardening
- inbox, scheduling, CRM, and Event Radar-compatible metadata patterns

Product dependencies:

- agreement on which surfaces count as meaningful relationship channels in V1
- agreement on restrained summary language

## Non-Goals

- visual node-link graph engine
- AI relationship summaries
- company account graph
- revenue attribution
- team-level graph views

## Risks

### Risk 1 - Too abstract to be useful

If the relationship graph layer becomes too conceptual, users will ignore it.

Mitigation:

- keep the summary practical and directly useful for follow-up decisions

### Risk 2 - Source ambiguity

If first source or latest meaningful source is unstable, the summary will lose trust.

Mitigation:

- use deterministic derivation rules and audit them carefully

### Risk 3 - Fake graphing

If the UI looks like a sophisticated graph system without having reliable underlying logic, the feature will feel dishonest.

Mitigation:

- prioritize truthful structured summary over decorative graph visuals

### Risk 4 - Overlap with timeline

If the summary duplicates the timeline without adding orientation value, it becomes redundant.

Mitigation:

- focus the summary on relationship structure, not chronological detail

## Open Questions

1. Should the relationship summary be derived entirely from timeline and current state, or should a small denormalized summary model be introduced later for performance?

2. Which surfaces count as meaningful enough for V1 summary visibility?

3. Should owner-authored CRM actions appear as relationship surfaces, or only as activity within CRM?

4. Should Event Radar context appear in this summary immediately when implemented, or wait until its participant and exchange models stabilize further?

## Recommended Implementation Notes

- Prefer structured summary over complex graph visualization.
- Keep all source and surface logic deterministic.
- Stay grounded in canonical contact identity.
- Make the contact page easier to understand in under a few seconds.
- Treat this sprint as the orientation layer before follow-up intelligence begins.

## Acceptance Criteria

1. A contact can display a trustworthy cross-surface relationship summary.

2. Users can see how Dotly knows a person across multiple product surfaces.

3. The relationship summary is grounded in timeline and CRM truth.

4. The system is ready for follow-up intelligence to build on top of reliable relationship context.

## Definition Of Done

This sprint is complete when:

- relationship summary model exists
- contact-level cross-surface summary exists
- first-source and latest-source logic exist
- audit, fix, and re-audit are completed
- documentation clearly explains how follow-up signals build on this relationship-context layer next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy cross-surface relationship context

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat relationship-context summary as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Cross-surface relationship context is now visible and trustworthy
- Users can understand how Dotly knows a person before acting
- Follow-up intelligence can now build on a stable relationship-orientation layer

Deferred:

- Optional richer relationship visualization
- Optional descriptive depth indicators beyond structured summary
```
