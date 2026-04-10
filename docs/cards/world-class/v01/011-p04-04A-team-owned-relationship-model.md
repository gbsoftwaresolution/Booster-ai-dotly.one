# World Class Cards V01 - 011 - P04 - 04A - Team-Owned Relationship Model

## Objective

Introduce a team-owned relationship model so contacts, follow-up work, and relationship context can belong to a business workflow rather than only to an individual user.

This sprint builds on the relationship, follow-up, inbox, and meeting-conversion foundations by adding:

- explicit team-aware relationship ownership
- contact ownership and assignment rules
- shared visibility boundaries for relationship records
- ownership transfer and continuity groundwork
- team-safe relationship access patterns

At the end of this sprint, Dotly should support the idea that a relationship can belong to a team while still preserving clear ownership and accountability.

## Problem

The repo already has meaningful team groundwork:

- teams
- team members and roles
- brand lock
- shared team card contexts

But relationship handling is still largely person-centric.

Without a team-owned relationship model:

- contacts are harder to manage collaboratively
- a relationship may effectively disappear when one rep stops working it
- inbox and follow-up routing remain constrained to individual workflows
- later integrations and ROI views lack stable business ownership context
- handoff and continuity across team members remain weak

The platform needs a relationship ownership layer that answers:

- who currently owns this relationship?
- which team can access it?
- what is shared team context versus personal context?
- how can a relationship continue when responsibility changes?

## Product Intent

This sprint should make Dotly feel like a real business relationship system, not only a personal card CRM.

The product promise is:

- a relationship can outlive one rep
- ownership is explicit
- team access is controlled
- follow-up and CRM work can operate in a team context without corrupting personal accountability

This sprint is not trying to become full enterprise account management. It is building the first safe team relationship layer.

## Sprint Scope

In scope:

- team-aware relationship ownership model
- contact owner vs team visibility model
- ownership transfer groundwork
- shared relationship access rules
- team-scoped relationship summary compatibility
- assignment-compatible workflow foundations
- relationship continuity when ownership changes

Out of scope:

- full account-based CRM
- multi-team cross-org ownership sharing
- complex territory routing
- commission or quota logic
- enterprise account hierarchy

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

The sprint is not complete just because a contact has an owner field. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind unclear ownership semantics, access leakage, or relationship continuity gaps that block integrations and ROI work, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must keep `team visibility`, `relationship ownership`, and `task assignment` separate.

That means:

- a team may be allowed to see a relationship
- one person may still own the relationship operationally
- tasks and follow-up actions may be assigned independently

Examples:

- a team can share visibility into a contact while one rep remains owner
- ownership transfer does not mean every past task or note should silently change author identity
- an assigned follow-up action is not the same as long-term relationship ownership

If these concepts are merged together, team workflows will become confusing and error-prone.

## User Roles In This Sprint

Primary roles:

- Team owner or admin
  - needs stable team-level control over relationship access

- Team member or rep
  - needs clear visibility into owned and shared relationships

- Individual user not in a team
  - should retain current personal workflow semantics without regression

- Platform
  - needs clean ownership semantics before integrations and ROI layers deepen

## User Stories

### User stories

1. As a team user, I want a relationship to belong to the team while still having a clear current owner.

2. As a team admin, I want to prevent relationship loss when a rep leaves or hands work off.

3. As a rep, I want to know which relationships I own and which are only visible to me through team access.

4. As an individual user, I want my existing personal contact workflow to keep working when no team context exists.

### Platform stories

1. As the platform, I need contact ownership and team visibility to be explicit and enforceable.

2. As the platform, I need ownership change to preserve relationship continuity.

3. As the platform, I need later integrations and ROI work to attach to stable team-aware ownership semantics.

## Relationship Ownership Model

This sprint should define the first version of team-aware relationship ownership.

Recommended concepts:

- `ownerUserId`
- `teamId` if the relationship belongs to a team context
- `visibilityScope`
  - personal
  - team-visible

Recommendation for V1:

- keep one primary owner per relationship
- allow team-scoped visibility where the team model already exists
- avoid introducing co-ownership or pooled ownership yet

## Visibility Model

Recommended visibility states:

- `PERSONAL_ONLY`
- `TEAM_VISIBLE`

Meaning:

- `PERSONAL_ONLY`
  - only owner can access the relationship under normal rules

- `TEAM_VISIBLE`
  - relationship is visible to authorized team members according to team access rules
  - one primary owner still exists

Recommendation:

- if a contact belongs to no team, personal-only remains the natural default

## Ownership Transfer Model

This sprint should define safe ownership transfer.

Recommended V1 rule:

- owner can be reassigned intentionally
- transfer preserves contact identity, timeline, inbox linkage, and CRM history
- transfer should be auditable

This is not yet full offboarding automation, but the model should support it later.

## Functional Requirements

### FR1 - Team-aware contact ownership

The contact model and CRM surfaces must support a primary owner and optional team context.

### FR2 - Team visibility support

Relationships can be explicitly marked as team-visible when a valid team context exists.

### FR3 - Owner clarity in UI

Contact and CRM surfaces must clearly show who owns the relationship.

### FR4 - Ownership transfer

Authorized users must be able to transfer ownership of a relationship.

### FR5 - Relationship continuity across transfer

Transfer must preserve:

- timeline
- notes
- tasks
- deals
- inbox linkage
- booking linkage

Recommendation:

- author identity on past notes/tasks must remain historical truth
- operational owner can still change going forward

### FR6 - Team access control

Only authorized team members should be able to view team-visible relationships.

### FR7 - Personal workflow compatibility

Users without a team must continue to operate normally without unnecessary team complexity.

### FR8 - Task and workflow compatibility

Relationship ownership must work cleanly with existing task assignment and follow-up automation models.

### FR9 - Merge compatibility

Canonical contact identity and merge behavior must remain safe when team ownership exists.

### FR10 - Timeline and audit compatibility

Ownership transfer should be visible in audit history or relationship timeline where appropriate.

### FR11 - Future integration compatibility

The model must support later native integrations and external sync rules without redefining who owns a relationship.

### FR12 - Future ROI compatibility

The model must allow later attribution and performance reporting by team and owner.

## Backend Scope

The backend scope for this sprint is relationship ownership, team visibility, and transfer logic.

### Data model scope

Potential additions or clarifications:

- contact `ownerUserId`
- contact `teamId`
- contact `visibilityScope`

Recommendation:

- reuse current team models already in the repo
- add only the minimum contact-level fields needed for team-aware ownership

### Service-layer scope

Recommended backend work:

- enforce owner and team visibility rules
- support ownership transfer
- ensure related workflow and relationship records stay intact
- expose team-aware relationship summaries where useful

### API scope

Potential endpoints or mutations:

- update contact ownership
- update visibility scope
- fetch team-visible contacts according to access rules

Recommendation:

- extend existing contact endpoints if possible instead of creating a parallel ownership API surface

### Validation scope

- team context must be valid
- only authorized users can transfer ownership
- visibility scope must respect team membership
- ownership transfer must not orphan relationship records

### Backend test scope

- team visibility access tests
- ownership transfer tests
- canonical-contact compatibility tests
- personal-only contact regression tests
- workflow continuity after transfer tests

## Frontend Scope

The frontend scope for this sprint is the team-aware relationship experience.

### Contact detail UX

Recommended additions:

- owner display
- team visibility label if applicable
- transfer ownership action for authorized users

### CRM list UX

Recommended signals:

- owner
- shared/team-visible indicator
- filter by owner where useful

### Ownership transfer UX

Recommended flow:

1. authorized user opens contact
2. chooses `Transfer owner`
3. selects valid new owner
4. confirms transfer
5. sees updated ownership state

### Frontend technical scope

- reuse current team and contact surfaces
- avoid building a large admin console in the first version
- keep ownership controls explicit and role-gated

### Frontend test scope

- owner visibility rendering
- team-visible state rendering
- ownership transfer flow
- unauthorized user denial states
- personal workflow regression states

## Team Continuity Strategy

Recommended V1 continuity strategy:

- relationship belongs to one owner
- team can gain visibility when enabled
- transfer is explicit
- history stays intact

This is strong enough to support later team workflows without overcomplicating the first version.

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- access control correctness
- ownership transfer correctness
- personal workflow non-regression
- continuity of linked relationship records
- team visibility boundaries

### Audit checklist

- can unauthorized team members see team-visible relationships they should not access?
- can non-team users access team-owned records incorrectly?
- does ownership transfer preserve linked relationship history and workflows?
- does transfer incorrectly rewrite historical authorship?
- do personal-only contacts still behave correctly for solo users?

## Fix Scope

Any issues found during audit that affect ownership integrity, team access boundaries, continuity, or personal-workflow compatibility must be fixed inside this sprint.

Must-fix categories:

- access leakage across team boundaries
- broken ownership transfer
- orphaned or mislinked relationship records after transfer
- solo-user regression
- misleading ownership/visibility UX

Can-defer categories only with explicit note:

- advanced owner filtering
- richer transfer history UX
- non-blocking layout polish
- more advanced pooled ownership concepts

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- ownership model remains understandable and safe
- team visibility remains bounded correctly
- transfer preserves relationship continuity
- the next integrations sprint can build on a stable ownership layer

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- relationships can have explicit owner and team context
- team visibility rules are enforced correctly
- ownership transfer works safely
- relationship continuity is preserved through ownership changes
- solo-user behavior remains stable
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for access, transfer, continuity, and regression pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `012-p04-04B-native-integrations-foundation.md` when:

- relationship ownership is stable enough for sync and integration mapping
- team visibility and continuity are trustworthy
- external system mapping can build on clear owner/team semantics

This sprint must not hand off as ready if:

- ownership semantics are still ambiguous
- team access leakage remains possible
- transfer continuity is unreliable

### What may continue in the next sprint

- integration contracts
- sync ownership rules
- external contact mapping
- webhook and connector foundations

### What must not be pushed carelessly to the next sprint

- unresolved ownership ambiguity
- unresolved access-boundary issues
- unresolved continuity problems after transfer

## Dependencies

Technical dependencies:

- existing team models and access rules
- Relationship OS, Follow-Up Intelligence, and Inbound Conversion foundations

Product dependencies:

- agreement on personal-only vs team-visible semantics
- agreement on who can transfer ownership in V1

## Non-Goals

- account-based CRM
- pooled ownership
- territory models
- offboarding automation

## Risks

### Risk 1 - Ownership confusion

If team visibility and ownership are not clearly separated, users will not trust who is responsible for a relationship.

Mitigation:

- keep one primary owner and explicit visibility state

### Risk 2 - Team data leakage

If visibility rules are too broad, sensitive relationship context may leak across team members.

Mitigation:

- enforce strict access checks tied to team membership and visibility scope

### Risk 3 - Broken continuity after transfer

If transferring ownership disrupts linked tasks, inbox items, or CRM state, the relationship system becomes fragile.

Mitigation:

- treat continuity as a first-class transfer requirement

### Risk 4 - Solo-user regression

If team-aware ownership complicates personal workflows unnecessarily, existing users will feel the product got worse.

Mitigation:

- keep personal-only as a simple default for non-team users

## Open Questions

1. Should team-visible contacts default to owner plus admins only, or broader authorized team visibility?

2. Should ownership transfer create a visible relationship timeline event in V1, or only audit metadata?

3. Should lead source attribution stay tied to original owner, current owner, or both when ownership changes later?

4. Do we need a distinct `team-owned` state, or is `owner + teamId + visibilityScope` enough for V1?

## Recommended Implementation Notes

- Prefer explicit ownership over inferred team control.
- Keep solo-user behavior simple.
- Reuse existing team models rather than inventing parallel access concepts.
- Preserve historical truth while updating operational ownership.
- Treat this sprint as the ownership foundation for integrations and ROI.

## Acceptance Criteria

1. Relationships can belong to a team context while preserving a primary owner.

2. Team visibility and access rules are enforced clearly.

3. Ownership transfer preserves relationship continuity safely.

4. The ownership model is strong enough for integrations and revenue attribution in the next sprints.

## Definition Of Done

This sprint is complete when:

- team-aware ownership model exists
- ownership transfer exists
- team visibility controls exist
- audit, fix, and re-audit are completed
- documentation clearly explains how integrations build on this ownership model next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy team-owned relationship semantics

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat team-owned relationship semantics as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Relationships can now belong to a team context without losing clear ownership
- Transfer and visibility semantics are trustworthy
- Integrations and ROI work can now build on a stable ownership layer

Deferred:

- Optional advanced ownership filtering
- Optional richer transfer history UX
```
