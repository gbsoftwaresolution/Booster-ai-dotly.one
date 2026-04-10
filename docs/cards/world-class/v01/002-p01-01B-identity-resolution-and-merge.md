# World Class Cards V01 - 002 - P01 - 01B - Identity Resolution And Merge

## Objective

Introduce a safe identity-resolution and merge system so Dotly can recognize when multiple records likely represent the same person and unify them without losing relationship history.

This sprint builds on the timeline foundation from `001-p01-01A-relationship-timeline-foundation.md` by adding:

- duplicate-detection rules
- identity confidence model
- merge preview and merge execution behavior
- preservation of relationship timeline and CRM context across merges
- safer contact unification workflows for users and teams

At the end of this sprint, Dotly should be able to move from fragmented contact records toward one reliable person record per real-world relationship.

## Problem

The product already has multiple ways the same person can enter the system:

- lead capture
- contact import
- event exchange
- inbox message
- voice note or file submission
- booking request
- manual contact creation
- CRM updates

Without identity resolution and merge:

- the same person can appear multiple times in contacts
- timeline history becomes fragmented across records
- follow-up work becomes duplicated or misdirected
- CRM stages and tasks can end up attached to the wrong copy of a contact
- attribution and ROI later become less trustworthy

The platform needs a safe way to detect, review, and merge duplicate person records without destroying history or creating incorrect joins.

## Product Intent

This sprint should make Dotly feel like it recognizes people, not just records.

The product promise is:

- suspected duplicates are surfaced clearly
- merges are safe, reviewable, and reversible in principle even if not fully undoable in V1
- unified records preserve the full relationship timeline
- future follow-up, CRM, and ROI features can depend on cleaner identity

This sprint is not trying to create a perfect identity graph for every edge case. It is creating a conservative and trustworthy merge system.

## Sprint Scope

In scope:

- duplicate detection heuristics
- identity confidence model
- merge preview contract
- manual merge execution workflow
- preservation of timeline, notes, tasks, deals, bookings, and inbox references
- canonical-contact selection rules
- merge audit trail
- contact detail integration for suspected duplicates

Out of scope:

- fully automatic merges without review
- advanced household or company-level identity graphs
- cross-account global identity resolution
- fuzzy enrichment across external providers beyond current repo capabilities
- large-scale import cleanup tools beyond the core merge workflow

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

The sprint is not complete just because duplicates can be detected. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind known false-merge risk, history-loss risk, or orphaned-reference risk that blocks safe CRM and follow-up work, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must treat `duplicate detection` and `merge execution` as separate concerns.

That means:

- the system may suspect two records are the same person
- the system may show a confidence score or rationale
- but merge execution should remain explicit and reviewable in V1

Examples:

- matching email is a strong signal, but not always enough for blind automatic merge
- similar name and same company is a hint, not proof
- a merge should preserve linked timeline events rather than recreating them roughly after the fact

If detection and merge are coupled too aggressively, the platform risks corrupting the relationship layer.

## User Roles In This Sprint

Primary roles:

- Individual user managing contacts
  - wants duplicate contacts reduced without losing history

- Team member using CRM
  - wants a clean person record for follow-up and ownership

- Platform
  - needs stable identity linkage before deeper follow-up, ROI, and integration work

## User Stories

### User stories

1. As a user, I want Dotly to show me likely duplicate contacts so I can clean up my CRM safely.

2. As a user, I want to preview what will happen before I merge two records.

3. As a user, I want the merged contact to keep notes, tasks, bookings, inbox items, timeline history, and event context.

4. As a user, I want merge behavior to be conservative enough that I do not lose trust in my data.

### Platform stories

1. As the platform, I need duplicate heuristics that are useful but not reckless.

2. As the platform, I need merge execution to preserve referential integrity across related models.

3. As the platform, I need canonical identity after merge so later CRM and attribution logic can build on cleaner records.

## Identity Resolution Model

This sprint should define a duplicate-detection model that is explainable and conservative.

Recommended signals:

- exact normalized email match
- exact normalized phone match
- same signed-in user linkage if available
- strong name + company match
- strong event or booking overlap only as supporting evidence

Recommendation for V1:

- prioritize deterministic and high-confidence signals first
- avoid broad fuzzy matching that creates excessive false positives

## Confidence Model

Duplicate detection should expose confidence or rationale.

Two acceptable approaches:

1. score-based confidence
2. reason-based match categories

Recommendation for V1:

- use reason-based categories with optional internal score

Example categories:

- `EXACT_EMAIL_MATCH`
- `EXACT_PHONE_MATCH`
- `USER_LINK_MATCH`
- `STRONG_PROFILE_MATCH`

This is easier to explain to users and safer to audit.

## Merge Model

A merge should unify two or more contact records into one canonical record.

Recommended V1 rule:

- select one canonical contact
- reassign linked child data from duplicate contact to canonical contact
- archive or mark duplicate contact as merged, not hard-delete immediately if avoidable

Important rule:

- merge must preserve history and references
- merge must not flatten or lose meaningful provenance silently

## Canonical Contact Selection

This sprint must define how the surviving contact is chosen.

Recommended selection order:

1. user-selected primary record in merge preview
2. if user does not choose, use deterministic default such as:
   - contact with richer data
   - contact with existing CRM ownership or deal linkage
   - oldest stable contact record

Recommendation:

- let the user choose the primary contact in V1 UI
- keep a deterministic fallback for backend safety

## Functional Requirements

### FR1 - Duplicate detection query

The system must be able to identify likely duplicate contacts.

This may be exposed as:

- contact-level `possible duplicates`
- list-level duplicate review queue

### FR2 - Duplicate rationale

The system must expose why two records were considered a match.

Examples:

- same email
- same phone
- likely same person based on profile overlap

### FR3 - Merge preview

Before merge execution, the UI must show:

- both records
- key fields on each side
- detected match reasons
- which record will remain primary
- what data and activity will be preserved

### FR4 - Manual merge execution

User can merge a duplicate into a canonical contact.

V1 recommendation:

- no blind automatic merge
- explicit user action required

### FR5 - Timeline preservation

All timeline events tied to the merged contact records must remain visible on the canonical record after merge.

### FR6 - Child data reassignment

Merge execution must preserve and reassign linked records where applicable.

Minimum review targets:

- notes
- tasks
- deals or CRM stage state
- inbox items
- bookings
- event exchanges when later applicable
- tags

### FR7 - Source attribution preservation

Merged records must preserve source attribution. Merge should not make the contact appear as if it originated from only one surface.

### FR8 - Merge audit trail

The system must record:

- who merged
- when merge happened
- which records were involved
- which contact became canonical

### FR9 - Duplicate contact state after merge

Merged-away contact should not continue acting like an active independent person record.

Recommendation:

- mark as merged or archived
- retain minimal auditability

### FR10 - Access control

Only authorized users should be allowed to merge contacts they have access to.

### FR11 - Safe conflict handling

If both records contain different values for important fields, the merge preview should make that visible.

Recommendation:

- user chooses primary values in a simple V1 merge flow, or canonical record wins with visible warning

### FR12 - Future compatibility

The merge model must support later:

- team ownership
- integrations
- attribution
- Event Radar participant linkage

without forcing a redesign.

## Backend Scope

The backend scope for this sprint is duplicate detection, merge execution, and relationship-preserving reassignment.

### Database and model scope

Potential additions:

- `mergedIntoContactId` on `Contact`
- merge audit model or merge audit metadata
- optional duplicate match metadata model if a durable review queue is required

Recommendation for V1:

- prefer minimal schema additions unless a durable duplicate review queue clearly needs a table

### API and service scope

Recommended endpoints:

- `GET /contacts/:id/duplicates`
- `POST /contacts/:id/merge`

Optional later:

- `GET /contacts/duplicates`

### Service responsibilities

- compute likely duplicates
- expose match reasons
- execute merge safely in a transaction
- reassign linked child records to canonical contact
- mark merged contact as inactive or merged
- preserve timeline linkage and audit trail

### Merge transaction requirements

Merge execution should be transactional wherever possible.

The system must avoid a partial merge where:

- timeline moved but tasks did not
- bookings moved but deals did not
- one record is marked merged but related data still points to it

### Backend test scope

- duplicate detection by email/phone
- merge preview correctness
- merge execution transaction safety
- child-record reassignment tests
- timeline preservation tests
- authorization tests for merge actions
- merged-contact post-state tests

## Frontend Scope

The frontend scope for this sprint is duplicate review and merge UX.

### Contact detail UX

Recommended addition:

- `Possible duplicates` section or banner on contact detail page

### Duplicate review UX

Recommended fields in review UI:

- name
- email
- phone
- company
- source summary
- last activity
- match reason

### Merge preview UX

The preview should show:

- primary contact
- duplicate contact
- field differences
- what history will be preserved
- merge confirmation action

### Merge safety UX

The UX should be explicit and cautious.

Examples:

- `This will combine both records into one contact.`
- `Timeline, notes, tasks, and linked activity will be preserved on the selected primary contact.`

### Frontend technical scope

- reuse contact detail surfaces where possible
- avoid building a giant contact cleanup console in V1
- make merge preview understandable rather than overly configurable

### Frontend test scope

- duplicate banner/list rendering
- merge preview rendering
- primary-record selection behavior
- merge success UI
- merged-contact redirect or post-merge state handling

## Merge Semantics

Recommended V1 merge behavior:

- user initiates merge from a contact
- user reviews duplicate candidate
- user chooses canonical contact if needed
- system executes transactional merge
- duplicate record is marked merged
- user lands on canonical contact with combined history

This is enough for V1 without adding full undo or conflict-resolution workflows.

## Conflict Resolution Strategy

This sprint must decide how conflicting field values are handled.

Recommended V1 approach:

- canonical record keeps its values by default
- duplicate values are shown in preview
- user can optionally choose canonical source if that is easy to implement cleanly

Do not overbuild per-field merge editors if that slows the core merge safety work.

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- false-merge risk
- transaction safety
- child data reassignment completeness
- timeline preservation
- authorization for merge actions
- user clarity in merge preview

### Audit checklist

- can two unrelated contacts be matched too aggressively?
- can merge execution lose notes, tasks, or timeline events?
- can merge leave orphaned child records?
- can unauthorized users merge contacts they should not control?
- does the UI make the primary record and merge outcome clear enough?
- does the merged-away contact still behave as active in any surface?

## Fix Scope

Any issues found during audit that affect identity correctness, data preservation, transaction safety, or authorization must be fixed inside this sprint.

Must-fix categories:

- aggressive false-positive matching
- partial merge behavior
- lost timeline or child data
- orphaned relationships
- broken authorization
- misleading merge preview

Can-defer categories only with explicit note:

- advanced duplicate queues
- optional fuzzy-matching expansion
- non-blocking visual polish
- undo or restore workflows beyond V1 scope

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- detection remains useful but conservative
- merge remains transactional and safe
- merged contact retains combined relationship history
- authorization remains correct
- next CRM hardening sprint can rely on cleaner contact identity

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- likely duplicates can be identified with explainable reasons
- merge preview exists and is understandable
- merge execution is transactional and safe
- timeline and key related records are preserved on the canonical contact
- merged-away records no longer behave as active duplicates
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for detection, merge safety, reassignment, and authorization pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `003-p01-01C-crm-workflow-hardening.md` when:

- contact identity is cleaner and more trustworthy
- merged contacts preserve their relationship history
- CRM workflows can operate on more reliable person records

This sprint must not hand off as ready if:

- merge still risks data loss
- identity detection is too noisy or too weak
- merged records continue causing duplicate workflow confusion

### What may continue in the next sprint

- CRM ownership and stage hardening
- richer task, note, and deal workflow alignment
- stronger source-aware CRM behavior

### What must not be pushed carelessly to the next sprint

- unresolved false-merge risk
- unresolved timeline-loss risk
- unresolved orphaned-reference behavior

## Dependencies

Technical dependencies:

- Sprint 001 timeline foundation
- existing contacts, tasks, deals, notes, inbox, and scheduling models

Product dependencies:

- agreement on conservative duplicate heuristics
- agreement on whether merged-away contacts are archived or hard-hidden

## Non-Goals

- blind automatic merging
- fuzzy global identity graph
- cross-workspace identity linking
- advanced undo stack for merges

## Risks

### Risk 1 - False merge

If unrelated contacts are merged, user trust will drop sharply.

Mitigation:

- keep V1 conservative and review-based

### Risk 2 - Partial merge corruption

If merge reassigns some relationships but not others, data quality becomes worse than before.

Mitigation:

- execute merge transactionally and test child-record coverage carefully

### Risk 3 - Timeline fragmentation after merge

If the merge moves CRM fields but not relationship history, the contact still feels broken.

Mitigation:

- treat timeline preservation as a first-class merge requirement

### Risk 4 - Too much merge configurability too early

If V1 tries to solve every merge conflict interactively, delivery slows and the UX becomes heavy.

Mitigation:

- keep merge preview clear, with limited but high-value control

## Open Questions

1. Should merged-away contacts remain visible in a historical/audit form, or disappear from normal contact lists entirely?

2. Should V1 allow user selection of field winners during merge, or keep canonical-contact-wins as the default rule?

3. Do we need a durable duplicate-review queue table now, or is on-demand duplicate detection enough for V1?

4. Should merge audit be shown in the relationship timeline itself, or only stored for admin/debug purposes?

## Recommended Implementation Notes

- Start with deterministic duplicate signals.
- Keep merge explicit and user-reviewed.
- Preserve timeline and child relationships transactionally.
- Avoid building broad fuzzy identity resolution too early.
- Treat this sprint as the trust foundation for all later CRM and attribution work.

## Acceptance Criteria

1. Likely duplicate contacts can be identified with understandable match reasons.

2. Users can preview and confirm merges safely.

3. Merged contacts retain combined relationship history and linked operational data.

4. The contact identity layer is clean enough for CRM hardening in the next sprint.

## Definition Of Done

This sprint is complete when:

- duplicate detection exists
- merge preview exists
- merge execution exists and preserves key linked data
- merge audit exists
- audit, fix, and re-audit are completed
- documentation clearly explains how CRM workflow hardening will build on cleaner identity next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy identity resolution and merge behavior

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat merged contact identity as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Duplicate detection is conservative and explainable
- Merges preserve relationship history and linked workflow data
- CRM workflow hardening can now build on cleaner contact identity

Deferred:

- Optional advanced duplicate queues
- Optional richer field-by-field conflict resolution
```
