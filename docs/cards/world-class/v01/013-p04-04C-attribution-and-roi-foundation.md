# World Class Cards V01 - 013 - P04 - 04C - Attribution And ROI Foundation

## Objective

Establish the attribution and ROI foundation so Dotly can connect relationship sources to meaningful outcomes across cards, inbox, meetings, CRM, events, and team workflows without overstating business impact.

This sprint builds on:

- `001-p01-01A-relationship-timeline-foundation.md`
- `003-p01-01C-crm-workflow-hardening.md`
- `010-p03-03C-card-to-meeting-conversion-flow.md`
- `011-p04-04A-team-owned-relationship-model.md`
- `012-p04-04B-native-integrations-foundation.md`

It adds:

- attribution model for relationship sources and outcomes
- outcome taxonomy for meetings, deals, tasks, and CRM progression
- source-to-outcome reporting contract
- team and owner-aware attribution semantics
- first ROI-ready data views without overclaiming revenue truth

At the end of this sprint, Dotly should be able to answer the question: `What relationship sources and card-driven actions led to meaningful business outcomes?`

## Problem

By this point in the roadmap, Dotly can already support rich relationship activity:

- card interactions
- inbox activity
- CRM workflows
- follow-up actions
- bookings and meetings
- team-owned relationships
- Event Radar source context

But without a formal attribution layer:

- users cannot connect relationship activity to outcomes cleanly
- cards, inbox, events, and meetings remain operationally useful but strategically under-measured
- ROI conversations remain anecdotal instead of evidence-backed
- later team performance and revenue views will rest on weak source logic
- integrations may move records outward without preserving the business story of how they started

The platform needs a disciplined attribution model that connects source, journey, and outcome without collapsing everything into shallow vanity metrics.

## Product Intent

This sprint should make Dotly feel outcome-aware.

The product promise is:

- meaningful outcomes can be traced back to their relationship sources
- attribution remains explainable and restrained
- team and owner context are preserved in attribution views
- later revenue and performance dashboards can build on a trustworthy foundation

This sprint is not trying to solve perfect revenue attribution. It is creating a source-to-outcome truth layer strong enough for business reporting and prioritization.

## Sprint Scope

In scope:

- attribution model and terminology
- source taxonomy for cards, inbox, booking, CRM, and event-driven contexts
- outcome taxonomy for relationship progression
- contact-level and aggregate attribution views
- owner-aware and team-aware attribution foundation
- meeting and CRM-stage outcome attribution
- initial ROI-ready reporting contract

Out of scope:

- full closed-revenue forecasting
- multi-touch weighted attribution modeling beyond explainable V1 rules
- finance-grade revenue reporting
- campaign-level budget ROI modeling
- commission or compensation logic

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

The sprint is not complete just because attribution labels appear in the UI. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind source ambiguity, inflated attribution, or owner/team misattribution that blocks performance views and product trust, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must keep `source`, `touchpoint`, `outcome`, and `value` separate.

That means:

- a source is where the relationship or action originated
- a touchpoint is an interaction in the journey
- an outcome is a meaningful business progression event
- value is a later interpretation layered on top of outcomes

Examples:

- `Card lead capture` is a source or touchpoint
- `Meeting booked` is an outcome
- `Deal moved to qualified` is an outcome
- `Revenue influenced` is a later value interpretation, not a raw source fact

If these concepts are merged together, reporting becomes misleading and difficult to trust.

## User Roles In This Sprint

Primary roles:

- Individual user
  - wants to know which card and relationship activity creates real results

- Team owner or admin
  - wants team-level visibility into what sources drive meetings and progression

- Team member or rep
  - wants to understand which inbound and relationship actions actually matter

- Platform
  - needs a disciplined attribution model before performance views become more ambitious

## User Stories

### User stories

1. As a user, I want to know which sources led to booked meetings, meaningful CRM movement, or strong relationship outcomes.

2. As a team owner, I want to understand results by owner, card, and source without inflating vanity metrics.

3. As a user, I want attribution to remain understandable instead of hiding behind black-box scoring.

4. As a user, I want booking and CRM outcomes to stay linked to the contact's actual journey.

### Platform stories

1. As the platform, I need a reusable attribution model that spans cards, inbox, meetings, CRM, and events.

2. As the platform, I need team and ownership semantics preserved in attribution outputs.

3. As the platform, I need ROI-ready reporting that avoids claiming more certainty than the data supports.

## Attribution Model

This sprint should define a practical attribution model.

Recommended concepts:

- `primarySource`
- `sourceSurface`
- `keyTouchpoints`
- `meaningfulOutcome`
- `ownerUserId`
- `teamId`
- `occurredAt`

Recommendation for V1:

- use explainable deterministic rules
- focus on first-source and clear source-to-outcome associations before attempting sophisticated weighted multi-touch attribution

## Source Taxonomy

Recommended initial source surfaces:

- `CARD_PAGE`
- `LEAD_CAPTURE`
- `INBOX_MESSAGE`
- `VOICE_NOTE`
- `FILE_DROP`
- `BOOKING`
- `CRM_MANUAL`
- `EVENT_RADAR`

Recommendation:

- keep the list clear and stable
- allow event-aware expansion without redefining older sources

## Outcome Taxonomy

Recommended initial meaningful outcomes:

- `CONTACT_CREATED`
- `MEETING_BOOKED`
- `MEETING_COMPLETED` if later available
- `TASK_CREATED`
- `DEAL_STAGE_ADVANCED`
- `MUTUAL_EXCHANGE_COMPLETED`
- `FOLLOW_UP_COMPLETED`

Recommendation for V1:

- prioritize meeting and CRM progression outcomes first
- keep lower-value workflow artifacts distinct from higher-value conversion outcomes

## ROI Foundation Model

This sprint should define ROI-adjacent but still honest measurement.

Recommended V1 reporting concepts:

- relationship outcomes by source
- meetings booked by source
- CRM progression by source
- team owner outcomes by source

Recommendation:

- do not call everything `ROI` if it is only activity
- use `outcomes` and `attribution` language precisely

## Functional Requirements

### FR1 - Source-to-outcome attribution

The system must be able to connect meaningful outcomes back to a primary source context.

### FR2 - Deterministic attribution rules

Attribution must be explainable.

Recommendation for V1:

- prefer first-source plus meaningful touchpoint support
- avoid opaque probabilistic attribution logic

### FR3 - Contact-level attribution view

The contact experience should surface:

- where the relationship started
- what meaningful outcomes have occurred
- which source is currently attributed to those outcomes

### FR4 - Aggregate attribution query surface

The system must support aggregate reporting by:

- source surface
- owner
- team
- outcome type

### FR5 - Booking attribution continuity

Bookings created through cards, inbox, or contact flows must preserve source attribution.

### FR6 - CRM progression attribution continuity

Meaningful CRM progression events should retain their relationship source context.

### FR7 - Team-aware attribution

Attribution outputs must preserve owner and team semantics where available.

### FR8 - No vanity inflation

The reporting model must not equate passive interactions with outcomes.

Examples:

- page views are not the same as meetings booked
- inbox messages are not the same as revenue outcomes

### FR9 - Event Radar compatibility

Event-generated contacts, exchanges, meetings, or follow-ups must fit into the attribution model cleanly.

### FR10 - Integration compatibility

If external integrations are connected, attribution context must remain understandable and not be erased during sync.

### FR11 - Timeline compatibility

Attribution should align with timeline and relationship history, not contradict it.

### FR12 - Future revenue compatibility

The model must support later `revenue influenced` and performance views without forcing a redesign of source or outcome semantics.

## Backend Scope

The backend scope for this sprint is attribution modeling and aggregate query support.

### Service-layer scope

Recommended backend work:

- derive primary source and source surface from relationship context
- map outcomes to contacts and source context
- expose aggregate attribution summaries
- preserve owner and team dimensions in attribution output

### API scope

Possible endpoints:

- `GET /attribution/summary`
- `GET /contacts/:id/attribution`

Or equivalent endpoints under analytics/contacts/reporting namespaces.

Recommendation:

- choose routes that fit the current analytics and CRM organization cleanly

### Data model scope

Recommendation for V1:

- derive attribution from existing canonical contact, timeline, booking, CRM, and event metadata where possible
- add minimal persisted attribution summary only if necessary for performance or consistency

Potential additions:

- attribution metadata on bookings or CRM transitions
- source summary fields if needed for reliable aggregate queries

### Validation scope

- attribution rules must be deterministic
- outcomes must not be double-counted under conflicting sources without explicit rule
- owner/team attribution must reflect the operational model accurately

### Backend test scope

- source-to-outcome mapping tests
- aggregate attribution query tests
- booking attribution continuity tests
- owner/team dimension tests
- anti-inflation tests for passive activity vs outcomes

## Frontend Scope

The frontend scope for this sprint is outcome-aware attribution visibility.

### Contact detail UX

Recommended additions:

- source and outcome summary
- simple attribution panel
- meeting and CRM progression context

### Aggregate reporting UX

Recommended first views:

- outcomes by source
- meetings by source
- progression by owner or team

Recommendation:

- prefer tables, filters, and clear labels over flashy charts in the first pass

### Frontend technical scope

- reuse analytics and CRM views where possible
- avoid overbuilding dashboard complexity before the next sprint strengthens performance views

### Frontend test scope

- contact-level attribution rendering
- aggregate attribution rendering
- owner/team dimension rendering
- no-outcome state handling

## Reporting Strategy

Recommended V1 reporting approach:

- show clear source and outcome counts
- show dimensions like owner, team, and source surface
- avoid implied causality beyond the defined attribution rules

Examples of acceptable statements:

- `12 meetings booked from card lead capture`
- `8 qualified CRM progressions from inbox-originated contacts`

Examples to avoid unless truly supported later:

- `Card X generated $Y revenue`

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- attribution rule correctness
- source continuity across bookings and CRM outcomes
- owner/team dimension accuracy
- anti-inflation behavior
- UI reporting truthfulness

### Audit checklist

- are passive touches being mislabeled as outcomes?
- are meetings and CRM progressions tied back to the correct source?
- does team or owner attribution drift after ownership changes?
- do contact-level attribution and aggregate reporting agree?
- does the UI imply stronger ROI certainty than the data supports?

## Fix Scope

Any issues found during audit that affect source truth, outcome counting, owner/team attribution, or reporting honesty must be fixed inside this sprint.

Must-fix categories:

- wrong source-to-outcome linkage
- double counting outcomes
- owner/team attribution drift
- passive activity inflation
- misleading reporting language

Can-defer categories only with explicit note:

- advanced charts
- richer outcome breakdowns
- non-blocking UI polish
- deeper multi-touch attribution experiments

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- attribution remains deterministic and honest
- owner and team dimensions remain correct
- the next performance-view sprint can build on a stable attribution layer

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- source-to-outcome attribution exists and is deterministic
- contact-level attribution context exists
- aggregate attribution reporting exists
- owner/team dimensions are preserved correctly
- passive activity is not inflated into outcomes
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for attribution mapping, aggregation, and reporting truthfulness pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `014-p04-04D-revenue-and-team-performance-views.md` when:

- source and outcome attribution are trustworthy
- owner/team performance views can build on stable attribution semantics
- business reporting can deepen without inventing new source logic again

This sprint must not hand off as ready if:

- attribution rules are still ambiguous
- owner/team outcome mapping remains unstable
- reporting is still inflating weak signals into success metrics

### What may continue in the next sprint

- performance dashboards
- team outcome views
- stronger ROI-oriented reporting

### What must not be pushed carelessly to the next sprint

- unresolved source ambiguity
- unresolved double counting
- unresolved owner/team attribution drift

## Dependencies

Technical dependencies:

- relationship OS, booking conversion, team-owned relationship model, and integration foundation

Product dependencies:

- agreement on outcome taxonomy
- agreement on restrained ROI language for V1

## Non-Goals

- true revenue accounting
- probabilistic multi-touch attribution
- compensation or forecasting logic
- finance dashboards

## Risks

### Risk 1 - Inflated attribution claims

If weak interactions get counted like real business outcomes, trust will erode quickly.

Mitigation:

- separate touchpoints from outcomes and report them differently

### Risk 2 - Source ambiguity after workflow progression

If the product loses track of how a contact originated once meetings or CRM progress happen, attribution becomes less useful.

Mitigation:

- preserve source context through the whole relationship journey

### Risk 3 - Owner/team drift

If attribution reflects the wrong owner or team after handoff, performance views will become politically and operationally fragile.

Mitigation:

- keep attribution rules explicit about source owner vs current owner when needed

### Risk 4 - Overpromising ROI too early

If the sprint labels attribution as revenue truth before revenue data exists, the reporting will feel dishonest.

Mitigation:

- use precise `outcomes` and `attribution` language in V1

## Open Questions

1. Should V1 attribution prioritize first-source only, or also expose latest meaningful source alongside it?

2. Should ownership changes alter future attribution ownership only, or also reshape historical performance reporting?

3. Which outcome types are strong enough to appear in the first aggregate views?

4. Do we need explicit `attribution status` metadata on bookings and CRM events, or is derived logic enough for V1?

## Recommended Implementation Notes

- Keep attribution deterministic and explainable.
- Preserve source context everywhere an outcome is created.
- Separate outcomes from value claims.
- Prefer operational truth over marketing-friendly dashboards.
- Treat this sprint as the semantic foundation for the next performance views.

## Acceptance Criteria

1. Dotly can attribute meaningful outcomes back to relationship sources.

2. Contact-level attribution and aggregate attribution views are available.

3. Owner and team attribution semantics are trustworthy.

4. The platform is ready for revenue and team performance views in the next sprint.

## Definition Of Done

This sprint is complete when:

- attribution model exists
- outcome taxonomy exists
- contact and aggregate attribution views exist
- audit, fix, and re-audit are completed
- documentation clearly explains how revenue and performance views build on this attribution foundation next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy attribution and outcome foundations

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat attribution and ROI semantics as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Source-to-outcome attribution is now explainable and trustworthy
- Owner and team dimensions are preserved correctly
- Performance views can now build on a stable attribution foundation

Deferred:

- Optional deeper multi-touch attribution
- Optional richer aggregate dashboards
```
