# World Class Cards V01 - 014 - P04 - 04D - Revenue And Team Performance Views

## Objective

Turn the attribution foundation into usable performance views for teams and operators so Dotly can show which cards, owners, sources, and relationship workflows are producing meaningful business outcomes.

This sprint builds on:

- `011-p04-04A-team-owned-relationship-model.md`
- `012-p04-04B-native-integrations-foundation.md`
- `013-p04-04C-attribution-and-roi-foundation.md`

It adds:

- team performance reporting views
- owner performance reporting views
- source and card outcome views
- revenue-adjacent reporting semantics
- business-facing outcome dashboards grounded in attribution truth

At the end of this sprint, Dotly should be able to show teams not just what happened, but which relationships, cards, owners, and sources are producing real progress.

## Problem

After Sprint 013, Dotly can attribute outcomes to sources in a disciplined way. But the product still lacks the reporting layer that helps businesses act on that information.

Without revenue and team performance views:

- attribution remains technically useful but operationally underused
- team owners cannot compare rep performance cleanly
- cards and sources cannot be evaluated as business assets
- meetings, CRM progress, and outcomes remain visible but not decision-ready
- the product remains strong for operators but weaker for managers and business buyers

The platform needs performance views that answer:

- which cards produce the strongest outcomes?
- which sources convert into meetings or CRM progression?
- which team members are moving relationships forward?
- where are weak spots in the funnel?

## Product Intent

This sprint should make Dotly feel like a business performance product, not just a relationship tool.

The product promise is:

- managers can measure outcomes by owner, card, and source
- individual users can understand what is working for them
- reporting remains honest and attributable
- the business can see where relationships are turning into progress

This sprint is not trying to become a finance suite. It is building revenue-adjacent and team-performance reporting on top of trustworthy outcome and attribution semantics.

## Sprint Scope

In scope:

- owner performance views
- team outcome views
- card performance views
- source performance views
- meeting and CRM progression summaries
- outcome funnel views grounded in current attribution logic
- export-ready reporting shape where useful

Out of scope:

- true closed-revenue accounting
- compensation dashboards
- quota management
- sales forecasting
- multi-team enterprise rollups beyond current team model

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

The sprint is not complete just because dashboards render. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind misleading performance views, incorrect owner/team breakdowns, or inflated revenue language that blocks trust in downstream strategy, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must keep `outcomes`, `performance`, and `revenue` separate.

That means:

- outcomes are measurable progress events
- performance views compare those outcomes across dimensions
- revenue language should only be used where the product truly has supporting data

Examples:

- `meetings booked` is an outcome metric
- `qualified relationships by owner` is a performance view
- `revenue influenced` may be a later derived business metric, not a guaranteed fact in V1

If these layers are blurred together, the dashboards will look better than the truth and lose trust quickly.

## User Roles In This Sprint

Primary roles:

- Individual professional
  - wants to know which cards and workflows are working best

- Team owner or manager
  - wants performance visibility by owner, card, and source

- Team member or rep
  - wants to understand their own output and strongest channels

- Platform
  - needs an honest performance layer before moving into richer personalization and event reliability programs

## User Stories

### User stories

1. As a user, I want to know which cards and sources generate the most meaningful results.

2. As a team owner, I want to compare owners and cards fairly using real outcome data.

3. As a rep, I want to understand which relationship channels convert into meetings and CRM movement.

4. As a business user, I want reporting language that reflects reality instead of vanity metrics.

### Platform stories

1. As the platform, I need performance views grounded in the attribution foundation.

2. As the platform, I need team and owner breakdowns that remain consistent with the ownership model.

3. As the platform, I need performance reporting to support future ROI expansion without rewriting the metric semantics again.

## Performance View Model

This sprint should define a practical first set of performance views.

Recommended dimensions:

- owner
- team
- card
- source surface
- outcome type
- date range

Recommended outcome metrics:

- contacts created
- meetings booked
- CRM progressions
- mutual exchanges where relevant
- follow-up completions if strong enough

Recommendation:

- use metrics already grounded in attribution and relationship truth
- avoid adding speculative KPIs just to fill a dashboard

## Revenue-Adjacent Model

This sprint should define what `revenue-adjacent` means in V1.

Recommended V1 framing:

- show outcome-producing activity
- show progression signals that matter to business users
- avoid calling it revenue unless actual revenue-linked data exists

Acceptable labels:

- `Outcome performance`
- `Team performance`
- `Meetings by source`
- `Qualified progress by owner`

Use `Revenue` only where data truly supports it.

## Functional Requirements

### FR1 - Owner performance view

The system must support owner-level performance summaries.

Recommended metrics:

- meetings booked
- outcome count
- qualified progressions
- source mix

### FR2 - Team performance view

The system must support team-level aggregate performance.

Recommended views:

- total outcomes
- outcomes by owner
- outcomes by source
- outcomes by card

### FR3 - Card performance view

The system must support card-level outcome reporting.

Examples:

- meetings booked from this card
- relationship outcomes tied to this card
- strongest source mix from this card

### FR4 - Source performance view

The system must support source-oriented outcome reporting.

Examples:

- inbox-originated meetings
- lead-capture-originated CRM progressions
- Event Radar-originated outcomes when present

### FR5 - Date filtering

Performance views should support date range filtering.

Recommendation:

- reuse current analytics/reporting date filter patterns if they exist

### FR6 - Team/owner alignment

Owner and team views must reflect the underlying ownership semantics from Sprint 011 accurately.

### FR7 - Honest zero states

The UI must clearly represent when there are no outcomes rather than filling empty charts with misleading placeholders.

### FR8 - Performance language accuracy

The dashboard must not present activity metrics as revenue metrics unless truly supported.

### FR9 - Export-ready reporting shape

The reporting model should be exportable or at least shaped so export is straightforward later.

### FR10 - Contact and attribution compatibility

Performance views must remain traceable back to the contact and attribution layers.

### FR11 - Team-access control

Only authorized users should be able to view team-level performance data.

### FR12 - Future compatibility

The model must support later:

- deeper ROI reporting
- richer event performance overlays
- personalization-informed reporting

without redefining the meaning of core metrics.

## Backend Scope

The backend scope for this sprint is aggregate performance querying and owner/team reporting.

### Service-layer scope

Recommended backend work:

- compute owner, team, card, and source outcome summaries
- support date range filtering
- preserve traceability to underlying attribution semantics

### API scope

Possible endpoints:

- `GET /performance/owners`
- `GET /performance/teams`
- `GET /performance/cards`
- `GET /performance/sources`

Alternative acceptable shape:

- one reporting endpoint with dimensions and filters

Recommendation:

- choose the route shape that best matches current analytics/reporting conventions

### Data model scope

Recommendation:

- derive these views from the attribution layer where possible
- avoid creating a second reporting truth separate from attribution

### Validation scope

- owner/team metrics must respect access control
- counts must not double-count outcomes across dimensions without explicit design
- date filters must produce deterministic results

### Backend test scope

- owner performance aggregation tests
- team performance aggregation tests
- card/source aggregation tests
- access control tests
- anti-double-counting tests

## Frontend Scope

The frontend scope for this sprint is the first business-facing performance reporting experience.

### Reporting UX

Recommended sections:

- team performance summary
- top-performing cards
- outcomes by source
- outcomes by owner
- date filters

### Visualization strategy

Recommendation for V1:

- use clear cards, tables, and restrained charts
- keep labels explicit
- avoid decorative charting that hides the metric meaning

### Drill-down behavior

Where useful, users should be able to move from aggregated metric to:

- attribution detail
- contact detail
- card detail

### Frontend technical scope

- reuse analytics and reporting surfaces where possible
- keep performance views honest and readable

### Frontend test scope

- owner/team/card/source view rendering
- filter behavior
- empty-state behavior
- access-controlled rendering

## Reporting Strategy

Recommended V1 strategy:

- keep metrics tightly tied to meaningful outcomes
- show comparisons only where underlying attribution is stable
- avoid presenting one giant score that hides the components

Recommended initial dashboard labels:

- `Meetings booked`
- `Outcome progression`
- `Outcomes by source`
- `Outcomes by owner`
- `Top-performing cards`

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- owner/team aggregation correctness
- anti-double-counting behavior
- reporting language honesty
- access control
- zero-state truthfulness

### Audit checklist

- do owner/team views agree with the attribution layer?
- are outcomes double-counted when viewed by multiple dimensions?
- do charts or summaries imply revenue where only outcomes exist?
- can unauthorized users see team performance data?
- do empty states correctly represent lack of outcomes?

## Fix Scope

Any issues found during audit that affect reporting truth, owner/team performance correctness, or access control must be fixed inside this sprint.

Must-fix categories:

- wrong owner/team aggregation
- double counting
- misleading revenue-style language
- access leakage
- misleading empty or no-data states

Can-defer categories only with explicit note:

- advanced charts
- richer drill-downs
- non-blocking layout polish
- optional forecast-like views beyond current scope

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- performance views remain truthful and stable
- owner/team semantics remain correct
- the next Trust And Personalization program can proceed without relying on misleading business metrics

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- owner/team/card/source performance views exist
- metrics are grounded in attribution truth
- owner/team semantics are correct
- double counting is controlled
- reporting language remains honest and restrained
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for aggregation, access control, and reporting truthfulness pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `015-p05-05A-privacy-pack-completion.md` when:

- team and outcome reporting are stable
- the world-class roadmap can now move from business performance into trust and personalization without unresolved performance ambiguity

This sprint must not hand off as ready if:

- team or owner reporting is still untrustworthy
- dashboards still overstate revenue certainty
- access control around performance views is weak

### What may continue in the next sprint

- privacy pack completion
- deeper trust controls
- field and audience privacy
- dynamic personalization groundwork

### What must not be pushed carelessly to the next sprint

- unresolved owner/team metric errors
- unresolved double counting
- unresolved misleading business-language issues

## Dependencies

Technical dependencies:

- attribution and ROI foundation
- team-owned relationship model
- current analytics/reporting surfaces

Product dependencies:

- agreement on outcome metrics that belong in first performance views
- agreement on where revenue language is allowed vs prohibited in V1

## Non-Goals

- finance-grade dashboards
- compensation models
- sales forecast tooling
- account planning tools

## Risks

### Risk 1 - Metric inflation

If performance views inflate weak signals into strong business outcomes, trust will collapse.

Mitigation:

- keep views grounded in the attribution and outcome model only

### Risk 2 - Double counting

If the same outcome appears inflated across multiple dimensions without clear semantics, reports become politically and operationally dangerous.

Mitigation:

- make counting rules explicit and consistent

### Risk 3 - Misleading revenue framing

If dashboards imply revenue precision that the system does not have, the product will overpromise.

Mitigation:

- use outcome and performance language carefully

### Risk 4 - Access leakage

If team performance views are visible too broadly, sensitive business information can leak.

Mitigation:

- keep performance access tightly role-gated

## Open Questions

1. Should the first performance views emphasize meetings and progression outcomes only, or include broader workflow completion metrics too?

2. Should individual users see only their own views by default even in team contexts, with team dashboards reserved for admins?

3. Do we want a single performance dashboard with filters, or separate owner/team/card/source tabs in V1?

4. Should exports be part of this sprint, or stay implicit through export-ready payloads until a later reporting polish pass?

## Recommended Implementation Notes

- Build directly on the attribution layer.
- Keep reporting labels precise.
- Favor clarity and comparability over dashboard spectacle.
- Use date and dimension filters to keep the first version practical.
- Treat this sprint as the business-facing reporting closeout for team and revenue ops.

## Acceptance Criteria

1. Teams and users can view outcome performance by owner, card, and source.

2. Reporting remains grounded in trustworthy attribution.

3. Performance views do not overstate revenue or business certainty.

4. The roadmap is ready to move into Trust And Personalization next.

## Definition Of Done

This sprint is complete when:

- performance views exist
- owner/team/card/source reporting exists
- reporting language and semantics are documented and implemented honestly
- audit, fix, and re-audit are completed
- documentation clearly explains how Trust And Personalization begins after this program closes

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy team and performance reporting

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat performance views as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Team and owner performance views are now grounded in trustworthy attribution
- Outcome reporting remains honest and business-useful
- Trust and personalization work can now proceed without unresolved reporting ambiguity

Deferred:

- Optional richer export flows
- Optional more advanced performance visualizations
```
