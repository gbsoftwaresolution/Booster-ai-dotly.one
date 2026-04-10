# World Class Cards V01 - 007 - P02 - 02C - Follow-Up Automation And Team Workflows

## Objective

Introduce controlled follow-up automation and team-aware workflow actions so Dotly can help users act on relationship signals and assistant suggestions without losing trust or operational clarity.

This sprint builds on:

- `005-p02-02A-follow-up-signals-foundation.md`
- `006-p02-02B-drafting-and-suggestion-assistant.md`

It adds:

- controlled reminder and task automation
- suggestion-to-workflow conversion
- team-aware follow-up routing foundation
- owner and assignee visibility for follow-up actions
- automation safeguards and review rules

At the end of this sprint, Dotly should be able to move beyond `here is a suggestion` into `here is a trustworthy workflow action you can accept, route, and track`.

## Problem

After Sprint 006, Dotly can:

- identify follow-up needs
- suggest next actions
- generate grounded drafts

But the user still has to manually translate those suggestions into workflow state.

Without automation and team-aware workflow support:

- good suggestions still die in the gap between insight and execution
- reminders and tasks remain manual and inconsistent
- teams cannot reliably route follow-up to the right owner
- follow-up work remains fragile when multiple users touch the same relationship
- the assistant helps with thinking but not enough with operational execution

The platform needs a controlled automation layer that can turn relationship signals and suggestions into trackable actions without creating spam, duplication, or ownership confusion.

## Product Intent

This sprint should make Dotly feel like a workflow partner, not just an advisory layer.

The product promise is:

- high-confidence follow-up situations can generate tasks or reminders cleanly
- users stay in control of meaningful actions
- teams can route follow-up to the right person
- automation is visible, reviewable, and restrained

This sprint is not trying to create autonomous outbound campaigns. It is building workflow automation that is narrow, explainable, and operationally useful.

## Sprint Scope

In scope:

- task and reminder automation from follow-up signals
- suggestion-to-action conversion flows
- assignee and ownership-aware workflow routing
- team workflow compatibility foundation
- duplicate automation prevention
- automation audit trail
- automation review or confirmation points where needed

Out of scope:

- autonomous message sending
- multi-step outreach campaigns
- broad marketing automation
- complex SLA engines
- external workflow orchestration platforms beyond future compatibility

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

The sprint is not complete just because tasks can be auto-created. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind noisy automation, duplicate action creation, weak assignment logic, or workflow ambiguity that blocks inbox and meeting-conversion work, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must keep `automation` controlled and visible.

That means:

- automation should create or propose workflow actions
- automation should not silently take major customer-facing actions
- automation outputs should remain attributable and reviewable

Examples:

- creating a reminder is acceptable automation
- creating a follow-up task is acceptable automation
- silently sending a message on behalf of the user is out of scope and unsafe in this sprint

If the system jumps straight to autonomous behavior, trust will drop and operational debugging will become difficult.

## User Roles In This Sprint

Primary roles:

- Individual user
  - wants less manual follow-up busywork

- Team member or sales rep
  - wants follow-up actions assigned clearly and consistently

- Team lead or owner
  - wants automation to support the team without causing duplicate or unowned actions

- Platform
  - needs a safe workflow layer before unified inbox and team/revenue ops become more complex

## User Stories

### User stories

1. As a user, I want Dotly to help me create follow-up tasks and reminders when relationship signals are strong.

2. As a user, I want follow-up automation to be visible and understandable so I do not lose control.

3. As a user, I want the system to avoid creating duplicate tasks for the same contact and reason.

4. As a team user, I want follow-up work to go to the right owner or assignee.

### Platform stories

1. As the platform, I need automation rules grounded in existing signal and suggestion logic.

2. As the platform, I need assignment and ownership-aware workflow creation that respects current contact and team state.

3. As the platform, I need automation outputs to remain auditable for trust and debugging.

## Automation Model

This sprint should define a narrow automation model.

Recommended initial automation outputs:

- `CREATE_TASK`
- `CREATE_REMINDER`
- `SUGGEST_STAGE_UPDATE`
- `ROUTE_TO_OWNER`

Recommendation for V1:

- auto-create only low-risk workflow artifacts such as reminders or tasks
- keep higher-impact changes like CRM stage updates as explicit suggestions unless the product already has strong rules for them

## Team Workflow Model

This sprint should define how follow-up work behaves in team contexts.

Recommended assignment concepts:

- contact owner
- current assignee
- fallback creator
- team-visible automation source

Recommendation:

- if contact ownership exists, default follow-up action to the current owner
- if ownership is unclear, route to creator or keep unassigned with a visible warning

## Functional Requirements

### FR1 - Suggestion-to-action conversion

The user must be able to turn assistant suggestions into real workflow actions.

Examples:

- `Create reminder for tomorrow`
- `Create follow-up task`
- `Assign to owner`

### FR2 - Automated task creation

The system should be able to create a follow-up task from a strong follow-up signal or accepted suggestion.

### FR3 - Automated reminder creation

The system should be able to create reminders from strong signal patterns or accepted suggestions.

### FR4 - Duplicate action prevention

The system must avoid creating duplicate follow-up tasks or reminders for the same contact, same reason, and same recent window.

Recommendation:

- use deterministic dedupe rules tied to signal reason, contact, and time window

### FR5 - Ownership-aware routing

Workflow actions should route to the right person when ownership exists.

Recommended order:

1. explicit assignee chosen by user
2. current contact owner
3. action creator

### FR6 - Team visibility

When team features are present, team users with access should be able to understand:

- who owns the contact
- who owns the follow-up action
- whether an action was system-generated or manually created

### FR7 - Automation rationale

Actions created from automation should retain why they were created.

Examples:

- `Created because inbound message was received and no reply was logged`
- `Created because event exchange occurred and no follow-up task existed`

### FR8 - Review threshold rules

This sprint should define when automation runs automatically versus when user confirmation is required.

Recommendation for V1:

- auto-create low-risk reminders or tasks only for high-confidence cases if desired
- otherwise, default to one-click confirmation from suggestion panel

### FR9 - Timeline and audit trail integration

Automation-created tasks or reminders should be visible in relationship history and/or workflow audit surfaces where appropriate.

### FR10 - CRM alignment

Workflow actions created by automation must remain aligned with contact and CRM state.

Examples:

- if contact is merged, action must remain tied to canonical contact
- if a task already exists, automation should not generate conflicting duplicates

### FR11 - Contact detail integration

The contact detail surface should show automation-assisted actions as part of the active follow-up workflow.

### FR12 - Future compatibility

The automation model must support later:

- unified inbox routing
- team-owned relationship workflows
- ROI attribution
- event follow-up workflows

without reworking the core action model.

## Backend Scope

The backend scope for this sprint is workflow-action generation and assignment logic.

### Service-layer scope

Recommended backend work:

- translate suggestions into workflow actions
- generate tasks and reminders with rationale metadata
- dedupe automated workflow actions
- resolve assignee or owner cleanly
- expose automation metadata to current workflow surfaces

### API scope

Acceptable approaches:

1. extend existing task/reminder endpoints with automation metadata
2. add assistant workflow endpoints such as:
   - `POST /contacts/:id/assistant/actions`

Recommendation:

- choose the cleanest shape that avoids duplicating task/reminder creation logic

### Data model scope

Potential metadata additions:

- automation source
- automation rationale
- originating suggestion type
- generatedAt

Recommendation:

- prefer metadata on existing task/reminder models if that is sufficient
- add dedicated automation tables only if truly necessary for clarity

### Validation scope

- automated actions must reference canonical contact identity
- dedupe checks must prevent near-identical duplicate actions
- assignment must remain authorized
- automated actions must not mutate CRM state silently beyond agreed scope

### Backend test scope

- task creation from suggestion tests
- reminder creation tests
- duplicate prevention tests
- assignee resolution tests
- merge/canonical-contact compatibility tests
- automation metadata persistence tests

## Frontend Scope

The frontend scope for this sprint is the workflow execution experience built on assistant output.

### Contact detail UX

Recommended actions from assistant panel:

- `Create reminder`
- `Create task`
- `Assign follow-up`
- `Dismiss`

### Workflow visibility UX

Users should be able to see:

- which actions were suggested
- which were created
- who owns them
- whether they were auto-generated or user-confirmed

### Team-aware UX

If ownership or assignment exists, show:

- current owner
- assigned follow-up owner
- automation rationale

### Frontend technical scope

- reuse existing tasks and workflow surfaces
- avoid building a separate automation dashboard in V1
- keep the user in the natural contact workflow context

### Frontend test scope

- suggestion-to-task flow
- suggestion-to-reminder flow
- duplicate prevention UX feedback
- assignment display
- auto-generated metadata visibility

## Automation Safety Strategy

Recommended V1 strategy:

- prefer confirmation-first automation for most cases
- optionally allow immediate low-risk action creation where the rule is obvious and user value is high

Examples of safer early automation:

- create reminder after inbound message with no reply
- create follow-up task after event exchange with no existing task

Examples to avoid in this sprint:

- silent outbound messaging
- silent CRM stage mutation without clear rules

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- duplicate workflow-action prevention
- assignment correctness
- automation rationale correctness
- merge compatibility
- user clarity and control
- authorization for team and assignee behavior

### Audit checklist

- can the same signal create repeated duplicate tasks or reminders?
- do automated actions stay attached to canonical contact after merge?
- is follow-up ownership assigned correctly?
- do users understand whether an action was automated or manual?
- can unauthorized users create or assign follow-up actions for contacts they do not control?
- does the UI ever imply that messages were automatically sent when only tasks/reminders were created?

## Fix Scope

Any issues found during audit that affect automation safety, duplicate prevention, assignment integrity, or user trust must be fixed inside this sprint.

Must-fix categories:

- duplicate auto-actions
- wrong assignee resolution
- canonical-contact mismatch after merge
- misleading automation labels
- authorization gaps
- silent high-impact workflow mutation beyond agreed scope

Can-defer categories only with explicit note:

- advanced workflow dashboards
- more complex assignment rules
- visual polish
- lower-priority automation rule expansion

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- automation remains controlled and trustworthy
- duplicate prevention remains effective
- assignment remains correct
- the next unified inbox sprint can build on a solid workflow-action layer

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- users can convert suggestions into real workflow actions
- tasks and reminders can be generated safely from relationship context
- duplicate automation is prevented reliably
- assignment and ownership behavior are clear and correct
- automated actions remain visible and attributable
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for action generation, dedupe, assignment, and authorization pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `008-p03-03A-unified-inbox-foundation.md` when:

- follow-up actions are operationally useful and trustworthy
- workflow ownership is clear enough to route inbound work next
- the product can connect inbound interactions to a real action layer

This sprint must not hand off as ready if:

- automation is still noisy or duplicative
- ownership routing is weak
- users cannot tell what the system actually did on their behalf

### What may continue in the next sprint

- unified inbound inbox
- source-normalized inbound aggregation
- inbox-to-contact workflow linkage

### What must not be pushed carelessly to the next sprint

- unresolved duplicate action generation
- unresolved assignment ambiguity
- unresolved misleading automation behavior

## Dependencies

Technical dependencies:

- Sprint 005 follow-up signals foundation
- Sprint 006 drafting and suggestion assistant
- existing task and reminder workflow surfaces
- current contact ownership model

Product dependencies:

- agreement on confirmation-first vs auto-create thresholds
- agreement on minimum team assignment behavior for V1

## Non-Goals

- silent outbound sending
- campaign automation
- advanced SLA management
- cross-platform orchestration

## Risks

### Risk 1 - Automation noise

If Dotly creates too many reminders or tasks, users will start ignoring all of them.

Mitigation:

- keep automation scope narrow and dedupe aggressively

### Risk 2 - Ownership confusion

If follow-up actions go to the wrong person or no one clearly owns them, team trust drops.

Mitigation:

- use explicit owner and assignee resolution rules

### Risk 3 - Hidden automation

If the product performs automation without clear visibility, users may feel surprised or lose trust.

Mitigation:

- make automation origin and rationale visible in workflow surfaces

### Risk 4 - Premature high-impact automation

If the sprint expands into automated outbound actions too early, the risk profile increases sharply.

Mitigation:

- keep V1 focused on internal workflow artifacts only

## Open Questions

1. Should V1 allow any fully automatic task/reminder creation, or should all automation start as one-click confirmation?

2. Should unowned contacts default to action creator, remain unassigned, or require explicit selection?

3. Should automation-generated actions appear in the relationship timeline by default, or only in workflow surfaces?

4. Do reminders and tasks need distinct automation policies, or can they share one follow-up action model in V1?

## Recommended Implementation Notes

- Keep automation internal and operational first.
- Build on assistant and signal outputs, not parallel heuristic systems.
- Deduplicate aggressively.
- Make ownership explicit.
- Treat this sprint as the bridge from intelligence to execution.

## Acceptance Criteria

1. Users can convert follow-up suggestions into real tasks and reminders.

2. Automated workflow actions are deduplicated and attributable.

3. Team-aware assignment behavior is clear enough for collaborative follow-up.

4. The product is ready for unified inbox and inbound-routing work next.

## Definition Of Done

This sprint is complete when:

- suggestion-to-action conversion exists
- task/reminder automation exists
- automation metadata and rationale exist
- assignment logic exists
- audit, fix, and re-audit are completed
- documentation clearly explains how unified inbox work will build on this workflow-action layer next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy follow-up workflow automation

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat follow-up automation as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Suggestions can now become real workflow actions safely
- Ownership and assignment are clear enough for team use
- Unified inbox work can now connect inbound interactions to dependable follow-up workflows

Deferred:

- Optional broader automation rules
- Optional richer workflow dashboards
```
