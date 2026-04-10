# World Class Cards V01 - 005 - P02 - 02A - Follow-Up Signals Foundation

## Objective

Establish the signal model that powers smart follow-up so Dotly can prioritize contacts based on meaningful relationship activity rather than raw chronological history alone.

This sprint builds on the Relationship OS foundation by defining and implementing:

- follow-up signal taxonomy
- signal derivation rules from timeline, CRM, inbox, booking, and event-aware sources
- contact-level follow-up state summary
- explainable prioritization inputs for later assistant and automation work

At the end of this sprint, Dotly should be able to answer not just `what happened`, but `who likely needs attention now and why`.

## Problem

After Program P01, Dotly can provide:

- unified relationship timeline
- canonical contact identity
- stronger CRM workflow state
- cross-surface relationship context

But the system still lacks a dedicated follow-up signal layer.

Without structured follow-up signals:

- timeline remains descriptive, not actionable
- users must manually infer urgency from many events
- AI drafting in later sprints will have weak context
- reminder and automation logic will become noisy or arbitrary
- high-intent contacts can be missed while low-signal contacts get attention

The platform needs an explainable signal system that translates relationship activity into actionable follow-up context.

## Product Intent

This sprint should make Dotly feel like it understands momentum in a relationship.

The product promise is:

- the system can detect who likely needs follow-up
- prioritization is explainable, not mysterious
- users can see the signals behind follow-up state
- later AI suggestions and task automation will be grounded in real relationship context

This sprint is not trying to fully automate outreach yet. It is creating the reasoning layer for future follow-up intelligence.

## Sprint Scope

In scope:

- follow-up signal taxonomy
- signal derivation rules from existing product data
- contact-level follow-up summary state
- explainable reasons for attention and urgency
- contact list and contact detail signal visibility foundation
- groundwork for later assistant suggestions and automation

Out of scope:

- message drafting
- automated outreach sequences
- team assignment automation
- predictive scoring based on black-box ML
- external CRM action sync

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

The sprint is not complete just because a priority badge exists. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind weak signal logic, unexplainable urgency labels, or noisy prioritization that blocks trustworthy drafting and automation work, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must keep `signals` separate from `decisions`.

That means:

- signals describe observed relationship conditions
- later assistant layers decide what to suggest
- later automation layers decide what to create or schedule

Examples:

- `message received and no reply yet` is a signal
- `send a reply now` is a suggestion
- `create a reminder in two hours` is an automation decision

If these layers are mixed too early, the system becomes hard to trust and hard to tune.

## User Roles In This Sprint

Primary roles:

- Individual user managing follow-up
  - wants to know who needs attention now

- Team member using CRM
  - wants prioritization grounded in activity and relationship context

- Platform
  - needs a reliable signal layer before AI drafting and automation work

## User Stories

### User stories

1. As a user, I want to know which contacts likely need follow-up now.

2. As a user, I want to understand why Dotly thinks a contact needs attention.

3. As a user, I want stronger signals like new inbound activity or booked meetings to stand out from weak signals like passive views.

4. As a user, I want follow-up cues to reduce mental overhead without feeling random.

### Platform stories

1. As the platform, I need an explainable signal model that can be reused by assistant and automation features later.

2. As the platform, I need signals to come from relationship truth, not isolated feature heuristics.

3. As the platform, I need a priority model that is descriptive enough to be useful without becoming opaque scoring too early.

## Follow-Up Signal Model

This sprint should define explicit follow-up signals.

Recommended initial signal categories:

- `NEW_INBOUND_MESSAGE`
- `NEW_LEAD_SUBMISSION`
- `NEW_BOOKING`
- `RECENT_MEANINGFUL_ACTIVITY`
- `OPEN_TASK_OVERDUE`
- `NO_RESPONSE_AFTER_INBOUND`
- `DEAL_STAGE_STALLED`
- `RECENT_EVENT_EXCHANGE`
- `MUTUAL_EXCHANGE_COMPLETED`
- `HIGH_VALUE_MULTI_SURFACE_CONTACT`

Recommendation for V1:

- prefer a small set of high-signal categories first
- avoid dozens of subtle micro-signals that become hard to explain

## Signal Strength Model

Signals should not all be treated equally.

Recommended signal strength classes:

- `HIGH`
- `MEDIUM`
- `LOW`

Examples:

- new inbound message: `HIGH`
- new meeting booked: `HIGH`
- open task overdue: `HIGH`
- card viewed once: `LOW`
- recent note added by owner: not necessarily a follow-up signal on its own

Recommendation:

- keep signal strength rule-based and explainable in V1

## Follow-Up State Model

This sprint should produce a contact-level follow-up state that is readable by users and systems.

Recommended states:

- `ATTENTION_NOW`
- `FOLLOW_UP_SOON`
- `MONITOR`
- `NO_ACTION`

Recommendation:

- keep states descriptive and operational
- avoid fake confidence like `hot` or `cold` unless backed by real later logic

## Functional Requirements

### FR1 - Signal derivation

The system must derive follow-up signals from existing relationship, CRM, inbox, booking, and event-related data.

### FR2 - Explainable reasons

Each contact's follow-up state must be explainable by visible reasons.

Examples:

- `Sent a message 2 hours ago`
- `Booked a meeting today`
- `Open task is overdue`
- `Recent event exchange with no follow-up yet`

### FR3 - Contact follow-up summary

The contact detail view must show a follow-up summary with:

- current follow-up state
- top reasons
- relevant timestamps or recency cues

### FR4 - Contact list prioritization foundation

The contact list or CRM list must be able to surface follow-up-relevant ordering or filtering.

Recommendation for V1:

- support display and filtering before full ranking overhaul if necessary

### FR5 - Signal recency rules

Signals must consider recency in a deterministic way.

Examples:

- a new inbound message from 10 minutes ago is stronger than a similar one from 2 weeks ago
- a recent event exchange may remain follow-up relevant for a short window

### FR6 - Signal source coverage

The system should pull signals from the highest-value existing sources first.

Recommended initial source coverage:

- inbox
- lead capture
- bookings
- tasks
- deals
- recent Event Radar exchanges when implemented

### FR7 - Weak-signal restraint

The system must avoid creating noisy follow-up states from weak or passive interactions alone.

### FR8 - Follow-up state API shape

The backend must expose a follow-up state payload that later assistant and automation features can consume.

### FR9 - Timeline relationship

Follow-up signals should be grounded in timeline truth but not require users to manually inspect the whole timeline to understand urgency.

### FR10 - Contact summary integration

The follow-up state should appear naturally in the contact summary area rather than as a disconnected badge.

### FR11 - Future team support compatibility

The model should leave room for later team assignment and ownership-aware follow-up behavior.

### FR12 - Future AI compatibility

The signal payload should be shaped so the next sprint can use it to produce drafting and next-step suggestions.

## Backend Scope

The backend scope for this sprint is the signal derivation and follow-up state layer.

### Service-layer scope

Recommended backend work:

- derive signals from current product data
- classify signal strength
- compute contact follow-up state
- expose explainable reasons and timestamps

### API scope

Two acceptable approaches:

1. extend contact summary payload
2. add a dedicated endpoint such as:
   - `GET /contacts/:id/follow-up`

Recommendation:

- choose the cleanest shape that later assistant features can reuse

### Data model scope

Recommendation for V1:

- derive follow-up state dynamically where possible
- persist only if needed later for performance or queue-based processing

If a persisted signal snapshot is introduced, it must remain explainable and refreshable.

### Validation scope

- signal derivation must use canonical contact identity
- reasons must map to real underlying events or workflow conditions
- weak passive activity must not dominate follow-up state without stronger support

### Backend test scope

- signal derivation tests by source type
- recency weighting tests
- follow-up state classification tests
- explainable-reason payload tests
- authorization tests for follow-up summary access

## Frontend Scope

The frontend scope for this sprint is the first user-visible follow-up signal experience.

### Contact detail UX

Recommended additions:

- follow-up state label
- top follow-up reasons
- quick context such as `last inbound 3h ago`

### Contact list / CRM list UX

Recommended initial support:

- filter by follow-up state
- optional sort by urgency if that is easy to support cleanly

### Signal explanation UX

The UI should answer:

- why this contact needs attention
- why another contact does not

Keep this concise and explicit.

### Frontend technical scope

- integrate follow-up state into existing contact summary or CRM list views
- avoid building a large new dashboard before the next sprint adds suggestions

### Frontend test scope

- follow-up state rendering
- reason rendering
- filter behavior if implemented
- sparse or no-signal states

## Initial Signal Prioritization

Recommended V1 signal priority order:

1. new inbound message
2. new lead submission
3. new booking created
4. overdue open task
5. stalled deal stage
6. recent event exchange without follow-up
7. passive views or weak analytics signals only if carefully constrained

This ensures the most important human-response signals appear first.

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- signal correctness
- recency logic
- explainability
- weak-signal noise control
- UI truthfulness
- authorization

### Audit checklist

- do high-value inbound actions correctly create stronger follow-up states?
- do passive events create too much urgency?
- are reasons understandable and grounded in real events?
- is follow-up state deterministic for the same underlying data?
- can unauthorized users access follow-up context for contacts they should not view?
- does the UI imply confidence or intelligence beyond what is actually implemented?

## Fix Scope

Any issues found during audit that affect signal quality, explainability, noise control, or authorization must be fixed inside this sprint.

Must-fix categories:

- misleading or wrong follow-up states
- noisy passive-signal prioritization
- unexplainable reasons
- broken recency handling
- authorization gaps

Can-defer categories only with explicit note:

- visual polish
- optional bulk-list sorting enhancements
- richer detail popovers
- non-blocking signal taxonomy expansion

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- signals remain trustworthy and explainable
- weak-signal noise remains under control
- follow-up state is useful enough for drafting assistant work next
- authorization remains correct

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- follow-up signals are derived from meaningful relationship data
- contact-level follow-up state exists and is explainable
- high-value signals stand out over passive noise
- contact summary and list surfaces can display follow-up context usefully
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for signal derivation, state classification, and authorization pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `006-p02-02B-drafting-and-suggestion-assistant.md` when:

- follow-up signals are trustworthy
- reasons are explainable
- assistant suggestions can build on real relationship urgency rather than guesswork

This sprint must not hand off as ready if:

- follow-up state is still noisy or arbitrary
- reasons are not clear enough for users to trust
- signal logic remains too weak for assistant drafting to rely on

### What may continue in the next sprint

- suggested next actions
- AI-assisted message drafting
- reminder suggestions
- outreach guidance based on signal context

### What must not be pushed carelessly to the next sprint

- unresolved signal noise
- unresolved recency mistakes
- unresolved unexplainable priority logic

## Dependencies

Technical dependencies:

- Program P01 Relationship OS
- existing contacts, tasks, deals, inbox, scheduling, and Event Radar-compatible data patterns

Product dependencies:

- agreement on initial follow-up states
- agreement on which passive signals are excluded or downweighted in V1

## Non-Goals

- AI message generation
- auto-creating tasks or reminders
- team routing rules
- external CRM automation

## Risks

### Risk 1 - Noisy urgency

If passive events create too many follow-up alerts, users will stop trusting the system.

Mitigation:

- prioritize strong inbound and workflow signals first

### Risk 2 - Opaque prioritization

If the system says `attention now` without clear reasons, users will ignore it.

Mitigation:

- always expose explainable reasons

### Risk 3 - Weak relationship grounding

If follow-up signals are detached from timeline and canonical contact identity, later assistant work will be shallow.

Mitigation:

- derive signals from the relationship OS, not isolated feature shortcuts

### Risk 4 - Premature scoring complexity

If this sprint tries to build a complicated scoring engine, it may become hard to validate and trust.

Mitigation:

- keep V1 signal logic explicit and rule-based

## Open Questions

1. Should follow-up state be computed on read in V1, or do we need a persisted snapshot for performance or list-sorting support?

2. Which passive signals, if any, should be visible in follow-up reasoning in V1?

3. Should overdue tasks alone trigger `ATTENTION_NOW`, or only when combined with relationship activity?

4. Should follow-up state appear directly in contact lists immediately, or remain contact-detail-first in the first cut?

## Recommended Implementation Notes

- Keep the signal model small and explainable.
- Prefer meaningful inbound and workflow signals over vanity interactions.
- Make reasons user-visible from the start.
- Build a reusable follow-up-state payload for later assistant work.
- Treat this sprint as the reasoning layer before AI suggestions appear.

## Acceptance Criteria

1. Dotly can derive meaningful follow-up signals from relationship and CRM activity.

2. A contact can display a trustworthy follow-up state with explainable reasons.

3. Users can identify who needs attention without reading the full timeline manually.

4. The signal layer is strong enough for drafting and suggestion features in the next sprint.

## Definition Of Done

This sprint is complete when:

- follow-up signal taxonomy exists
- contact follow-up summary exists
- explainable reasons exist
- contact list or CRM view can surface follow-up context at least minimally
- audit, fix, and re-audit are completed
- documentation clearly explains how drafting and suggestion assistant work builds on this signal layer next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy follow-up signals

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat follow-up prioritization as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Follow-up state is now grounded in meaningful relationship signals
- Users can see why a contact needs attention
- Drafting and suggestion features can now build on a trustworthy signal layer

Deferred:

- Optional persisted signal snapshots for later performance work
- Optional richer list ranking behaviors
```
