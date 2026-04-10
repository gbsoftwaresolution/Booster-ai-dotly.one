# World Class Cards V01 - 010 - P03 - 03C - Card-To-Meeting Conversion Flow

## Objective

Turn high-intent relationship activity into booked meetings with a conversion path that starts from Cards and inbox interactions, carries relationship context forward, and preserves attribution into CRM.

This sprint builds on:

- `004-p01-01D-relationship-graph-and-cross-surface-view.md`
- `008-p03-03A-unified-inbox-foundation.md`
- `009-p03-03B-inbox-routing-and-contact-linking.md`

It adds:

- card-to-meeting conversion path
- inbox-to-meeting conversion path
- booking-intent-aware contact workflow
- meeting attribution to source card, inbox item, and relationship context
- conversion-oriented UX around booking without breaking current scheduling foundations

At the end of this sprint, Dotly should be able to move from `this person is interested` to `this person has a clean path to book time` with context and attribution intact.

## Problem

The repo already has meaningful scheduling foundations:

- appointment types
- public booking pages
- booking creation and reschedule flows
- calendar integration
- booking-related emails and reminders

But the current scheduling capability is still too separate from card and relationship workflows.

Without a card-to-meeting conversion flow:

- high-intent card visitors still face too much friction between interest and booking
- inbox interactions do not naturally convert into meetings
- users lack a clean workflow from contact context into scheduling action
- attribution gets weaker because booking can feel like a separate product instead of part of the relationship journey
- Dotly loses one of its strongest world-class moves: compressing discovery into conversation, then into a meeting

The platform needs a conversion layer that treats scheduling as a natural next step in relationship progression.

## Product Intent

This sprint should make Dotly feel conversion-aware.

The product promise is:

- users can move a relationship into a meeting naturally
- the booking flow knows enough context to feel connected to the relationship
- source attribution is preserved from card, inbox, and CRM into booking outcomes
- later ROI, team routing, and event follow-up can build on meeting conversion as a first-class outcome

This sprint is not trying to redesign the entire scheduling product. It is integrating meeting conversion into the relationship workflow.

## Sprint Scope

In scope:

- card-level booking conversion path refinement
- inbox item to booking workflow bridge
- contact-to-booking context handoff
- booking attribution model for card and inbox sources
- CRM and timeline connection to booking conversion
- booking CTA placement and workflow entry points
- post-booking workflow continuity

Out of scope:

- advanced meeting qualification forms beyond current scheduling capabilities
- round-robin routing or pooled calendars
- complex sales qualification automation
- meeting sequence automation after booking
- deep account-based routing logic

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

The sprint is not complete just because a booking button exists. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind weak booking attribution, broken context handoff, or conversion friction that blocks team and revenue ops, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must keep `booking capability` and `conversion workflow` separate.

That means:

- scheduling is the underlying availability and booking system
- conversion flow is how relationship context leads naturally into scheduling

Examples:

- a public booking page can exist without strong relationship context
- this sprint should attach context so the booking action feels like part of the relationship journey
- conversion attribution should preserve where the booking came from, not merely that a booking happened

If the product treats booking as isolated, it loses much of the strategic value of Cards and inbox.

## User Roles In This Sprint

Primary roles:

- Card owner or seller
  - wants high-intent people to book quickly

- Team member using CRM or inbox
  - wants to move qualified interest into a meeting without losing context

- Visitor or contact
  - wants a clear path from interest to meeting

- Platform
  - needs a booking conversion layer before team attribution and ROI work deepen

## User Stories

### User stories

1. As a card owner, I want interested visitors to move into booking with as little friction as possible.

2. As a user working an inbox item or contact, I want to route that person into a meeting flow directly.

3. As a user, I want booking outcomes to remain visible inside the contact relationship context.

4. As a user, I want to know whether a meeting came from a card, message, or other inbound interaction.

### Platform stories

1. As the platform, I need booking attribution tied to card, inbox, and contact context.

2. As the platform, I need meeting creation to feed timeline and CRM truth consistently.

3. As the platform, I need the meeting conversion layer to work with existing scheduling rather than bypassing it.

## Conversion Model

This sprint should define a booking conversion model that captures:

- source card
- source inbox item if applicable
- source contact if linked
- booking outcome
- timeline and CRM continuity

Recommended conversion entry surfaces:

- public card page booking CTA
- contact detail `Book meeting` action
- inbox item `Book meeting` action

Recommendation for V1:

- keep conversion entry points narrow and clean
- avoid proliferating too many competing booking CTAs across the UI

## Attribution Model

This sprint should preserve booking attribution clearly.

Recommended attribution fields:

- `sourceSurface`
  - `CARD_PAGE`
  - `INBOX`
  - `CONTACT`
  - `CRM`

- `sourceCardId`
- `sourceInboxItemId` if applicable
- `sourceContactId` if applicable
- `sourceAppointmentTypeId`

This does not need a major new data model if existing booking metadata can store it cleanly.

## Functional Requirements

### FR1 - Card booking CTA optimization

The public card page should expose a clear conversion path to booking when scheduling is available.

This sprint should improve the path so it feels like a natural relationship action, not just a detached link.

### FR2 - Inbox-to-meeting action

Users must be able to initiate booking workflow from an inbox item where that makes sense.

### FR3 - Contact-to-meeting action

Users must be able to initiate booking workflow directly from a contact relationship context.

### FR4 - Booking context handoff

When a booking flow begins from card, inbox, or contact context, the system must preserve enough context to:

- attribute the booking source
- reflect the booking in relationship history later
- keep the flow operationally understandable

### FR5 - Booking result continuity

A successful booking must reflect back into:

- relationship timeline
- contact summary
- CRM workflow context where appropriate

### FR6 - No duplicate-contact drift

If booking is initiated from an inbox-linked or contact-linked context, the flow must avoid creating unnecessary duplicate relationship records.

### FR7 - Public booking compatibility

The sprint must preserve the current public scheduling behavior for valid public booking entry points.

### FR8 - Conversion-oriented copy and UX

The booking path should clarify that the user is moving from relationship interest into a meeting, not disappearing into a separate app.

### FR9 - Attribution persistence

Booking metadata must preserve conversion source in a way that later attribution and ROI layers can use.

### FR10 - Event compatibility

The booking conversion model must leave room for later event and post-event workflows to trigger booking-intent follow-up.

### FR11 - Access control

Only authorized internal users should be able to initiate internal booking workflow from CRM/inbox surfaces, while public booking remains governed by appointment availability.

### FR12 - Post-booking workflow bridge

After booking, the user should be able to move back into contact and CRM context naturally.

## Backend Scope

The backend scope for this sprint is booking attribution and workflow continuity on top of existing scheduling capability.

### Service-layer scope

Recommended backend work:

- accept booking context metadata from card, inbox, and contact entry points
- persist booking attribution metadata
- write booking outcomes into relationship timeline
- preserve canonical contact linkage when available

### API scope

Possible update points:

- existing public booking creation endpoint
- internal booking initiation flows if present
- booking timeline/event creation hooks

Recommendation:

- extend current booking creation payloads and internal service methods rather than creating a parallel booking system

### Data model scope

Potential additions:

- booking metadata for conversion source
- booking-to-contact linkage strengthening if needed

Recommendation:

- prefer extending existing booking records with context metadata rather than creating a separate conversion table unless clearly necessary

### Validation scope

- source metadata must reflect real entry surface
- internal contact or inbox-linked booking must prefer canonical contact identity
- public booking flow must remain compatible with existing availability rules
- attribution metadata must not create false relationships

### Backend test scope

- booking attribution persistence tests
- inbox-originated booking context tests
- contact-originated booking context tests
- timeline reflection tests
- canonical-contact continuity tests

## Frontend Scope

The frontend scope for this sprint is the relationship-aware booking entry experience.

### Card page UX

Recommended work:

- strengthen booking CTA clarity
- preserve card context when entering scheduling flow

### Inbox UX

Recommended actions:

- `Book meeting`
- `Open contact`
- `Create task`

The booking action should clearly connect the inbox item to the meeting workflow.

### Contact detail UX

Recommended actions:

- `Book meeting`
- visible recent booking state if one exists

### Booking handoff UX

The booking page should feel connected to the relationship context when entry came from Dotly surfaces.

Recommendation:

- use lightweight contextual hints rather than heavy prefilled assumptions unless existing scheduling already supports them safely

### Post-booking UX

After success, the user should be able to return naturally to:

- contact detail
- inbox item
- relationship timeline context

### Frontend technical scope

- reuse existing scheduling flows and routes
- avoid rewriting the booking product
- focus on contextual entry and continuity

### Frontend test scope

- card booking CTA flow
- inbox-to-booking flow
- contact-to-booking flow
- booking success continuity
- attribution-aware state handling

## Conversion Strategy

Recommended V1 conversion strategy:

- make booking entry easier and more contextual
- preserve attribution
- do not attempt deep smart scheduling logic yet

This keeps the sprint aligned with the existing maturity of scheduling while adding much stronger business value.

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- booking attribution correctness
- context handoff correctness
- canonical-contact continuity
- UX continuity between relationship surfaces and booking
- preservation of existing scheduling behavior

### Audit checklist

- does booking preserve the correct source surface metadata?
- can inbox or contact-driven booking accidentally create duplicate relationship records?
- does a successful booking appear correctly in timeline and contact context?
- does the booking flow feel detached or misleading when launched from relationship surfaces?
- do current public booking flows still work correctly?

## Fix Scope

Any issues found during audit that affect booking attribution, context continuity, canonical contact integrity, or scheduling compatibility must be fixed inside this sprint.

Must-fix categories:

- wrong booking attribution
- duplicate-contact drift during booking flow
- missing timeline reflection
- broken or confusing context handoff
- regression in existing public booking behavior

Can-defer categories only with explicit note:

- advanced booking personalization
- richer qualification prompts
- non-blocking CTA polish
- deeper post-booking workflow enhancements

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- booking conversion remains smooth and attributable
- current scheduling remains stable
- the next team and revenue ops sprint can trust booking as a conversion outcome

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- card, inbox, and contact surfaces can route into booking workflow cleanly
- booking attribution is preserved correctly
- booking outcomes reflect back into relationship context
- canonical-contact continuity is preserved
- existing scheduling behavior is not regressed
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for booking attribution, continuity, and routing pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `011-p04-04A-team-owned-relationship-model.md` when:

- meeting conversion is now a reliable relationship outcome
- attribution from card/inbox/contact to booking is trustworthy
- team-owned relationship and ROI work can treat booking as a first-class conversion event

This sprint must not hand off as ready if:

- booking attribution is still weak
- relationship continuity breaks across the booking boundary
- existing scheduling behavior regressed or became confusing

### What may continue in the next sprint

- team-owned relationship workflows
- shared ownership and assignment
- revenue attribution rooted in bookings and conversions

### What must not be pushed carelessly to the next sprint

- unresolved booking attribution bugs
- unresolved duplicate-contact drift during booking
- unresolved context discontinuity between CRM/inbox and scheduling

## Dependencies

Technical dependencies:

- Sprint 009 inbox routing and contact linking
- existing scheduling and booking foundation
- Relationship OS canonical contact model

Product dependencies:

- agreement on how much booking context should be visible in the UX
- agreement on which entry surfaces are in-scope for V1 conversion optimization

## Non-Goals

- round-robin scheduling
- pooled calendars
- advanced qualification automation
- meeting sequences

## Risks

### Risk 1 - Scheduling regression

If the sprint overreaches into scheduling internals, existing booking stability may suffer.

Mitigation:

- build context and attribution on top of current scheduling rather than replacing it

### Risk 2 - Weak attribution

If booking source metadata is not trustworthy, later ROI and team reporting will be weakened.

Mitigation:

- persist booking entry context explicitly and test it thoroughly

### Risk 3 - Detached UX

If the booking flow still feels disconnected from relationship context, the conversion opportunity remains underused.

Mitigation:

- keep the handoff contextual and the return path clear

### Risk 4 - Contact duplication at booking boundary

If booking initiations create or attach to the wrong relationship record, the CRM layer gets noisier.

Mitigation:

- preserve canonical identity across inbox and contact-initiated booking flows

## Open Questions

1. Should booking initiated from inbox preselect any relationship context visibly in the booking UI, or remain mostly behind-the-scenes attribution?

2. Should the booking success view send users back to contact detail, inbox context, or remain in standalone scheduling flow by default?

3. How much attribution metadata belongs on the booking row versus in related timeline events?

4. Should meeting conversion from public card and from internal CRM/inbox surfaces be considered one product flow or two tightly linked ones?

## Recommended Implementation Notes

- Extend scheduling, do not replace it.
- Preserve attribution and continuity first.
- Prefer a small number of high-value booking entry points.
- Keep the relationship context visible but restrained.
- Treat this sprint as the conversion bridge from relationship interest to calendar outcome.

## Acceptance Criteria

1. Card, inbox, and contact surfaces can drive a user into booking workflow cleanly.

2. Booking attribution preserves the relationship source correctly.

3. Booking outcomes appear back in relationship context.

4. The platform is ready for team-owned relationships and revenue operations in the next program.

## Definition Of Done

This sprint is complete when:

- booking conversion entry points exist
- booking attribution exists
- relationship continuity across booking exists
- audit, fix, and re-audit are completed
- documentation clearly explains how team-owned relationships and revenue ops build on booking conversion next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy meeting conversion outcomes

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat booking conversion as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Relationship interest can now become booked meetings with preserved attribution
- Booking outcomes remain connected to contact and inbox context
- Team and revenue workflows can now build on meeting conversion as a first-class outcome

Deferred:

- Optional richer booking qualification flows
- Optional deeper post-booking workflow guidance
```
