# World Class Cards V01 - 001 - P01 - 01A - Relationship Timeline Foundation

## Objective

Establish a unified relationship timeline so Dotly can represent a person or contact as a continuous history rather than a disconnected set of card views, leads, messages, bookings, event exchanges, notes, and tasks.

This sprint creates the foundation for the broader Relationship OS program by defining and implementing:

- a normalized timeline event model
- source attribution for timeline events
- a unified contact timeline query surface
- cross-feature event ingestion into the same relationship history
- a trustworthy timeline view in contact-centric product surfaces

At the end of this sprint, a user should be able to open one person or contact and understand the meaningful history of interaction with that person in one place.

## Problem

The repo already has multiple interaction systems:

- card views and analytics
- lead capture
- CRM contacts and deals
- inbox messages, voice notes, and file drop
- notes and tasks
- scheduling and bookings
- AI enrichment
- Event Radar exchanges and check-ins in planning

But these systems do not yet behave like one relationship engine.

Without a unified timeline:

- users must mentally reconstruct history across different screens
- the same person can feel fragmented across cards, contact records, and events
- follow-up quality suffers because recent context is hidden
- CRM becomes record storage instead of relationship memory
- AI and prioritization features later will have weak context

The platform needs a normalized timeline layer that turns multi-surface activity into one human-readable relationship history.

## Product Intent

This sprint should make Dotly feel like it remembers the relationship, not just the record.

The product promise is:

- one contact has one meaningful history
- that history includes activity from multiple product surfaces
- every event is attributable to a source and timestamp
- later features like AI follow-up, merge logic, ROI, and event workflows can rely on this timeline as shared truth

This sprint is not trying to solve identity resolution fully yet. It is building the history layer that identity resolution and CRM improvements can build on.

## Sprint Scope

In scope:

- normalized relationship timeline event model
- source and event-type taxonomy
- timeline ingestion from existing high-value surfaces
- unified contact timeline API
- timeline rendering in core contact detail experience
- timeline ordering and deduplication rules
- event metadata model for future expansion

Out of scope:

- full duplicate merge logic
- AI-driven summarization
- advanced timeline search or saved views
- team-level rollups
- revenue attribution calculations
- event reliability and offline concerns

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

The sprint is not complete just because a timeline UI exists. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind known timeline gaps, event-ordering issues, duplicate-noise problems, or source-attribution ambiguity that block dependable follow-up or identity work, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must preserve the distinction between:

- the person or contact record
- the event that happened
- the source that produced the event
- the display interpretation of that event

These should be connected, but not collapsed into one vague activity string.

Examples:

- `card_viewed` is not the same as `lead_submitted`
- `booking_confirmed` is not the same as `message_received`
- `event_exchange_completed` is not the same as `crm_note_added`
- one activity row may summarize an event, but the underlying model must retain event type and source explicitly

If timeline data is too generic, later merge, AI, and attribution features will be weak or misleading.

## User Roles In This Sprint

Primary roles:

- Individual card owner or seller
  - wants one relationship history for a contact

- Team member using CRM or contacts
  - wants to see contact context before following up

- Product platform
  - needs a consistent history model for future features

## User Stories

### User stories

1. As a user, I want to open a contact and see the important history with that person in one timeline.

2. As a user, I want to know whether a person viewed my card, submitted a lead, sent a message, booked a meeting, or interacted at an event.

3. As a user, I want recent and important context before I decide how to follow up.

4. As a user, I want timeline items to be understandable and ordered correctly.

### Platform stories

1. As the platform, I need a normalized event taxonomy so multiple systems can write to the same timeline.

2. As the platform, I need source attribution on timeline events so later ROI and merge logic can trust the data.

3. As the platform, I need timeline history to survive later merge operations without losing important context.

## Timeline Model

This sprint should define a normalized relationship timeline model.

Recommended fields for a timeline event:

- `id`
- `contactId` or linked relationship target id
- `eventType`
- `sourceType`
- `sourceId`
- `occurredAt`
- `summary`
- `metadata`
- `actorUserId` if applicable
- `createdAt`

Recommendation:

- use a dedicated timeline model or a normalized activity model if one already exists
- preserve typed metadata instead of compressing everything into one display string

## Timeline Event Taxonomy

Recommended initial event types:

- `CARD_VIEWED`
- `LINK_CLICKED`
- `LEAD_SUBMITTED`
- `CONTACT_SAVED`
- `MESSAGE_RECEIVED`
- `VOICE_NOTE_RECEIVED`
- `FILE_RECEIVED`
- `BOOKING_CREATED`
- `BOOKING_CANCELLED`
- `BOOKING_RESCHEDULED`
- `NOTE_ADDED`
- `TASK_CREATED`
- `TASK_COMPLETED`
- `DEAL_STAGE_CHANGED`
- `ENRICHMENT_COMPLETED`
- `EVENT_EXCHANGE_COMPLETED`

Recommendation for this sprint:

- implement the highest-value current repo sources first
- leave the taxonomy extensible for later event and team features

## Source Model

Recommended source types:

- `CARD`
- `CONTACT`
- `CRM`
- `INBOX`
- `SCHEDULING`
- `ANALYTICS`
- `EVENT_RADAR`
- `AI`

This source model should exist explicitly so later reporting and debugging can answer where each timeline item came from.

## Functional Requirements

### FR1 - Timeline event persistence

The system must support persisting normalized timeline events tied to a relationship target.

### FR2 - Contact timeline API

The system must provide a contact-centric timeline query surface.

Recommended endpoint shape:

- `GET /contacts/:id/timeline`

The response should include:

- event type
- timestamp
- human-readable summary
- source type
- source id if useful
- metadata needed for detail rendering

### FR3 - Initial ingestion sources

This sprint should ingest timeline events from the most valuable existing surfaces.

Recommended initial sources:

- lead capture
- messages
- voice notes
- dropbox files
- bookings
- notes
- tasks
- deal stage changes
- enrichment results

Card views may be included carefully if the signal is strong enough and not too noisy.

### FR4 - Event ordering

Timeline events must sort consistently by `occurredAt` with sensible tie-breaking.

### FR5 - Duplicate-noise handling

The timeline must avoid obvious noise or duplicate spam.

Recommendation:

- repeated low-value events should not flood the timeline in a way that hides meaningful actions
- use a clear dedupe/aggregation policy where necessary, especially for analytics-originated events

### FR6 - Human-readable summaries

Each timeline event should have a human-readable summary suitable for UI rendering.

Recommendation:

- keep summary generation deterministic in V1
- do not rely on AI summarization yet

### FR7 - Metadata preservation

Timeline events must retain enough metadata for future detail views, merge logic, and attribution.

### FR8 - Contact detail integration

The primary contact detail experience should display a timeline section that feels native, not bolted on.

### FR9 - Future compatibility with merge

The model must support future contact merge without losing timeline history.

### FR10 - Future compatibility with Event Radar

The timeline model must be compatible with Event Radar exchanges, passes, and check-ins when those begin writing into relationship history.

### FR11 - Access control

Only authorized users should be able to read a contact's timeline according to existing CRM/contact ownership rules.

### FR12 - Timeline truthfulness

The UI must not overstate certainty.

Examples:

- a card view is an observed interaction, not a guaranteed relationship intent
- a booking is a stronger signal than a view
- a message received is different from a note added by the owner

## Backend Scope

The backend scope for this sprint is the normalized timeline layer and initial ingestion.

### Database

Recommended new model: `RelationshipTimelineEvent`

Suggested fields:

- `id: String`
- `contactId: String`
- `eventType: RelationshipTimelineEventType`
- `sourceType: RelationshipTimelineSourceType`
- `sourceId: String?`
- `occurredAt: DateTime`
- `summary: String`
- `metadata: Json?`
- `actorUserId: String?`
- `createdAt: DateTime`

Recommended enums:

- `RelationshipTimelineEventType`
- `RelationshipTimelineSourceType`

### Index recommendations

- index on `contactId`
- index on `occurredAt`
- composite index on `contactId, occurredAt`
- optional source indexes if query patterns need them later

### API and service scope

Recommended endpoint:

- `GET /contacts/:id/timeline`

Possible internal service responsibilities:

- create timeline events from source systems
- normalize summaries and metadata
- fetch timeline in descending chronological order
- enforce contact access checks

### Ingestion scope

Recommendation:

- do not fully backfill everything in the same sprint unless existing data models make it trivial
- focus first on forward-writing timeline events from the most important systems
- backfill strategy can be added later if needed

### Backend test scope

- timeline event creation tests
- timeline fetch ordering tests
- source attribution tests
- no-noise or dedupe rule tests where applicable
- authorization tests for contact timeline access

## Frontend Scope

The frontend scope for this sprint is the first native relationship timeline experience.

### Contact detail UX

Recommended sections:

- overview
- timeline
- notes/tasks/deals as adjacent or integrated surfaces depending on current UI

Timeline item design should show:

- event label
- relative or exact timestamp
- short summary
- optional source badge

### Timeline UX requirements

- newest first
- easy to scan
- visually distinguish higher-value actions from passive interactions
- no fake grouping if not implemented

### Empty state UX

Examples:

- `No relationship activity yet.`
- `Once this contact interacts with your card, messages, bookings, or CRM workflow, it will appear here.`

### Frontend technical scope

- reuse existing contact detail surface if possible
- avoid building a giant new app shell for one timeline section
- keep rendering flexible enough for later event, AI, and ROI additions

### Frontend test scope

- timeline render with mixed event types
- empty state render
- ordering correctness
- source badge and summary rendering

## Initial Source Prioritization

Recommended order for source ingestion inside this sprint:

1. lead capture
2. inbox messages
3. voice notes and files
4. bookings
5. notes and tasks
6. deal stage changes
7. enrichment results

Analytics events like card views should be added carefully because they can create noise if treated like relationship milestones without filtering.

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- timeline event correctness
- source attribution correctness
- event ordering
- duplicate-noise risk
- contact access control
- UI truthfulness of summaries

### Audit checklist

- do timeline items represent meaningful events rather than raw noisy telemetry?
- are events ordered correctly when timestamps are close?
- are source type and source id preserved correctly?
- can unauthorized users view another contact's timeline?
- do repeated low-value interactions flood the timeline?
- do summaries overstate certainty or intent?

## Fix Scope

Any issues found during audit that affect timeline correctness, source attribution, access control, or event-noise quality must be fixed inside this sprint.

Must-fix categories:

- wrong contact linkage
- wrong or missing source attribution
- broken chronology
- duplicate/noisy event flooding
- unauthorized timeline access
- misleading summaries

Can-defer categories only with explicit note:

- visual polish
- advanced filtering
- timeline grouping niceties
- backfill breadth beyond the initial required sources

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- timeline still renders correctly
- event ordering remains correct
- access control remains correct
- noise handling remains acceptable
- the next identity-resolution sprint can build on reliable timeline data

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- normalized timeline events exist
- contact timeline API exists
- key relationship sources write into the timeline
- contact detail UI shows a trustworthy timeline
- source attribution and ordering are correct
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for timeline creation, fetch, ordering, and authorization pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `002-p01-01B-identity-resolution-and-merge.md` when:

- one contact has a reliable timeline foundation
- source attribution is stable
- merge work can safely preserve and combine timeline history next

This sprint must not hand off as ready if:

- timeline records are too noisy or ambiguous
- source attribution is incomplete
- contact linkage is untrustworthy
- unauthorized access to contact history still exists

### What may continue in the next sprint

- duplicate detection
- merge preview and merge execution
- identity resolution across sources
- timeline preservation across merges

### What must not be pushed carelessly to the next sprint

- unresolved timeline noise problems
- unresolved contact-linking mistakes
- unresolved chronology issues

## Dependencies

Technical dependencies:

- existing contacts and CRM models
- inbox, scheduling, tasks, notes, and enrichment surfaces
- event metadata patterns where applicable

Product dependencies:

- agreement on initial timeline event taxonomy
- agreement on which low-signal analytics events are excluded from V1 timeline

## Non-Goals

- full merge system
- AI summarization
- team rollups
- revenue attribution
- offline event history sync

## Risks

### Risk 1 - Noisy timeline

If low-value telemetry floods the timeline, users will ignore it.

Mitigation:

- prioritize meaningful relationship events first

### Risk 2 - Weak source attribution

If events do not preserve their source, later merge, ROI, and debugging workflows will be unreliable.

Mitigation:

- persist source type and source id explicitly

### Risk 3 - Wrong contact linkage

If timeline events attach to the wrong contact, the whole relationship model becomes untrustworthy.

Mitigation:

- keep linking rules explicit and conservative in V1

### Risk 4 - UI overstatement

If passive events are rendered like strong intent signals, follow-up quality may decline.

Mitigation:

- use event-type-aware summaries and restrained wording

## Open Questions

1. Should card views be included in the first visible relationship timeline, or stay in analytics until dedupe/noise handling is stronger?

2. Should timeline events be stored eagerly from source systems, or partly assembled from existing records at read time in V1?

3. How much metadata should be exposed to the UI immediately versus stored only for later detail views?

4. Should owner-authored notes and tasks live in the same timeline stream or remain adjacent with selective inclusion?

## Recommended Implementation Notes

- Start with the highest-signal sources.
- Preserve typed event structure.
- Keep timeline summaries deterministic and restrained.
- Build the relationship history layer before advanced intelligence features.
- Treat this sprint as the backbone of the broader Relationship OS.

## Acceptance Criteria

1. A contact can display a unified relationship timeline.

2. Timeline events come from multiple meaningful product surfaces.

3. Timeline ordering and source attribution are trustworthy.

4. The timeline foundation is strong enough for identity-resolution and merge work next.

## Definition Of Done

This sprint is complete when:

- timeline model exists
- contact timeline API exists
- initial high-value source ingestion exists
- timeline UI exists in the contact experience
- audit, fix, and re-audit are completed
- documentation clearly explains how identity resolution and merge work build on this timeline foundation next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy relationship timeline data

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat the timeline as reliable for merge or identity work

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Relationship history is unified across key product surfaces
- Timeline ordering and source attribution are trustworthy
- Identity resolution can now build on a stable relationship-history layer

Deferred:

- Optional low-signal analytics inclusion after stronger dedupe rules
- Optional advanced filtering and grouping
```
