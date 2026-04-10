# Event Radar V01 - 004 - P01 - 01D - Leads Dashboard And Export

## Objective

Turn Event Radar's exchange data into usable organizer and exhibitor intelligence.

This sprint completes Phase 1 by adding:

- event-level dashboard reporting
- stall-level dashboard reporting
- exchange and lead activity views
- export flows for event and stall data
- CRM handoff shape for event-generated exchanges
- trustworthy reporting rules that reflect actual consent and exchange behavior

At the end of this sprint, Event Radar V1 should no longer be only an event QR and exchange system. It should also be a usable operational surface where organizers and businesses can see what happened, who engaged, and what data can be acted on after the event.

## Problem

After Sprint 003, Event Radar can create exchange records, but those records are not yet operationally useful unless organizers and stall operators can:

- see activity by event
- compare nodes or stalls
- review recent exchanges
- understand whether an exchange was collect-only, share-only, or mutual
- export the resulting data
- route useful data into CRM workflows

Without dashboard and export support:

- event exchanges remain trapped as backend records
- exhibitors cannot act on leads collected at a stall
- organizers cannot compare the main event node with stall performance
- business users cannot trust the ROI of Event Radar usage
- Phase 1 would be functionally incomplete even if the scan and consent flow works

This sprint is what makes Event Radar V1 commercially usable.

## Product Intent

This sprint should make Event Radar feel like a serious event operations layer for cards and lead capture.

The product promise is:

- every event has visibility
- every stall has attribution
- exchanges can be reviewed and exported
- lead-style outcomes are separated from non-lead exchanges
- reporting stays truthful to the underlying consent and business mode behavior

The goal is not yet a full event CRM product. The goal is to make event and stall activity measurable, reviewable, and exportable with trust.

## Sprint Scope

In scope:

- event-level summary dashboard
- stall or node-level summary dashboard
- exchange activity list
- event and node filtering
- export for event and node datasets
- reporting semantics for collect-only, share-only, and mutual exchanges
- CRM handoff design for event-generated exchanges
- recent activity and top-performing node views
- truthful zero-state and no-data behavior

Out of scope:

- full attendee directory
- event registration dashboards
- pass and check-in metrics
- lead scoring automation
- follow-up workflow automation beyond basic export or CRM handoff shape
- advanced BI/report builder features
- scheduled report delivery

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

If a sprint leaves behind known reporting, attribution, export, or truthfulness gaps that block dependable use of the sprint outcome, the work must not be treated as ready to continue to the next sprint.

If only non-blocking polish or deliberately deferred expansion remains, the sprint may be marked as safe to continue into the next sprint.

## User Roles In This Sprint

Primary active roles:

- Organizer
  - sees event-wide metrics and activity
  - compares main event node and stall performance
  - exports event data

- Stall operator or business user
  - sees node-specific or stall-specific metrics and exchanges
  - exports stall-level data
  - reviews lead-quality outcomes from event scans

- Internal sales or CRM user
  - uses exported or surfaced data for follow-up

Visitor is not an active dashboard role in this sprint.

## User Stories

### Organizer stories

1. As an organizer, I want to see how many exchanges happened across the event so I can judge event engagement.

2. As an organizer, I want to compare stalls or nodes so I can understand which areas performed best.

3. As an organizer, I want to export event activity so I can share results or act on them outside Dotly if needed.

### Stall and business stories

1. As a stall operator, I want to see only the exchanges and leads that belong to my node so I can follow up quickly.

2. As a business user, I want to distinguish between contacts I collected and pure share-only interactions so I do not inflate my lead list.

3. As a business user, I want to export event or stall data with context such as event name and node name.

### Platform stories

1. As the platform, I need reporting semantics that preserve the difference between exchange types and directions.

2. As the platform, I need export behavior that reflects consented data only and does not leak unsupported scopes.

## Reporting Principles

This sprint must define clear reporting truth rules.

### Principle 1 - Not every exchange is a lead

If a node is `SHARE_ONLY`, the interaction may be useful analytics, but it is not the same as an inbound lead submission.

### Principle 2 - Direction matters

The reporting model must distinguish:

- inbound-only exchange
- outbound-only exchange
- bidirectional exchange

### Principle 3 - Scope matters

An exchange shared with:

- stall only
- organizer only
- event wide
- mutual only

must remain distinguishable in dashboard filters and exports.

### Principle 4 - Export must respect persisted consent

Only the fields actually shared in the exchange should be exportable from that exchange record.

### Principle 5 - Zero must mean zero

If there are no exchanges or no leads, the dashboard must show a clear empty state rather than placeholder values that imply hidden data exists.

## Dashboard Data Model

This sprint should build on the exchange records from Sprint 003 and expose aggregate and list views.

Recommended reporting dimensions:

- event id
- event name
- node id
- node name
- node type
- assigned card id
- business mode
- direction
- scope
- created at

Recommended summary metrics:

- total scans from Event Radar node routes if available
- total exchanges
- inbound exchanges
- mutual exchanges
- share-only interactions
- node count
- active node count
- recent activity count

Recommended lead-style metrics:

- contact-share submissions
- exchanges with email shared
- exchanges with phone shared
- collect-only lead count

Recommendation:

- avoid calling every event interaction a `lead`
- reserve lead-like labels for records where visitor data was actually shared

## Functional Requirements

### FR1 - Event summary dashboard

An organizer can open an event dashboard and view summary metrics for that event.

Recommended cards:

- total exchanges
- inbound leads
- mutual exchanges
- active stalls or active nodes
- recent activity window

If scan metrics are implemented and trustworthy, include:

- total node scans

Only if the underlying measurement is consistent.

### FR2 - Node or stall breakdown

An organizer can see each node or stall with its own summary values.

Recommended columns or cards:

- node name
- node type
- assigned card
- exchanges
- lead-style shares
- mutual exchanges
- last activity time

### FR3 - Recent activity list

An organizer or business user can review recent event exchanges in chronological order.

Recommended activity row fields:

- timestamp
- event name
- node name
- scope
- direction
- shared fields summary
- participant label if available
- business mode

### FR4 - Node-level dashboard

An organizer or authorized business user can open a node-specific dashboard.

The node dashboard should show:

- node summary metrics
- recent exchanges
- export actions
- assigned card summary

### FR5 - Filter and search behavior

Users should be able to filter dashboard data by at least:

- event
- node
- date range
- scope
- direction
- business mode

Search is optional for V1 unless the dataset is already large enough to justify it.

### FR6 - Export event dataset

An organizer can export event data.

Recommended export targets:

- all exchanges for the event
- lead-style exchanges only
- node summary report

### FR7 - Export node dataset

An organizer or authorized business user can export node-specific data.

Recommended export targets:

- all node exchanges
- lead-style exchanges for that node

### FR8 - Export schema must be truthful

Export rows must include only consented fields from each exchange.

If one visitor shared only name and company, the export row must not include empty implied values pretending the system had access to email or phone unless those were actually shared.

### FR9 - CRM handoff surface

This sprint must decide how exchange records are exposed to CRM.

Recommended V1 approach:

- do not invent a second event-only contact system
- either:
  - map qualifying exchanges into existing contact or lead views
  - or provide explicit action to create/push qualifying exchanges into CRM

This decision must remain truthful and operationally simple.

### FR10 - Activity truthfulness

The dashboard must distinguish among:

- exchange recorded
- contact data shared
- mutual exchange completed
- informational share-only interaction

These are not the same event and should not collapse into one metric.

### FR11 - Access control

Only authorized users can access event or node reporting.

Minimum V1 requirement:

- organizer can access all reporting for owned events
- node-specific reporting access for non-organizer business users may be deferred unless an existing team model already supports it

### FR12 - Empty and no-data states

The UI must clearly handle:

- event exists but has no nodes
- nodes exist but no exchanges happened yet
- exchanges exist but no lead-style fields were shared
- node inactive

## Backend Scope

The backend scope for this sprint is the aggregation, list, and export layer built on top of Event Radar exchange records.

### Aggregation endpoints

Recommended authenticated endpoints:

- `GET /events/:id/dashboard`
- `GET /events/:id/nodes/:nodeId/dashboard`
- `GET /events/:id/exchanges`
- `GET /events/:id/exports/exchanges`
- `GET /events/:id/nodes/:nodeId/exports/exchanges`

Optional if a separate summary endpoint is useful:

- `GET /events/:id/nodes/summary`

### Service responsibilities

- aggregate exchange counts by event
- aggregate exchange counts by node
- classify exchanges by direction, business mode, and scope
- produce recent activity list
- shape export rows based on persisted shared fields and shared data
- enforce reporting access control

### Reporting logic requirements

- `totalExchanges` counts all persisted exchange records that represent a real exchange action
- `leadStyleCount` counts only records where visitor data was actually submitted and shared
- `mutualExchangeCount` counts only `BIDIRECTIONAL` outcomes
- `shareOnlyInteractionCount` should be separate if share-only mode creates reportable events

### Export generation requirements

Recommended export format:

- CSV for V1

Recommended columns:

- exchange id
- event id
- event name
- node id
- node name
- node type
- assigned card id
- assigned card handle or label
- business mode
- direction
- scope
- consented at
- shared fields
- shared values for fields actually consented

Do not flatten unavailable fields into misleading defaults.

### Backend validation and guardrails

- export access must be owner-restricted unless broader role logic exists
- export must not leak rows from other events
- node export must be constrained to the event and node relationship
- date-range filtering must be validated if supported

### Backend test scope

- event summary aggregation tests
- node summary aggregation tests
- access control tests
- export row truthfulness tests
- filtering tests if date range or mode filters are supported
- proof that share-only interactions are not falsely counted as inbound leads

## Frontend Scope

The frontend scope for this sprint is the organizer-facing Event Radar dashboard experience.

### Event dashboard page

Recommended sections:

- event header
- summary metric cards
- node performance list
- recent activity list
- export actions

The page should feel operational, not decorative.

### Node performance section

Each row or card should show:

- node name
- node type
- assigned card
- total exchanges
- lead-style exchanges
- mutual exchange count
- last activity
- open dashboard action
- export action

### Recent activity section

Recommended table or list fields:

- time
- node
- direction
- scope
- shared fields summary
- status label

If participant identity is limited in V1, do not over-design a people directory here.

### Node dashboard page

Recommended sections:

- node summary header
- QR status or QR link
- exchange metrics
- recent node exchanges
- export button

### Export UX

Recommended actions:

- `Export event exchanges`
- `Export event leads`
- `Export this stall`

Copy should clarify what each export contains.

Example:

- `Event exchanges: all recorded exchange events for this event`
- `Event leads: only exchanges where a visitor shared contact details`

### Empty-state UX

Examples:

- `No nodes yet. Add a main event QR or stall to start capturing event activity.`
- `No exchanges yet. Share your event or stall QR to start collecting interactions.`
- `No lead-style exchanges yet. Visitors have scanned, but no contact details were shared yet.`

### Frontend test scope

- event dashboard render with data
- empty states
- node dashboard render
- export action availability
- truthful metric labels for different exchange types

## CRM Handoff Plan

This sprint needs to make a clear product decision on CRM handoff.

Recommended V1 approach:

- qualifying exchanges should be visible as lead-style records in a way consistent with existing CRM flows
- attribution metadata should include:
  - event id
  - event name
  - node id
  - node name
  - business mode
  - scope
  - consented at

Two acceptable V1 patterns:

1. automatic CRM creation for qualifying exchanges
2. dashboard-visible exchanges with export, while CRM push is an explicit follow-up action

Recommendation:

- if current CRM model already maps cleanly to public lead capture, automatic contact creation may be acceptable only for exchanges where the visitor actually shared usable contact fields
- do not create CRM contacts for pure share-only interactions

## Analytics Plan

This sprint should align Event Radar reporting with the existing analytics system where possible, but it must not misreport exchange records as simple page views.

Recommended dashboard metrics source split:

- node scan analytics from analytics events if trustworthy
- exchange counts from `Exchange` records
- lead-style counts from exchange classification rules

The dashboard should make it clear when a metric is based on scans versus confirmed exchanges.

## Export Semantics

This sprint should define exact export truth rules.

### Rule 1

Only shared fields are included as populated columns.

### Rule 2

Rows may still include a fixed schema, but unshared fields must remain blank rather than fabricated.

### Rule 3

Direction and scope must always be present because they change the meaning of the row.

### Rule 4

Share-only interactions should not appear in `lead-only` export unless they contain actual visitor-shared data and the product explicitly defines them as qualifying.

### Rule 5

Export filenames should be context-rich.

Examples:

- `event-radar-event-exchanges-2026-04-10.csv`
- `event-radar-event-leads-2026-04-10.csv`
- `event-radar-stall-booth-a-2026-04-10.csv`

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- whether summary metrics reflect the underlying exchange truth
- whether exports leak unshared data
- whether lead-style counts exclude invalid interaction types
- whether event and node access controls hold
- whether empty states are honest and clear
- whether dashboard labels blur scans, exchanges, and leads incorrectly

### Audit checklist

- are share-only interactions incorrectly counted as leads?
- are mutual exchanges counted separately and correctly?
- does node export ever include rows from another node or event?
- do event exports include only the fields actually shared?
- can unauthorized users access event or node reports?
- do dashboard labels claim `leads` when the underlying metric is only `exchanges`?
- do empty states imply hidden missing data instead of true zero?

## Fix Scope

Any issues found during audit that affect reporting truthfulness, export correctness, access control, or CRM attribution must be fixed inside this sprint.

Must-fix categories:

- incorrect metric classification
- unauthorized report or export access
- export leakage of unshared fields
- event/node scoping bugs in queries
- misleading UI labels for scans vs exchanges vs leads
- dashboards that imply performance where no real activity exists

Can-defer categories only with explicit note:

- advanced chart polish
- optional saved filters
- non-blocking table usability improvements
- cosmetic CSV column ordering refinements

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- dashboard counts still match raw exchange logic
- exports remain scoped correctly
- lead-style classification remains correct
- access control still holds after fixes
- empty states remain truthful and understandable

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- event-level dashboard exists and uses trustworthy metrics
- node-level dashboard exists and uses trustworthy metrics
- recent activity list reflects actual exchange outcomes
- export flows exist for event and node scope
- exports include only consented/shared data
- lead-style metrics do not incorrectly count share-only or non-data interactions as leads
- access control for reports and exports is verified
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for aggregation, export, and access control pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `005-p02-02A-registration-and-participant-identity.md` when:

- Event Radar V1 exchanges are visible and actionable
- reporting and export are trustworthy
- event and node attribution are stable enough to support participant identity next

This sprint must not hand off as ready if:

- metrics are still semantically blurry
- exports can leak or misclassify data
- event ROI cannot be trusted from the dashboard
- access control on event reporting is not stable

### What may continue in the next sprint

- event registration model
- participant identity model
- role assignment
- approval states

### What must not be pushed carelessly to the next sprint

- unresolved reporting truth issues
- unresolved export privacy bugs
- unresolved event/node report authorization issues

## Dependencies

Technical dependencies:

- Sprint 001 event foundation
- Sprint 002 node and QR routing
- Sprint 003 exchange persistence and consent logic
- existing export/download patterns in the repo

Product dependencies:

- agreement on what qualifies as a lead-style exchange
- agreement on CRM handoff behavior for V1
- agreement on organizer-only vs broader node-level dashboard permissions

## Non-Goals

- attendee directory metrics
- registration funnel reporting
- pass/check-in reporting
- advanced campaign attribution
- automatic follow-up sequencing

## Risks

### Risk 1 - Metric inflation

If scans, exchanges, and leads are blended together, Event Radar will appear stronger than it really is and users will lose trust.

Mitigation:

- label metrics precisely and classify them by exchange truth rules

### Risk 2 - Export leakage

If exports include fields that were not consented, the product creates a major trust and privacy failure.

Mitigation:

- shape export rows strictly from persisted `sharedFields` and `sharedData`

### Risk 3 - CRM duplication or pollution

If every event interaction becomes a CRM contact, the CRM becomes noisy and less useful.

Mitigation:

- treat lead-style exchanges separately from non-contact interactions

### Risk 4 - Dashboard pretending to be complete analytics

If the dashboard shows made-up or placeholder zeros and percentages, users may assume false accuracy.

Mitigation:

- show only implemented metrics and honest empty states

## Open Questions

1. Should qualifying exchanges create CRM contacts automatically in V1, or should export be the primary action until V2 identity is added?

2. Should stall-level dashboards be organizer-only in V1, or should assigned business users gain access if team features already exist?

3. Should the event dashboard prioritize exchanges over scans, even if scan analytics are available, to keep the product more outcome-focused?

4. Do we want a separate `lead-style exchanges` concept in naming, or should the UI simply call them `contact shares` for clarity?

## Recommended Implementation Notes

- Prefer truthful operational reporting over flashy analytics.
- Reuse existing dashboard and export patterns in the repo where possible.
- Keep report semantics tied to exchange truth, not marketing language.
- Make event and node attribution visible everywhere in the reporting surface.
- Finish Phase 1 with a reliable core, not a large but ambiguous dashboard.

## Acceptance Criteria

1. An organizer can open an event dashboard and see meaningful event-wide metrics.

2. An organizer can view node or stall performance within the event.

3. Recent exchange activity is visible and attributable.

4. Event data can be exported in CSV form.

5. Node-specific data can be exported in CSV form.

6. Exported rows include only consented/shared fields.

7. Dashboard metrics distinguish exchanges, leads, and mutual outcomes correctly.

8. The resulting V1 reporting surface is strong enough to close Phase 1 and support the move into registration and participant identity.

## Definition Of Done

This sprint is complete when:

- event dashboard exists
- node dashboard exists
- recent activity list exists
- export flows exist and are scoped correctly
- reporting semantics are documented and implemented truthfully
- audit, fix, and re-audit are completed
- documentation clearly explains how Phase 2 registration and identity work will build on top of V1 event, node, exchange, and reporting foundations

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - Phase 1 is complete and the roadmap may move into registration and participant identity

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat V1 Event Radar reporting as trustworthy

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Event and stall dashboards report trustworthy exchange outcomes
- Export respects consented field sharing
- Phase 1 Event Radar is operationally usable and safe to build on

Deferred:

- Optional advanced filtering
- Optional CRM auto-push workflow refinement
```
