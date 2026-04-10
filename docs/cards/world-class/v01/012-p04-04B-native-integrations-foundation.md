# World Class Cards V01 - 012 - P04 - 04B - Native Integrations Foundation

## Objective

Establish the native integrations foundation so Dotly can connect relationship, CRM, inbox, and meeting data to external systems without losing identity, ownership, or attribution integrity.

This sprint builds on:

- `002-p01-01B-identity-resolution-and-merge.md`
- `003-p01-01C-crm-workflow-hardening.md`
- `011-p04-04A-team-owned-relationship-model.md`

It adds:

- integration contract model
- connector and sync state foundation
- external mapping rules for contacts and activity context
- ownership-aware sync semantics
- safe groundwork for high-value native integrations

At the end of this sprint, Dotly should be ready to connect to external systems in a controlled, explainable way rather than through ad hoc exports alone.

## Problem

The product already has strong internal relationship context, but world-class usefulness depends on fitting into existing workflows.

Without a native integrations foundation:

- contacts remain siloed in Dotly
- team workflows cannot reliably connect to the tools businesses already use
- CRM and follow-up data lose value when they cannot flow into adjacent systems
- later ROI and operational reporting become weaker because external-system continuity is missing
- each new integration risks inventing its own mapping and sync rules

The platform needs a common integration layer that answers:

- what external systems are connected?
- what data can flow in or out?
- how are contacts mapped safely?
- how does ownership behave across sync?
- how do we avoid duplicates and sync corruption?

## Product Intent

This sprint should make Dotly feel integration-ready.

The product promise is:

- integrations are built on stable identity and ownership rules
- sync behavior is explicit and understandable
- external systems receive useful relationship context instead of noisy raw records
- later connectors can be added without redefining the core sync model each time

This sprint is not trying to ship every major integration at once. It is creating the contract and first-class foundation they all depend on.

## Sprint Scope

In scope:

- integration connection model
- sync direction and sync-state model
- external identity mapping foundation
- contact and relationship export semantics
- ownership-aware sync rules
- webhook and connector-ready architecture
- first supported integration targets selection framework

Out of scope:

- shipping every target integration end-to-end
- deep bidirectional sync for many providers at once
- advanced field-mapping UI
- external workflow automation orchestration
- large marketplace experience for connectors

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

The sprint is not complete just because an integration settings page exists. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind unclear mapping semantics, duplicate-sync risk, or weak ownership handling that blocks attribution and ROI work, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must keep `integration connection`, `sync mapping`, and `business workflow behavior` separate.

That means:

- a user or team connects an external system
- Dotly defines what objects can sync and how identity maps
- later workflow actions can use that connection safely

Examples:

- connecting HubSpot is not the same as deciding every contact should auto-push there
- a contact mapping record is not the same as contact ownership inside Dotly
- one-way export readiness is different from full bidirectional sync

If these are collapsed together, every connector becomes difficult to reason about and harder to audit.

## User Roles In This Sprint

Primary roles:

- Individual professional
  - wants Dotly contacts and outcomes to connect to familiar tools

- Team admin or operator
  - wants integrations to respect team ownership and not create sync chaos

- Platform
  - needs one reusable integration foundation before adding more connectors or ROI features

## User Stories

### User stories

1. As a user, I want to connect Dotly to external systems without creating duplicate or broken contact sync.

2. As a team admin, I want integration behavior to respect team-owned relationship semantics.

3. As a user, I want to know what data is synced and whether the sync succeeded.

4. As a user, I want exported or synced contacts to preserve useful source context.

### Platform stories

1. As the platform, I need a reusable integration contract so each connector does not reinvent mapping rules.

2. As the platform, I need external identity mapping that is compatible with canonical contact identity.

3. As the platform, I need sync semantics clear enough that revenue attribution later can trust the underlying relationship path.

## Integration Model

This sprint should define a generic integration connection model.

Recommended concepts:

- integration provider
- connection owner
- team context if applicable
- sync direction
- sync status
- object mapping support

Recommended initial sync directions:

- `EXPORT_ONLY`
- `IMPORT_ONLY`
- `BIDIRECTIONAL`

Recommendation for V1:

- support the model broadly
- keep actual early integrations conservative, often `EXPORT_ONLY` first unless strong existing support exists

## Mapping Model

This sprint should define how Dotly records map to external objects.

Recommended mapping concepts:

- canonical contact id
- external provider id
- provider object type
- last sync timestamp
- sync status

Recommendation:

- preserve explicit mapping rows or metadata
- avoid fuzzy external matching without strong deterministic identifiers

## Supported Target Strategy

This sprint should not ship every integration deeply, but it should define the first practical targets.

Recommended first-wave priorities:

- Google Contacts
- HubSpot
- Slack notifications or workflow hooks
- webhooks for generic downstream automation

Later targets:

- Salesforce
- Outlook/Microsoft ecosystem
- richer calendar or CRM sync variants

## Functional Requirements

### FR1 - Integration connection model

The system must support a durable record of an external integration connection.

### FR2 - Provider-aware configuration

The system must support provider-specific configuration while preserving a common integration contract.

### FR3 - Contact mapping foundation

The system must be able to link a canonical Dotly contact to an external provider record safely.

### FR4 - Ownership-aware sync rules

If a contact is team-visible or team-owned, the sync semantics must respect the current owner and team context.

### FR5 - Sync status visibility

The system must expose sync state clearly.

Examples:

- connected
- sync pending
- last synced
- failed

### FR6 - Export semantics

When exporting or syncing contacts, the payload should preserve useful relationship context.

Examples:

- source context
- ownership context
- latest meaningful activity cues where appropriate

### FR7 - No duplicate external push drift

The system must avoid repeatedly pushing the same contact as a new external record when a mapping already exists.

### FR8 - Canonical-contact compatibility

External sync must always prefer the canonical contact identity after merge.

### FR9 - Authorization and admin control

Only authorized users should be able to create or manage integration connections.

### FR10 - Team compatibility

Team-owned relationship semantics must remain valid when integration connections are scoped to team or admin users.

### FR11 - Webhook-ready event foundation

The integration system should be ready to emit clean events or payloads for external workflow systems later.

### FR12 - Future ROI compatibility

The mapping and sync layer must support later attribution and outcome reporting without obscuring source identity.

## Backend Scope

The backend scope for this sprint is the connection, mapping, and sync contract layer.

### Data model scope

Potential additions:

- `IntegrationConnection`
- `ExternalContactMapping`

Suggested fields for connection:

- `id`
- `provider`
- `ownerUserId`
- `teamId`
- `status`
- `syncDirection`
- `configMetadata`
- `createdAt`
- `updatedAt`

Suggested fields for mapping:

- `id`
- `provider`
- `contactId`
- `externalObjectId`
- `objectType`
- `lastSyncedAt`
- `syncStatus`

### Service-layer scope

Recommended backend work:

- manage integration connections
- resolve sync eligibility for canonical contacts
- create or update external mappings safely
- expose sync state and errors in a usable form

### API scope

Recommended endpoints:

- `GET /integrations`
- `POST /integrations/:provider/connect`
- `DELETE /integrations/:id`
- `GET /integrations/:id/status`

Optional mapping/status endpoints if needed:

- `GET /contacts/:id/integrations`

### Validation scope

- only authorized users can connect providers
- mapping must prefer canonical contact identity
- external object ids must not collide incorrectly
- sync ownership must respect team and owner context

### Backend test scope

- connection lifecycle tests
- canonical-contact mapping tests
- duplicate external mapping prevention tests
- authorization tests
- team-scoped integration behavior tests

## Frontend Scope

The frontend scope for this sprint is the integration readiness surface.

### Integration settings UX

Recommended sections:

- connected providers
- available providers
- sync status
- last sync info

### Contact-level integration visibility

Recommended additions:

- contact sync status when relevant
- external mapping presence

### Team/admin UX

If team context exists, the UI should make it clear whether:

- the integration is personal
- the integration is team-scoped

### Frontend technical scope

- reuse current settings/navigation surfaces
- avoid overbuilding provider-specific management screens in the first sprint

### Frontend test scope

- connection list render
- connected/disconnected states
- contact sync-state visibility
- team vs personal scope visibility

## Sync Strategy

Recommended V1 sync strategy:

- define the full connection and mapping model now
- keep early real sync behavior conservative
- prefer export or explicit push for early providers unless existing connector maturity is strong

This reduces the risk of bad bidirectional data loops.

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- mapping correctness
- canonical-contact compatibility
- duplicate sync prevention
- authorization and team scoping
- status visibility and failure transparency

### Audit checklist

- can a merged canonical contact still sync correctly?
- can duplicate external records be created too easily?
- can unauthorized users manage integrations or mappings?
- does team-scoped sync leak or misassign ownership?
- is sync failure visible enough to debug operationally?

## Fix Scope

Any issues found during audit that affect mapping safety, ownership semantics, authorization, or sync integrity must be fixed inside this sprint.

Must-fix categories:

- canonical-contact mapping bugs
- duplicate external mapping bugs
- team-scope or ownership drift
- authorization gaps
- misleading sync status visibility

Can-defer categories only with explicit note:

- provider-specific advanced field mapping
- non-blocking integration UI polish
- optional bulk sync controls
- lower-priority providers

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- integration model remains trustworthy
- canonical-contact mapping remains stable
- team and owner semantics remain correct
- the next ROI sprint can build on a clean sync foundation

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- integration connection model exists
- external mapping foundation exists
- canonical-contact sync semantics are correct
- team and ownership-aware sync rules are clear
- sync state is visible and understandable
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for connection, mapping, dedupe, and authorization pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `013-p04-04C-attribution-and-roi-foundation.md` when:

- external-system mapping is stable
- ownership and sync semantics are trustworthy
- attribution work can now reason about relationships that cross Dotly and external systems

This sprint must not hand off as ready if:

- integration mapping is still ambiguous
- duplicate sync drift is unresolved
- team-owned sync semantics remain unclear

### What may continue in the next sprint

- attribution model
- source-to-outcome reporting
- ROI foundations across cards, inbox, meetings, and CRM

### What must not be pushed carelessly to the next sprint

- unresolved canonical-contact mapping issues
- unresolved duplicate external record risk
- unresolved team ownership sync ambiguity

## Dependencies

Technical dependencies:

- team-aware ownership model
- canonical contact identity and merge behavior
- current settings and integration-related infra patterns

Product dependencies:

- agreement on initial first-wave providers
- agreement on export-first vs bidirectional scope for early connectors

## Non-Goals

- many deep provider implementations
- advanced external field mapping UI
- full marketplace of connectors
- outbound workflow orchestration

## Risks

### Risk 1 - Duplicate external records

If sync mapping is weak, integrations will create noisy duplicates and quickly lose trust.

Mitigation:

- preserve explicit external mapping to canonical contacts

### Risk 2 - Ownership drift across sync

If team and owner semantics are not preserved, external data can misrepresent who owns the relationship.

Mitigation:

- keep owner and team context explicit in sync rules

### Risk 3 - Premature bidirectional complexity

If V1 tries to deeply synchronize many systems both ways, quality will degrade.

Mitigation:

- start with a conservative connection and mapping foundation

### Risk 4 - Invisible sync failure

If sync errors are not visible, users will assume data is current when it is not.

Mitigation:

- expose status and failure state clearly

## Open Questions

1. Which providers should be considered true first-wave native integrations for implementation after this foundation sprint?

2. Should team integrations always be admin-managed, or can individual members connect personal integrations in team contexts?

3. Do we need contact-level sync controls in V1, or is connection-level management enough?

4. Should webhooks be treated as a first-class integration provider in the same model, or as a separate platform event layer?

## Recommended Implementation Notes

- Build one reusable connection and mapping model.
- Prefer canonical-contact mapping everywhere.
- Be conservative with sync direction at first.
- Keep ownership semantics explicit.
- Treat this sprint as the integration contract layer before outcome reporting deepens.

## Acceptance Criteria

1. Dotly has a native integrations foundation with reusable connection and mapping semantics.

2. Canonical contacts can be mapped externally without obvious duplicate sync drift.

3. Team and ownership context are preserved clearly in integration behavior.

4. The platform is ready for attribution and ROI work in the next sprint.

## Definition Of Done

This sprint is complete when:

- integration connection model exists
- external mapping model exists
- sync state visibility exists
- audit, fix, and re-audit are completed
- documentation clearly explains how attribution and ROI build on this integration foundation next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy integration and mapping foundations

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat native integration foundations as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Integration connection and mapping semantics are now stable
- Canonical contacts and ownership rules survive sync cleanly
- Attribution and ROI work can now build on a trustworthy external mapping layer

Deferred:

- Optional richer field mapping controls
- Optional deeper first-wave provider implementations
```
