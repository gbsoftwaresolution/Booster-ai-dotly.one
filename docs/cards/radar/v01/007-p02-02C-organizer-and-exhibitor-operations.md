# Event Radar V01 - 007 - P02 - 02C - Organizer And Exhibitor Operations

## Objective

Add the operational tooling that organizers and exhibitors need to run an event day-to-day once events, nodes, exchanges, registrations, and participant networking already exist.

This sprint adds:

- organizer operational dashboard controls
- exhibitor and stall staffing model
- participant lifecycle management tools
- stall ownership and staffing assignment
- operational views for event and stall teams
- role-aware access to Event Radar surfaces
- event readiness and event-state management utilities

At the end of this sprint, Event Radar should no longer feel like a collection of separate features. It should feel like an operating surface that organizers and exhibitors can actually use to manage an event and its people.

## Problem

After Sprint 006, Event Radar has:

- events
- event nodes and stalls
- QR entry flows
- consented exchanges
- reporting
- registrations
- participant directory and mutual networking

But it still lacks the operational controls needed to manage real events reliably.

Without organizer and exhibitor operations:

- organizers cannot manage event participants at scale from one place
- exhibitors cannot clearly manage which staff belong to which stall
- stall activity and staffing responsibility remain vague
- participant roles exist, but operational assignment is weak
- future pass and check-in flows would have no dependable operational ownership model

The platform needs an operations layer that answers:

- who manages the event
- who manages each stall
- who is assigned to work a stall
- who can view or act on stall data
- which participants are operationally ready for the next phase

## Product Intent

This sprint should make Event Radar feel like a usable event operations workspace.

The product promise is:

- organizers can run the event from one operational surface
- exhibitors can manage their own stall footprint within organizer-defined boundaries
- staffing, participant roles, and node ownership become explicit
- the system is prepared for event-day flows such as passes and check-in in Phase 3

This sprint is not yet the event-day scanning layer. It is the operational management layer that must exist before event-day scanning becomes safe and scalable.

## Sprint Scope

In scope:

- organizer operations dashboard surface
- exhibitor and stall operations surface
- stall staffing assignment
- organizer participant management actions beyond approval
- role-aware access control for event and stall operations
- event readiness indicators
- stall readiness indicators
- operational views for participant state and assignment state
- event-level and node-level ownership clarity

Out of scope:

- event pass issuance
- check-in scanning
- badge printing
- ticket tiers and payments
- live on-site scan queues
- session-level room operations
- automated staffing optimization

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

If a sprint leaves behind known ownership, staffing, authorization, or operational-state gaps that block dependable use of the sprint outcome, the work must not be treated as ready to continue to the next sprint.

If only non-blocking polish or deliberately deferred expansion remains, the sprint may be marked as safe to continue into the next sprint.

## Core Design Principle

This sprint must preserve clear separation among:

- event ownership
- participant role
- stall staffing assignment
- reporting access
- future scan permissions

These concepts overlap, but they are not the same.

Examples:

- an exhibitor can be assigned to a stall without being an event organizer
- a speaker can be an approved participant without any operational permissions
- a stall staff member can view stall operations without having full event administration rights
- organizer can manage readiness without exposing all event data to every participant

## User Roles In This Sprint

Primary active roles:

- Organizer
  - manages event operations
  - controls event settings, participants, nodes, and readiness
  - assigns exhibitor or staff permissions

- Exhibitor lead or stall owner
  - manages assigned stall or node
  - manages stall team membership where allowed
  - reviews stall-level exchanges and readiness

- Stall staff
  - can access assigned operational surfaces if authorized
  - may later become eligible for scan/check-in permissions in Phase 3

- Participant
  - may be assigned an event role but have no operational privileges

## User Stories

### Organizer stories

1. As an organizer, I want one operational view of event readiness so I know whether the event is prepared for live usage.

2. As an organizer, I want to assign participants to stalls and operational roles so responsibilities are clear.

3. As an organizer, I want to see which stalls are configured, staffed, and active so I can identify gaps before the event starts.

4. As an organizer, I want role-aware permissions so not every participant gets access to operational data.

### Exhibitor stories

1. As an exhibitor lead, I want to see the stall I am responsible for and who is assigned to it.

2. As an exhibitor lead, I want to add or manage stall staff if the organizer allows it.

3. As an exhibitor lead, I want to see whether my stall is operationally ready for event day.

### Platform stories

1. As the platform, I need an operational assignment model so pass and scan permissions can attach to real responsible users later.

2. As the platform, I need event and node access control to be explicit rather than inferred from loose role names.

## Operational Model

This sprint introduces the idea that an event has operational actors and each node or stall can also have its own responsible actors.

Recommended operational concepts:

- event managers
- stall owners
- stall staff assignments
- readiness state

Recommendation for V2:

- keep the model lightweight
- prefer assignments over complex org charts

## Stall Staffing Model

Each stall or event node should support optional assignment of participants to that node.

Recommended assignment roles:

- `STALL_OWNER`
- `STALL_STAFF`

These are operational roles inside the stall context, not replacements for event participant roles.

Examples:

- event participant role: `EXHIBITOR`
- node assignment role: `STALL_OWNER`

This allows one participant to be an exhibitor in the event and the owner of one specific stall.

## Event Readiness Model

The event operations surface should answer whether the event is ready for live use.

Recommended event readiness checks:

- event has required nodes configured
- main event node exists if required
- event registration settings are configured if registration is enabled
- directory/networking settings are in an intentional state
- required stalls have assigned cards
- required stalls have at least one responsible staff assignment where applicable

This sprint does not need a perfect readiness engine, but it should create a useful readiness summary.

## Stall Readiness Model

Each stall or node should have operational readiness indicators such as:

- active or inactive
- assigned card present
- QR generated
- owner assigned
- staff assigned optional

Recommendation:

- readiness can begin as derived status rather than a stored field
- only persist a dedicated readiness status later if operational complexity increases

## Functional Requirements

### FR1 - Organizer operations dashboard

An organizer can access an event operations dashboard that summarizes:

- participant counts by status
- node or stall counts by readiness
- directory enabled/disabled state
- registration mode
- unresolved operational gaps

### FR2 - Stall staffing assignment

An organizer can assign approved participants to a stall or node.

Minimum assignment actions:

- assign stall owner
- assign stall staff
- remove assignment

Rules:

- only approved participants can be assigned
- assignment must be scoped to the event and node

### FR3 - Exhibitor operational access

Assigned stall owners or authorized exhibitor users can access their stall operations view.

Minimum access:

- view assigned stall details
- view stall readiness
- view stall team
- view stall-level exchange/reporting surfaces already built in prior sprints

### FR4 - Organizer participant operations

Organizer can manage participant operational state beyond registration approval.

Examples:

- assign participant to stall
- change participant event role
- view operational assignments
- remove participant from stall operations

### FR5 - Role-aware access control

The system must enforce who can access:

- event operations dashboard
- stall operations dashboard
- assignment management actions

Minimum V2 rule:

- organizer: full event operations access
- assigned stall owner: scoped stall operations access
- assigned stall staff: limited scoped access if enabled
- ordinary participant: no operational access

### FR6 - Stall ownership visibility

For each stall, the system should clearly show:

- assigned owner
- assigned staff count
- assigned card
- readiness summary

### FR7 - Operational gaps view

Organizer should see a concise list of unresolved setup issues.

Examples:

- `Booth A has no assigned card`
- `Main event node not created`
- `Expo Hall B has no stall owner assigned`

### FR8 - Exhibitor team management policy

If the product supports exhibitor-managed staffing in V2, the organizer should be able to allow or disallow it.

Recommendation for V2:

- organizer remains the source of truth
- exhibitor lead may manage assigned stall staff only if explicitly allowed

### FR9 - Participant assignment detail

Organizer can view which stalls or nodes a participant is assigned to.

This is important for future pass and check-in permissions.

### FR10 - Event-state support

The operations dashboard should make event lifecycle state operationally clear.

Examples:

- draft
- active
- completed
- archived

If event is not active, operational messaging should reflect this.

### FR11 - Phase 3 readiness bridge

The operations data model must support later scan permissions and pass issuance by giving each operational actor a clear event and node context.

### FR12 - No overexposure of operations data

Participants without operational permissions must not see stall staffing, operational gaps, or event management controls.

## Backend Scope

The backend scope for this sprint is the operational assignment and access-control layer.

### Database

Recommended new model: `EventNodeAssignment`

Suggested fields:

- `id: String`
- `eventId: String`
- `eventNodeId: String`
- `registrationId: String`
- `role: EventNodeAssignmentRole`
- `createdAt: DateTime`
- `updatedAt: DateTime`

Recommended enum:

- `EventNodeAssignmentRole`
  - `STALL_OWNER`
  - `STALL_STAFF`

Potential small additions to `Event` settings:

- `exhibitorSelfManageStaff: Boolean`

Potential small additions to `EventRegistration` if needed:

- derived or linked operational status data should remain relational, not duplicated, where possible

### Index and constraints

- index on `eventId`
- index on `eventNodeId`
- index on `registrationId`
- composite unique guard if needed to avoid duplicate assignment rows for same registration and node role

### API module and service

Recommended endpoints:

- `GET /events/:id/operations`
- `GET /events/:id/nodes/:nodeId/operations`
- `POST /events/:id/nodes/:nodeId/assignments`
- `DELETE /events/:id/nodes/:nodeId/assignments/:assignmentId`
- `GET /events/:id/participants/:registrationId/assignments`

Optional:

- `PATCH /events/:id/operations/settings`

### Service responsibilities

- enforce organizer-only assignment creation unless delegated policy exists
- enforce event-scoped participant assignment validity
- compute event readiness summary
- compute node readiness summary
- resolve scoped operational access for stall owners and staff
- prevent unauthorized cross-event and cross-node operations access

### Validation rules

- participant must belong to the event
- participant must be approved before assignment
- node must belong to the event
- assignment role must be valid
- duplicate conflicting assignments should be rejected or handled predictably
- delegated exhibitor staffing actions must respect organizer policy

### Backend test scope

- organizer assignment creation tests
- approved-only assignment tests
- stall owner access tests
- ordinary participant denial tests
- cross-event assignment denial tests
- readiness summary computation tests
- delegated staffing policy tests if implemented

## Frontend Scope

The frontend scope for this sprint covers event operations and stall operations views.

### Organizer operations dashboard UX

Recommended sections:

- event readiness summary
- participant status breakdown
- stall readiness list
- operational gaps list
- assignment management shortcuts

### Stall operations list

Each stall row or card should show:

- stall name
- active status
- assigned card
- owner
- staff count
- QR state
- readiness state
- open stall operations action

### Assignment management UX

Recommended flow:

1. organizer opens stall operations
2. organizer clicks `Assign staff`
3. organizer selects approved participant
4. organizer chooses:
   - stall owner
   - stall staff
5. organizer confirms assignment

### Exhibitor operations UX

Assigned stall owners should see a scoped view with:

- stall details
- current staff
- recent exchanges and dashboard shortcut
- readiness summary
- staffing actions if permitted

### Participant operations detail UX

Organizer-side participant detail should show:

- event role
- registration status
- stall assignments
- assignment history if available
- readiness relevance for future passes/check-in

### Empty and warning states

Examples:

- `No stall staff assigned yet.`
- `This stall is missing an assigned card.`
- `You do not have access to event operations.`
- `This event is still in draft and not ready for live event-day usage.`

### Frontend technical scope

- reuse existing dashboard patterns
- avoid overbuilding drag-and-drop staffing or schedule boards in V2
- optimize for clarity and administrative efficiency

### Frontend test scope

- organizer operations dashboard render
- assignment create/remove flow
- stall owner scoped access
- unauthorized access states
- operational gap rendering

## Operational Access Strategy

Recommended V2 access rules:

- organizer can access all event operations
- stall owner can access assigned stall operations only
- stall staff may access only the limited surfaces explicitly allowed by organizer policy
- ordinary approved participant cannot access operations by default

This is the minimal safe rule set before Phase 3 introduces passes and scans.

## Readiness Strategy

Recommendation for V2:

- readiness should be derived, not manually set

Example event readiness categories:

- `Ready`
- `Needs setup`
- `Inactive event`

Example stall readiness categories:

- `Ready`
- `Missing card`
- `Missing owner`
- `Inactive`

The UI should explain why a readiness status exists.

## Reporting And CRM Impact

This sprint does not need a new reporting system, but operational assignments should become visible context inside existing reporting where useful.

Examples:

- stall report can show assigned owner
- organizer operations can identify which stalls have leads but no staff owner

This strengthens event accountability without reinventing analytics.

## Phase 3 Bridge

This sprint is the bridge into passes and check-in.

The key outputs Phase 3 depends on are:

- stable participant identity
- stable operational assignment per node
- clear operational permissions
- event and stall readiness logic

Later pass issuance can then answer:

- who gets a pass
- who gets a staff/exhibitor pass
- who can scan or manage entry

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- assignment authorization
- event and node scoping correctness
- stall-owner scoped access correctness
- ordinary participant denial correctness
- readiness truthfulness
- no leakage of operations data to unauthorized users

### Audit checklist

- can a non-organizer assign participants to stalls?
- can a participant be assigned to a node from another event?
- can an unapproved participant be assigned to a stall?
- can a stall owner access another stall's operations?
- can ordinary participants see staffing or operational gaps?
- do readiness states reflect actual missing requirements?
- does exhibitor self-manage policy bypass organizer control incorrectly?

## Fix Scope

Any issues found during audit that affect assignment integrity, scoped access, readiness truth, or operations visibility must be fixed inside this sprint.

Must-fix categories:

- broken assignment authorization
- cross-event assignment bugs
- stall-owner overreach into other stalls
- unapproved participant assignment
- misleading readiness states
- unauthorized exposure of operations data

Can-defer categories only with explicit note:

- visual polish of operations dashboard
- optional bulk assignment tools
- non-blocking filtering improvements
- richer readiness copy refinement

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- assignment and removal still work correctly
- scoped access still holds after fixes
- readiness logic remains truthful
- organizer and exhibitor surfaces remain role-appropriate

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- organizer operations dashboard exists
- stall staffing assignment exists and is scoped correctly
- exhibitor or stall owner access works only within authorized scope
- ordinary participants cannot access operations surfaces
- readiness indicators are truthful and useful
- operational assignments are stable enough for Phase 3 pass and scan permissions
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for assignment, access control, and readiness pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `008-p03-03A-event-pass-and-wallet-foundation.md` when:

- participant operational ownership is clear
- stall staffing and permissions are stable
- the event has enough operational structure to issue passes and later support check-in

This sprint must not hand off as ready if:

- stall ownership is still ambiguous
- operations access is leaking across roles or stalls
- readiness logic is unreliable
- assignment model is too weak for pass and scan permissions

### What may continue in the next sprint

- event pass model
- pass types
- wallet foundation
- issuance rules by role

### What must not be pushed carelessly to the next sprint

- unresolved assignment authorization issues
- unresolved stall-scope access leaks
- unresolved ambiguity around staff and exhibitor operational roles

## Dependencies

Technical dependencies:

- Sprint 005 registration and participant identity
- Sprint 006 directory and mutual exchange
- existing event, node, and reporting foundations

Product dependencies:

- agreement on exhibitor operational role model
- decision on whether exhibitor leads can self-manage stall staff in V2
- agreement on minimum readiness indicators

## Non-Goals

- event passes
- event entry scanning
- session scanning
- staffing schedules
- staff shift management

## Risks

### Risk 1 - Role confusion

If event role, assignment role, and future pass role are mixed together, operations and security will become hard to reason about.

Mitigation:

- keep event role and node assignment role separate

### Risk 2 - Weak scoped access

If stall owners can see too much of the event, organizer trust will be reduced.

Mitigation:

- enforce strict event and node scoping in every operations endpoint

### Risk 3 - Readiness theater

If readiness labels look polished but are not based on real checks, operators will ignore them.

Mitigation:

- derive readiness from actual required configuration state

### Risk 4 - Overbuilding operations UI

If the sprint becomes a full operations suite, it may delay the more important pass and check-in work.

Mitigation:

- keep V2 operations focused on ownership, staffing, and readiness

## Open Questions

1. Should exhibitor leads be allowed to assign their own staff in V2, or should all assignments remain organizer-controlled until Phase 3?

2. Should a participant be allowed to own multiple stalls in the same event in V2?

3. Should readiness be purely derived, or do we need organizer override notes for edge cases?

4. Should stall staff have read-only access to stall dashboards in V2, or wait until Phase 3 scan permissions exist?

## Recommended Implementation Notes

- Prefer a lightweight assignment model over a full organizational hierarchy.
- Keep access-control logic explicit and test-heavy.
- Keep readiness explainable.
- Reuse prior reporting surfaces rather than creating parallel operations analytics.
- Treat this sprint as the operational bridge to passes and check-in, not as an end-state operations platform.

## Acceptance Criteria

1. An organizer can access an event operations dashboard.

2. An organizer can assign approved participants to stalls or nodes.

3. Stall or exhibitor owners can access only their authorized operations surfaces.

4. Ordinary participants cannot access event operations tools.

5. Event and stall readiness indicators are available and reflect actual state.

6. The assignment and access model is strong enough to support Phase 3 pass issuance and scan permissions.

## Definition Of Done

This sprint is complete when:

- organizer operations dashboard exists
- stall assignment model exists
- scoped exhibitor operations access exists
- readiness indicators exist
- audit, fix, and re-audit are completed
- documentation clearly explains how Phase 3 pass and check-in work build on top of this operational foundation next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy operational ownership and staffing structure

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat operations roles and assignments as reliable for pass issuance and scan permissions

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Event and stall operations are role-scoped and trustworthy
- Staffing and ownership are explicit enough for pass issuance rules
- Phase 3 can safely build on clear operational assignments

Deferred:

- Optional bulk staffing actions
- Optional exhibitor self-manage refinement
```
