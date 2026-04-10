# Event Radar V01 - 010 - P03 - 03C - Post-Event Ops And CRM Routing

## Objective

Complete Event Radar v01 by turning event, exchange, pass, and attendance data into usable post-event follow-up and CRM workflows.

This sprint adds:

- post-event operational closeout views
- attendance-aware lead and connection review
- CRM routing rules for event-generated contacts and exchanges
- follow-up prioritization surfaces
- export and handoff improvements tied to attendance truth
- final operational reporting layer for Event Radar v01

At the end of this sprint, Event Radar should support the full event loop:

- create event
- run scans and exchanges
- register participants
- issue passes
- check in attendees
- act on what happened after the event

## Problem

After Sprint 009, Event Radar can validate passes and capture real attendance, but the platform still lacks a structured post-event operating layer.

Without post-event ops and CRM routing:

- organizers cannot close the loop between event activity and follow-up
- exhibitors cannot prioritize attended leads over no-shows or low-signal interactions
- CRM systems receive incomplete or poorly classified event data
- event value remains visible in dashboards but not actionable in workflows
- Dotly stops at event execution rather than helping convert event interactions into relationships and revenue

The platform needs a post-event layer that answers:

- who attended
- who registered but did not attend
- which exchanges happened at which nodes
- which contacts are worth follow-up first
- how those outcomes should flow into CRM cleanly

## Product Intent

This sprint should make Event Radar feel complete as a business workflow, not just an event feature set.

The product promise is:

- event outcomes remain useful after the event ends
- attendance improves the quality of follow-up decisions
- CRM receives structured event context rather than generic lead noise
- organizers and exhibitors can move directly from event activity to next actions

This sprint is not trying to become a full marketing automation platform. It is defining the clean handoff from event operations into follow-up and CRM execution.

## Sprint Scope

In scope:

- post-event summary view
- attendance-aware exchange and lead classification
- CRM routing rules for event-derived records
- follow-up prioritization surfaces
- attended vs not-attended segmentation
- event and stall closeout reporting improvements
- post-event export enhancements
- operational completion criteria for Event Radar v01

Out of scope:

- automated email campaigns
- full marketing automation sequences
- AI lead scoring if not already established elsewhere
- external CRM writebacks beyond agreed V1/V2 patterns unless already supported by product architecture
- survey and feedback workflows
- invoicing or ROI billing analytics

## Sprint Delivery Structure

Every Event Radar sprint should be executable and reviewable through the same delivery frame. This sprint follows that model and future sprint docs should retain it.

Required sections for every sprint:

- backend scope
- frontend scope
- audit scope
- fix scope
- re-audit scope
- GREEN criteria
- handoff decision: can the remaining work continue in the next sprint or not

### Sprint completion rule

The sprint is not complete just because the feature is implemented. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind known CRM routing, attendance classification, export, or follow-up-priority gaps that block dependable use of the sprint outcome, the work must not be treated as ready to close Event Radar v01.

If only non-blocking polish remains, the roadmap pack may be considered complete.

## Core Design Principle

This sprint must preserve separation among:

- attendance truth
- exchange truth
- lead qualification
- CRM routing state

These are related but not equivalent.

Examples:

- someone can attend without sharing contact details
- someone can share details without attending if the event flow allowed pre-event or remote interaction
- someone can be a high-value event connection without being an inbound lead in CRM terms
- CRM routing should not flatten all event records into the same generic contact outcome

## User Roles In This Sprint

Primary active roles:

- Organizer
  - reviews event closeout
  - sees attendance and exchange outcomes
  - routes or exports event data for operations and follow-up

- Exhibitor or stall owner
  - reviews stall-specific outcomes
  - prioritizes follow-up based on attendance and exchange quality
  - exports or routes stall outcomes into CRM

- Sales or CRM user
  - consumes event-routed records
  - uses event context for follow-up prioritization

Participants are not primary actors in this sprint except where participant-facing summaries are optionally shown.

## User Stories

### Organizer stories

1. As an organizer, I want to see which registered participants actually attended so I can understand event completion and participation quality.

2. As an organizer, I want to compare attendance, exchanges, and networking outcomes so I can measure how the event performed.

3. As an organizer, I want a clean event closeout summary so I know which operational and engagement signals matter after the event.

### Exhibitor and business stories

1. As an exhibitor, I want to know which of my exchanges came from attendees who actually checked in so I can prioritize follow-up.

2. As an exhibitor, I want to export or route event-scoped contacts into CRM with stall, event, and attendance context intact.

3. As a business user, I want to avoid polluting CRM with low-signal or non-contact interactions.

### Platform stories

1. As the platform, I need attendance and exchange data to combine cleanly without misclassification.

2. As the platform, I need CRM routing logic that respects consent, event context, and business meaning.

## Post-Event Model

This sprint should define the final closeout interpretation of Event Radar data.

Recommended post-event dimensions:

- registration status
- attendance status
- pass status
- exchange count
- mutual connection count
- stall or node context
- contact-share quality
- CRM routed or not routed state

These dimensions should support both summary reporting and detailed follow-up workflows.

## Follow-Up Priority Model

This sprint should define a practical prioritization model.

Recommendation:

- do not overbuild algorithmic scoring in v01
- use transparent operational categories instead

Suggested priority buckets:

- `ATTENDED_AND_SHARED_CONTACT`
- `ATTENDED_AND_MUTUAL_EXCHANGE`
- `ATTENDED_NO_CONTACT_SHARED`
- `REGISTERED_NO_SHOW`
- `REMOTE_OR_PRE_EVENT_EXCHANGE`

This is easier to trust than opaque scoring.

## CRM Routing Model

This sprint must decide how event outcomes become CRM-relevant records.

Recommended rule set:

- route only qualifying records into CRM as lead-style contacts
- preserve event metadata on every routed record
- keep non-qualifying interactions visible in Event Radar without forcing them into CRM

Minimum metadata to preserve:

- event id
- event name
- node id
- node name
- participant attendance state if known
- exchange direction
- scope
- business mode
- consent timestamp
- check-in state if relevant

Recommendation:

- CRM routing should be explicit and deterministic
- do not rely on ambiguous heuristics in v01

## Functional Requirements

### FR1 - Event closeout summary

Organizer can view a post-event summary showing:

- total registered
- total approved
- total checked in
- no-show count
- total exchanges
- mutual participant connections
- stall or node activity summary

### FR2 - Attendance-aware lead review

Organizer or exhibitor can review event-derived contacts and exchanges with attendance context.

Recommended labels:

- attended
- not attended
- registration unknown or not applicable

### FR3 - Stall follow-up view

Exhibitor or organizer can see stall-specific post-event outcomes.

Recommended fields:

- attendee checked in or not
- exchange direction
- shared fields summary
- mutual exchange status
- event and node context

### FR4 - Follow-up priority buckets

The UI should group or filter records by operationally useful buckets.

Recommendation:

- use transparent categories rather than hidden scores

### FR5 - CRM routing action

Organizer or authorized business user can route qualifying event outcomes into CRM or view them through CRM-compatible surfaces.

This should follow one clear product pattern.

Acceptable patterns:

1. automatic routing for qualifying records
2. explicit `Send to CRM` or `Create contact` action
3. filtered CRM-ready export if direct CRM creation is not desired

Recommendation:

- use the approach that best matches the current Dotly CRM architecture and existing user expectations

### FR6 - CRM routing qualification rules

The system must define which records qualify for CRM routing.

Recommended baseline qualification:

- visitor or participant shared actual contact data
- consent exists
- record is not purely share-only informational traffic

Attendance should strengthen the value of a record, but not necessarily be mandatory for CRM qualification in every event type.

### FR7 - Post-event export

Organizer and exhibitor exports should include attendance-aware context.

Recommended additional columns:

- checked in
- first check-in time if relevant
- node context
- participant role if appropriate
- follow-up priority bucket

### FR8 - No-show segmentation

Organizer should be able to distinguish:

- registered and attended
- registered and did not attend
- interacted without registration if such flows exist

### FR9 - Event completion state

The event should support a meaningful operational close state.

Recommendation:

- event may transition to `COMPLETED`
- post-event reporting remains available
- live scan and active operational messaging should no longer dominate the UI once event is complete

### FR10 - Post-event recent activity and history

The system should preserve the relevant historical timeline of:

- exchanges
- pass issuance
- check-ins
- CRM routing status

### FR11 - Reporting truthfulness

Post-event dashboards must not conflate:

- registered
- attended
- exchanged
- routed to CRM

Each is a separate state and must remain visible as such.

### FR12 - Event Radar v01 completion readiness

This sprint should define the final operational standard for calling Event Radar v01 complete and usable.

## Backend Scope

The backend scope for this sprint is the post-event aggregation, qualification, and CRM-routing layer.

### Aggregation and query endpoints

Recommended endpoints:

- `GET /events/:id/post-event-summary`
- `GET /events/:id/follow-up`
- `GET /events/:id/nodes/:nodeId/follow-up`
- `GET /events/:id/crm-routing-preview`
- `POST /events/:id/crm-route`

Optional if fitting existing CRM model:

- `POST /events/:id/nodes/:nodeId/crm-route`

### Service responsibilities

- combine registration, pass, check-in, exchange, and node data
- classify attendance-aware follow-up records
- determine CRM qualification per record
- generate post-event summary counts
- route or shape records for CRM using existing contact patterns where appropriate

### Data model additions

This sprint may require one of the following:

- lightweight routing metadata on exchange/contact records
- or a dedicated `crmRoutedAt` / `crmRouteStatus` field if explicit tracking is needed

Recommendation:

- prefer minimal routing metadata additions over creating a large new table unless existing CRM integration patterns strongly justify it

Potential fields or metadata:

- `crmQualified: Boolean`
- `crmRoutedAt: DateTime?`
- `crmRouteContext: Json?`

### Validation rules

- event must belong to requesting organizer or authorized operator
- node follow-up query must remain scoped to that node and event
- CRM route action must only include qualifying records
- records lacking shared contact data must not be routed as lead-style CRM contacts by mistake
- exports must include only consented/shared data

### Backend test scope

- post-event summary aggregation tests
- attendance bucket classification tests
- CRM qualification tests
- CRM route action tests
- export truthfulness tests
- organizer vs exhibitor access tests if scoped access exists

## Frontend Scope

The frontend scope for this sprint covers post-event follow-up and closeout surfaces.

### Event closeout dashboard UX

Recommended sections:

- event completion summary
- attendance summary
- exchange and networking summary
- follow-up priority buckets
- CRM-ready record count
- export and route actions

### Follow-up list UX

Recommended columns or card fields:

- name or participant label
- attended or not attended
- node or stall
- exchange type
- shared fields summary
- mutual or one-way
- follow-up bucket
- CRM route state

### Node or stall closeout UX

Stall-specific closeout should show:

- total relevant exchanges
- attended exchange count
- mutual exchange count
- CRM-qualified count
- export action
- route to CRM action if supported

### CRM routing UX

If direct CRM routing exists in-product, UI should show:

- what records qualify
- what will be created or updated
- what event metadata will be preserved
- route action confirmation

If routing is export-only, the UI must say so clearly.

### Empty-state UX

Examples:

- `No CRM-qualified event contacts yet.`
- `Participants attended, but no contact details were shared.`
- `This stall had scans, but no qualified follow-up records.`

### Frontend technical scope

- reuse existing analytics and CRM UI patterns where appropriate
- keep the closeout view operational and readable
- avoid flashy summary design that hides state distinctions

### Frontend test scope

- event closeout render with mixed data
- no-show and attended segmentation render
- CRM qualification labels
- routing action availability and confirmation states
- empty-state truthfulness

## Qualification Strategy

Recommended v01 qualification model:

- a record is `CRM qualified` when it includes consented contact-sharing data sufficient for follow-up
- attendance is an additional signal, not necessarily the sole qualification rule

Recommended follow-up sorting preference:

1. attended and shared contact
2. attended and mutual exchange
3. shared contact without attendance
4. no-show but registered
5. informational interactions only

This keeps the model simple and explainable.

## CRM Routing Strategy

Recommended v01 CRM routing principles:

- use existing Dotly CRM contact structures where possible
- preserve event metadata in contact timeline or CRM fields
- prevent duplicate noisy routing for the same event/contact combination where possible
- do not create CRM contacts for records without meaningful shared data

If existing CRM architecture already supports contacts with source metadata, Event Radar should reuse that path instead of building a parallel CRM system.

## Export Semantics

Post-event exports should remain strict about consent and truth.

Recommended rules:

- only shared fields are populated
- attendance columns reflect actual successful check-in state
- no-show status must not be inferred if the event never enabled check-in
- CRM-qualified columns should reflect the routing rules actually used

Example export columns:

- event name
- node name
- participant name
- role
- checked in
- check-in timestamp
- exchange direction
- scope
- shared fields
- email if shared
- phone if shared
- company if shared
- follow-up bucket
- crm qualified
- crm routed at

## Event Completion Strategy

This sprint should formalize how an event moves into post-event mode.

Recommendation:

- organizer can mark event `COMPLETED`
- completed events remain fully reportable
- active operational UI shifts to historical closeout UI

This helps keep the product lifecycle coherent.

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- attendance and exchange classification correctness
- CRM qualification correctness
- CRM routing scope and duplication safety
- export truthfulness
- organizer and exhibitor access boundaries
- event completion behavior

### Audit checklist

- are attended and not-attended records classified correctly?
- are non-contact interactions incorrectly marked CRM-qualified?
- can CRM routing include records from the wrong event or node?
- can exports include fields that were never shared?
- do post-event dashboards collapse registration, attendance, and exchange into one metric?
- does event completion hide or break valid historical data?

## Fix Scope

Any issues found during audit that affect CRM qualification, attendance truth, export correctness, or post-event reporting integrity must be fixed inside this sprint.

Must-fix categories:

- incorrect attended/no-show classification
- incorrect CRM qualification
- cross-event or cross-node routing bugs
- export leakage of unshared fields
- misleading post-event metric labels
- broken event completion state transitions

Can-defer categories only with explicit note:

- cosmetic dashboard polish
- optional richer follow-up filtering
- non-blocking CRM UX refinement
- minor wording improvements

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- post-event summary still matches raw event data truth
- CRM qualification and routing still behave correctly
- exports remain scoped and truthful
- event completion and historical views remain stable

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred after v01

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- post-event summary exists and is trustworthy
- attendance-aware follow-up views exist
- CRM qualification rules are explicit and correct
- CRM routing or equivalent CRM-ready handoff is functional and scoped correctly
- exports include truthful attendance and contact-sharing context
- event completion behavior is coherent
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for aggregation, qualification, routing, and export pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

This sprint is intended to close Event Radar v01.

If it exits GREEN, the v01 roadmap pack is complete and ready for implementation planning, phased execution, or v02 expansion.

If it does not exit GREEN, Event Radar v01 must be treated as incomplete.

### What may continue after v01

- automation and follow-up sequences
- advanced matchmaking
- session-level attendance analytics
- richer partner and sponsor workflows
- deeper CRM integrations

### What must not be claimed before v01 is GREEN

- end-to-end event operating completeness
- trustworthy attendance-aware CRM workflows
- production-ready post-event closeout quality

## Dependencies

Technical dependencies:

- all prior Event Radar sprint foundations
- existing CRM model and export patterns in the repo

Product dependencies:

- agreement on CRM qualification rules
- agreement on whether routing is automatic or explicit
- agreement on final v01 completion standard

## Non-Goals

- marketing automation
- sales sequencing
- survey collection
- ticketing revenue analytics
- partner billing workflows

## Risks

### Risk 1 - CRM pollution

If every event interaction becomes a CRM record, follow-up quality drops and CRM trust erodes.

Mitigation:

- use explicit qualification rules based on shared data and event context

### Risk 2 - Attendance overreach

If the system infers attendance where no valid check-in exists, post-event follow-up becomes misleading.

Mitigation:

- derive attendance only from trustworthy check-in outcomes

### Risk 3 - Metric collapse

If registration, attendance, exchanges, and CRM qualification collapse into one blended success number, the product loses operational credibility.

Mitigation:

- keep each state visible and distinct throughout closeout reporting

### Risk 4 - Too much automation too early

If this sprint tries to automate follow-up fully, it may reduce clarity and increase mistakes.

Mitigation:

- keep v01 focused on truthful classification and routing foundation first

## Open Questions

1. Should CRM routing be automatic for qualified records, or remain a deliberate organizer or exhibitor action in v01?

2. Should no-show participants ever produce follow-up records by default, or only when they also exchanged data remotely?

3. How much stall-level CRM autonomy should exhibitors have versus organizer-controlled routing?

4. Should Event Radar v01 include a final event closeout checklist in-product, or leave that as documentation and operator practice?

## Recommended Implementation Notes

- Reuse existing CRM models instead of inventing a parallel event CRM.
- Keep qualification rules explicit and simple.
- Preserve event and node metadata everywhere in post-event workflows.
- Keep attendance truth tied to actual check-in history.
- Treat this sprint as the closeout and action layer that proves Event Radar's business value.

## Acceptance Criteria

1. Organizer can view a trustworthy post-event summary.

2. Exhibitor or organizer can review attendance-aware follow-up records by event and node.

3. CRM qualification rules are implemented and visible.

4. CRM routing or CRM-ready handoff preserves event context and avoids obvious noise.

5. Post-event exports include truthful attendance and contact-sharing context.

6. Event Radar v01 has a complete operational path from event setup through post-event follow-up.

## Definition Of Done

This sprint is complete when:

- post-event summary exists
- follow-up prioritization exists
- CRM qualification and routing exist in the agreed form
- post-event exports exist with attendance-aware context
- event completion behavior exists
- audit, fix, and re-audit are completed
- documentation clearly closes the Event Radar v01 roadmap pack

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - v01 Complete`
  - sprint passed implementation, audit, fix, and re-audit
  - Event Radar v01 is complete as a roadmap pack and implementation target

- `GREEN - v01 Complete With Noted Deferrals`
  - Event Radar v01 is complete and safe to proceed with
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - v01 Incomplete`
  - blocking issues remain
  - Event Radar v01 must not be treated as complete

Recommended closeout message format:

```md
Status: GREEN - v01 Complete

Why:

- Post-event reporting, qualification, and CRM routing are trustworthy
- Attendance and exchange truth stay distinct throughout closeout workflows
- Event Radar now covers the full event lifecycle from setup to follow-up

Deferred:

- Optional automated follow-up sequences
- Optional deeper external CRM sync refinement
```
