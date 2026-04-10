# World Class Cards V01 - 008 - P03 - 03A - Unified Inbox Foundation

## Objective

Create a unified inbox foundation so all inbound interactions across Cards can be viewed and worked from one operational surface instead of being split across separate message, voice, file, lead, and relationship workflows.

This sprint builds on the existing inbox, CRM, relationship, and follow-up foundations by adding:

- a normalized inbound item model
- one inbox summary surface across inbound channels
- source normalization for messages, voice notes, files, and lead/contact submissions
- inbox-aware relationship and workflow context
- a stable foundation for later inbox routing and conversion work

At the end of this sprint, Dotly should be able to answer a simple but important question: `What came in, across all my cards, and what needs my attention?`

## Problem

The repo already has multiple inbound surfaces:

- text messages sent to a card
- voice notes
- file dropbox uploads
- lead capture submissions
- contact-style inbound actions

But these flows do not yet feel like one inbound operating system.

Without a unified inbox foundation:

- inbound signals are fragmented across different feature surfaces
- users must check multiple places to understand who reached out and how
- follow-up workflows remain slower and more manual than they should be
- inbox routing, contact linking, and conversion logic in later sprints become harder to build cleanly
- Dotly misses a major world-class opportunity: turning inbound interest into one coherent operational queue

The platform needs one normalized inbox layer that treats all inbound contact attempts and artifacts as part of a single relationship-entry surface.

## Product Intent

This sprint should make Dotly feel like a serious inbound relationship product.

The product promise is:

- all meaningful inbound interactions are visible in one place
- inbound items preserve their original type and source context
- inbox can become the default operational surface for new relationship activity
- later routing, meeting conversion, and team assignment can build on a stable inbox foundation

This sprint is not trying to finish inbox automation or conversion yet. It is creating the normalized inbound layer first.

## Sprint Scope

In scope:

- normalized inbox item model
- inbox aggregation across current inbound surfaces
- unread and recent summary behavior
- inbox filters by item type and source
- inbox relationship context linkage foundation
- inbox list and inbox detail presentation
- owner-facing inbox summary across cards

Out of scope:

- full inbox-to-contact routing logic
- automatic contact creation from every inbound item
- meeting conversion flows
- team SLAs or advanced queue assignment
- complex inbox automation rules

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

The sprint is not complete just because an inbox page exists. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind source fragmentation, wrong ownership, weak unread behavior, or inbox ambiguity that blocks routing and contact-linking work, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must keep `inbound item type` and `operational inbox view` separate.

That means:

- a message remains a message
- a voice note remains a voice note
- a file remains a file
- a lead submission remains a lead submission

But the inbox view provides one operational frame over those item types.

If the model flattens all inbound items into one vague blob, the system will lose important context. If the UI keeps them completely isolated, the inbox will fail its purpose.

## User Roles In This Sprint

Primary roles:

- Individual card owner
  - wants one place to review inbound activity across cards

- Team member managing relationships
  - wants one operational queue for new inbound activity

- Platform
  - needs a normalized inbound model before routing and conversion logic can be layered on

## User Stories

### User stories

1. As a user, I want to see all inbound interactions across my cards in one inbox.

2. As a user, I want to know whether an inbound item is a message, voice note, file, or lead submission.

3. As a user, I want to quickly understand what is new and what needs review.

4. As a user, I want inbox items to preserve enough context for later follow-up and contact linking.

### Platform stories

1. As the platform, I need a normalized inbox model that can represent current and future inbound channels consistently.

2. As the platform, I need inbox summaries and unread counts that remain truthful across item types.

3. As the platform, I need one operational inbound layer before routing and meeting conversion work begins.

## Inbox Model

This sprint should define a normalized inbound item model.

Recommended common fields:

- `id`
- `cardId`
- `ownerUserId`
- `type`
- `sourceHandle` or source card context
- `senderName`
- `senderEmail` or sender identity hint if present
- `receivedAt`
- `read`
- `summary`
- `metadata`

Recommended inbox item types:

- `MESSAGE`
- `VOICE_NOTE`
- `FILE`
- `LEAD_SUBMISSION`

Potential later additions:

- `EVENT_EXCHANGE`
- `MEETING_REQUEST`

Recommendation for V1:

- normalize current existing inbound surfaces first
- keep the type system extensible for later event and meeting-driven inbound items

## Inbox Summary Model

The inbox should support:

- total unread count
- recent inbound items
- filtering by type
- filtering by card if helpful

Recommendation:

- start with one inbox summary page and one inbox list
- avoid building a heavy email-style client with too many controls in V1

## Functional Requirements

### FR1 - Unified inbox aggregation

The system must aggregate current inbound surfaces into one inbox view.

Minimum included sources:

- messages
- voice notes
- dropbox files
- lead capture or contact submissions that are operationally inbound

### FR2 - Normalized inbox item payload

The inbox API must return a normalized item shape with item-type-specific metadata preserved.

### FR3 - Unread behavior

The system must support unread state across inbox item types.

### FR4 - Read state updates

Users must be able to mark inbox items as read through the unified inbox surface or type-specific detail surface.

### FR5 - Inbox filtering

The inbox must support at least:

- all items
- unread
- by type

Card-level filtering is optional if current inbox volume is manageable.

### FR6 - Inbox detail context

Each inbox item must preserve enough type-specific context for the user to act on it meaningfully.

Examples:

- message preview or full text
- voice note playback context
- file metadata
- lead submission summary

### FR7 - Relationship context bridge

Inbox items should expose enough identity hints or contact context so the next sprint can link them to the correct contact record or create one if needed.

### FR8 - Owner-scoped aggregation

The inbox should aggregate inbound items across cards owned by the user, respecting current ownership and access patterns.

### FR9 - Team-readiness compatibility

The model should leave room for later shared inbox or team routing without redesigning the item shape.

### FR10 - Contact and workflow compatibility

The inbox model must support future linking to:

- contacts
- tasks
- reminders
- meetings
- CRM actions

### FR11 - Truthful inbox labels

The inbox must not label every inbound item as a `lead` if it is actually a message or a file.

### FR12 - Timeline compatibility

Inbox items should remain consistent with relationship timeline events, even if the inbox itself is an operational surface and the timeline is historical.

## Backend Scope

The backend scope for this sprint is inbox aggregation and normalization.

### Service-layer scope

Recommended backend work:

- unify current inbox source queries into a normalized aggregation layer
- preserve item-type-specific metadata
- expose summary counts and unread counts
- support filtering and pagination if needed

### API scope

Current inbox routes already exist per type and summary.

This sprint should decide whether to:

1. extend the existing `GET /inbox` summary route into a full normalized feed
2. add a dedicated normalized inbox feed endpoint such as:
   - `GET /inbox/feed`

Recommendation:

- prefer a dedicated normalized feed if it keeps the contract clean

### Data model scope

Recommendation for V1:

- derive the unified inbox feed from existing underlying models rather than forcing an immediate new master inbox table
- only add a dedicated normalized inbox item table if query performance or cross-type unread behavior clearly requires it

### Validation scope

- inbox aggregation must not leak items from cards the user does not own or control
- unread counts must remain consistent with underlying item state
- filtering must not distort item type or timestamps

### Backend test scope

- normalized feed aggregation tests
- unread count tests
- filter tests
- owner access tests
- type-specific metadata preservation tests

## Frontend Scope

The frontend scope for this sprint is the first owner-facing unified inbox surface.

### Inbox page UX

Recommended sections:

- inbox header with unread count
- filter controls
- inbox list
- item detail panel or drill-in behavior

### Inbox list UX

Each row should show:

- item type
- sender or identity hint
- short summary
- received time
- unread state
- related card if helpful

### Item detail UX

The item view should preserve the native meaning of the content:

- message text for messages
- playback/supporting info for voice notes
- filename and metadata for files
- key form fields for lead submissions

### Frontend technical scope

- reuse current inbox surface if one already exists and expand it cleanly
- avoid overbuilding power-user queue controls in the first pass
- keep room for next-sprint routing actions

### Frontend test scope

- mixed inbox rendering
- unread state behavior
- filter behavior
- item detail rendering by type
- empty-state behavior

## Normalization Strategy

Recommended V1 normalization approach:

- preserve raw item type
- map each item into a consistent feed envelope
- include a summary string plus type-specific metadata

This gives users a single inbox without erasing source richness.

## Empty-State Strategy

Recommended empty states:

- `No inbound activity yet.`
- `Messages, files, voice notes, and lead submissions from your cards will appear here.`

Recommended filtered empty states:

- `No unread items.`
- `No voice notes yet.`
- `No lead submissions yet.`

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- aggregation correctness
- unread correctness
- type normalization quality
- access control
- UI truthfulness

### Audit checklist

- does the unified feed include all required inbound item types?
- are item types preserved correctly?
- can a user see inbox items from a card they do not own?
- do unread counts match actual unread state?
- does the UI mislabel messages or files as leads?
- is the feed stable enough for routing and contact-linking work next?

## Fix Scope

Any issues found during audit that affect aggregation truth, unread behavior, type fidelity, or access control must be fixed inside this sprint.

Must-fix categories:

- missing source types in feed
- wrong item typing
- incorrect unread counts
- access leakage across cards or users
- misleading labels or summaries

Can-defer categories only with explicit note:

- advanced queue operations
- bulk inbox actions
- non-blocking layout polish
- richer card-level filters

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- inbox remains unified and trustworthy
- unread state remains correct
- source normalization remains stable
- the next routing sprint can safely build on the inbox foundation

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- a unified inbox feed exists
- current inbound item types are represented correctly
- unread state and counts are trustworthy
- inbox surfaces preserve enough context for later routing and contact linking
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for aggregation, unread behavior, type fidelity, and authorization pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `009-p03-03B-inbox-routing-and-contact-linking.md` when:

- inbound activity is visible in one operational surface
- item types and ownership are trustworthy
- the system can now route inbox items into contact and workflow context

This sprint must not hand off as ready if:

- inbox aggregation is still fragmented
- unread behavior is unreliable
- source normalization is too weak for routing logic

### What may continue in the next sprint

- inbox-to-contact linking
- create or attach to contact flows
- workflow actions from inbox items
- contact identity resolution from inbound items

### What must not be pushed carelessly to the next sprint

- unresolved item-typing errors
- unresolved unread-state bugs
- unresolved ownership leakage

## Dependencies

Technical dependencies:

- existing inbox controllers and models
- Relationship OS and Follow-Up Intelligence groundwork
- current contact and workflow surfaces

Product dependencies:

- agreement on which inbound items count as inbox items in v01
- agreement on whether lead submissions appear directly in the unified inbox or as linked inbound entries

## Non-Goals

- contact linking automation
- meeting conversion
- team queue routing
- inbox SLA workflows

## Risks

### Risk 1 - False unification

If the unified inbox hides too much type-specific meaning, the feed becomes less useful than the original separate tools.

Mitigation:

- keep the feed normalized but preserve item type and context clearly

### Risk 2 - Unread inconsistency

If unread counts drift from actual item state, users will stop trusting the inbox.

Mitigation:

- make unread behavior deterministic and test-heavy

### Risk 3 - Ownership leakage

If items from the wrong card or owner appear in a feed, the inbox becomes a trust and privacy problem.

Mitigation:

- keep owner/card scoping strict in aggregation queries

### Risk 4 - Overbuilding the inbox UI

If the sprint becomes a fully featured messaging app, it may delay the more important routing and conversion work.

Mitigation:

- focus on normalized inbox foundation and operational usefulness first

## Open Questions

1. Should lead submissions appear as first-class inbox items in v01, or as a linked operational subtype with special treatment?

2. Should the unified feed be derived on read or backed by a dedicated materialized inbox model later?

3. Do we need per-card filters immediately, or are type and unread filters enough for the first pass?

4. Should the inbox detail open inline, in a panel, or via item-specific routes?

## Recommended Implementation Notes

- Keep normalization strong and explainable.
- Preserve type-specific meaning.
- Use the unified inbox as an operational layer, not as a replacement for timeline.
- Keep the first version lightweight but trustworthy.
- Treat this sprint as the entry point for deeper inbound conversion work.

## Acceptance Criteria

1. Dotly has one unified inbox feed across current inbound card surfaces.

2. Inbound items preserve their native meaning and type.

3. Unread state is trustworthy.

4. The inbox foundation is strong enough for routing and contact-linking work in the next sprint.

## Definition Of Done

This sprint is complete when:

- unified inbox feed exists
- normalized item model exists
- unread behavior exists
- owner-facing inbox UI exists
- audit, fix, and re-audit are completed
- documentation clearly explains how inbox routing and contact linking build on this inbox foundation next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy unified inbox data

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat the unified inbox as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Inbound activity is now visible in one trustworthy operational feed
- Item type and unread behavior remain accurate
- Routing and contact-linking work can now build on a stable inbox foundation

Deferred:

- Optional advanced inbox filters
- Optional materialized feed model if later scale requires it
```
