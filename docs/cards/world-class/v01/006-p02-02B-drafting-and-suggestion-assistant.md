# World Class Cards V01 - 006 - P02 - 02B - Drafting And Suggestion Assistant

## Objective

Introduce a drafting and suggestion assistant that uses relationship context and follow-up signals to help users decide what to do next and how to say it.

This sprint builds on:

- `001-p01-01A-relationship-timeline-foundation.md`
- `002-p01-01B-identity-resolution-and-merge.md`
- `003-p01-01C-crm-workflow-hardening.md`
- `004-p01-01D-relationship-graph-and-cross-surface-view.md`
- `005-p02-02A-follow-up-signals-foundation.md`

It adds:

- next-step suggestions
- AI-assisted follow-up draft generation
- explainable suggestion rationale
- channel-aware drafting foundation
- user-controlled draft review and editing flow

At the end of this sprint, Dotly should be able to help a user move from `I know this contact needs attention` to `here is a useful next action and a draft you can actually work with`.

## Problem

After Sprint 005, Dotly can identify who likely needs follow-up and why. But the user still needs to manually decide:

- what the best next action is
- which channel to use
- how to word the message
- when a reminder is better than immediate outreach

Without a drafting and suggestion layer:

- follow-up signals still create mental overhead
- users may ignore good opportunities because composing a message takes too long
- the platform stops at prioritization rather than helping execution
- later automation work would have no grounded suggestion contract to build on

The platform needs a controlled assistant layer that turns relationship context into actionable suggestions without taking away user judgment.

## Product Intent

This sprint should make Dotly feel like a thoughtful relationship copilot.

The product promise is:

- suggestions are grounded in actual relationship context
- draft content is useful, not generic spam
- users understand why something is being suggested
- the assistant helps execution without pretending to replace user judgment

This sprint is not trying to fully automate outreach. It is introducing trustworthy human-in-the-loop assistance.

## Sprint Scope

In scope:

- next-action suggestion model
- AI-assisted draft generation
- explanation of why a suggestion was made
- contact-context-aware drafting input layer
- review and edit before use
- channel-aware suggestion foundation
- safe assistant UX in contact and CRM surfaces

Out of scope:

- full automatic sending
- scheduled sequences
- autonomous multi-step outreach
- outbound approval workflows for teams
- external email provider sync expansion beyond what current CRM/contact flows support

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

The sprint is not complete just because AI can generate text. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind generic, misleading, unsafe, or ungrounded suggestions that block trustworthy follow-up automation work, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must keep `suggestion`, `draft`, and `action execution` separate.

That means:

- the assistant can suggest what to do next
- the assistant can draft a starting message
- the user still decides whether to send, edit, or ignore it

Examples:

- `Reply to their message` is a suggestion
- `Here is a concise reply draft` is the draft artifact
- `Send email` or `create task` is an execution action handled by product workflow, not by the model itself

If these layers are collapsed too early, the assistant becomes hard to trust and harder to audit.

## User Roles In This Sprint

Primary roles:

- Individual user managing relationships
  - wants good next-step help without losing control

- Team member using CRM
  - wants faster, higher-quality follow-up for real contacts

- Platform
  - needs a suggestion layer safe enough for later automation work

## User Stories

### User stories

1. As a user, I want Dotly to suggest an appropriate next action based on relationship context.

2. As a user, I want a message draft that reflects what actually happened with the contact.

3. As a user, I want to understand why the system suggested a follow-up action.

4. As a user, I want to edit or ignore drafts instead of being forced into them.

### Platform stories

1. As the platform, I need assistant suggestions grounded in follow-up signals and relationship context.

2. As the platform, I need drafts to avoid hallucinating facts not present in contact and timeline data.

3. As the platform, I need a reusable suggestion contract that later automation features can build on safely.

## Suggestion Model

This sprint should define a small, explicit set of next-action suggestions.

Recommended initial suggestion types:

- `SEND_REPLY`
- `SEND_FOLLOW_UP`
- `BOOK_OR_CONFIRM_MEETING`
- `CREATE_REMINDER`
- `UPDATE_CRM_STAGE`
- `WAIT_NO_ACTION`

Recommendation for V1:

- keep the suggestion set compact
- do not suggest too many actions at once

## Drafting Model

Draft generation should use only grounded inputs.

Recommended drafting inputs:

- contact name and profile context
- first source and latest meaningful source
- recent timeline events
- follow-up signals and reasons
- current CRM state
- relationship surface context such as booking, event exchange, or inbox message

The model should not invent:

- facts the timeline does not contain
- promises, discounts, or sales claims not present in context
- fake familiarity or fabricated meeting memory

## Explainability Model

Every suggestion should include a visible rationale.

Examples:

- `Suggested because they sent a message 2 hours ago and no reply is logged yet.`
- `Suggested because they booked a meeting and no preparation task exists.`
- `Suggested because this contact has a recent event exchange and no follow-up activity.`

This is critical for trust.

## Functional Requirements

### FR1 - Suggest next action

The system must be able to suggest a next action for a contact based on current relationship context and follow-up signals.

### FR2 - Generate grounded draft

The system must be able to generate a follow-up draft grounded in available contact and relationship context.

### FR3 - Suggestion rationale

The assistant must provide a concise reason for the suggestion.

### FR4 - User review before use

The user must be able to:

- review
- edit
- discard

before using the draft.

### FR5 - Channel-aware foundation

The assistant should be able to shape suggestions based on likely channel context.

Examples:

- inbox reply context
- post-booking follow-up context
- post-event contact follow-up context

Recommendation for V1:

- keep actual sending channel logic light if product surfaces are not yet unified
- but preserve channel-aware context in suggestions

### FR6 - No fake confidence

The assistant must avoid overstating certainty.

Examples:

- suggest, not command
- avoid acting like the user already agreed to send

### FR7 - Contact detail integration

The assistant should appear naturally in contact and CRM surfaces where follow-up decisions happen.

### FR8 - Draft safety and tone

Drafts should be:

- concise
- professional
- context-aware
- not overly salesy unless clear sales context exists

### FR9 - Suggestion suppression

The assistant should be able to recommend `WAIT_NO_ACTION` or no message draft when the signal context does not justify outreach.

### FR10 - Event-aware support

The draft model must be compatible with Event Radar follow-up scenarios later.

### FR11 - Logging and auditability

The system should log suggestion generation context at a safe summary level so product debugging and quality review are possible.

### FR12 - Future automation compatibility

The output contract must support later automation work such as reminder creation and workflow generation without redesign.

## Backend Scope

The backend scope for this sprint is the suggestion and draft-generation layer.

### Service-layer scope

Recommended backend work:

- build suggestion resolution logic from follow-up signals
- build prompt/context assembly from relationship data
- generate drafts through existing AI service infrastructure
- return structured suggestion payloads with rationale

### API scope

Recommended endpoints:

- `GET /contacts/:id/suggestions`
- `POST /contacts/:id/draft`

Alternative acceptable shape:

- one combined assistant endpoint returning suggestion plus optional draft payload

### Payload shape

Recommended response fields:

- suggestion type
- rationale
- supporting signals
- draft subject or title if applicable
- draft body
- confidence descriptor if used

Recommendation:

- use explainable descriptors, not opaque confidence scores, in V1

### Safety scope

- restrict prompt context to grounded relationship data
- avoid leaking unrelated contacts or internal metadata into the prompt
- sanitize generated output handling if later copied into email or message systems

### Backend test scope

- suggestion selection tests
- rationale generation tests
- prompt-context assembly tests
- safe fallback when AI service fails
- no-hallucination guard tests where deterministic constraints can be asserted

## Frontend Scope

The frontend scope for this sprint is the assistant experience in contact-centric workflows.

### Contact detail UX

Recommended assistant panel:

- suggested next action
- short reason
- generate or view draft
- edit draft
- dismiss or ignore suggestion

### CRM workflow UX

The assistant should appear in the place where users naturally make follow-up decisions.

Recommendation:

- contact detail page first
- optional lightweight support in CRM list row actions later if useful

### Draft UX

The draft experience should support:

- copy draft
- edit draft inline
- create reminder instead if user chooses not to send now

### Frontend technical scope

- reuse current AI and contact detail patterns where possible
- avoid creating a large chat-style interface if the product need is next-step assistance
- keep interactions fast and low-friction

### Frontend test scope

- suggestion panel rendering
- rationale display
- draft loading and error states
- edit and dismiss behaviors
- no-action state handling

## Assistant Quality Strategy

Recommended V1 quality rules:

- suggestions should stay narrow and grounded
- drafts should reference recent real context only
- the system should prefer short useful drafts over long generic copy
- the system should sometimes recommend no outreach yet

This avoids turning the assistant into low-quality AI filler.

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- grounding quality
- suggestion usefulness
- rationale truthfulness
- AI failure handling
- UI trust and clarity
- prompt/context safety

### Audit checklist

- does the draft reflect actual contact context?
- does the assistant ever invent relationship details not in the system?
- are suggestion reasons understandable and true?
- can the assistant recommend no action when that is appropriate?
- does the UI imply the user must follow the assistant?
- is prompt context limited to the right contact and relationship data?

## Fix Scope

Any issues found during audit that affect suggestion grounding, draft trustworthiness, rationale quality, or prompt safety must be fixed inside this sprint.

Must-fix categories:

- hallucinated relationship facts
- generic useless drafting
- wrong next-action selection
- misleading rationale
- prompt context leakage or wrong-contact context
- broken fallback states when AI generation fails

Can-defer categories only with explicit note:

- visual polish
- broader channel coverage
- non-blocking tone refinement
- richer draft variations or style presets

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- suggestions remain grounded and useful
- drafts remain editable and user-controlled
- rationale remains truthful
- the next automation sprint can build on a trustworthy assistant output layer

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- contact suggestions are grounded in real relationship signals
- draft generation uses correct contact context
- rationale is visible and understandable
- drafts are editable and user-controlled
- the assistant can appropriately recommend no immediate action
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for suggestion logic, grounding, fallback behavior, and UI states pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `007-p02-02C-follow-up-automation-and-team-workflows.md` when:

- assistant suggestions are trustworthy
- draft outputs are grounded and controllable
- later automation can safely use assistant output contracts as inputs

This sprint must not hand off as ready if:

- drafts still hallucinate or misread context
- suggestions are too generic or untrustworthy
- user control over assistant output is weak

### What may continue in the next sprint

- reminder creation automation
- task automation
- team-aware routing of follow-up actions
- controlled workflow generation

### What must not be pushed carelessly to the next sprint

- unresolved hallucination risk
- unresolved rationale quality issues
- unresolved wrong-contact context leakage

## Dependencies

Technical dependencies:

- Program P01 Relationship OS
- Sprint 005 follow-up signals foundation
- existing AI service infrastructure

Product dependencies:

- agreement on initial suggestion types
- agreement on how restrained and professional draft tone should be by default

## Non-Goals

- automatic sending
- outbound sequences
- team approval flows
- complex conversational AI interface

## Risks

### Risk 1 - Hallucinated drafts

If the assistant invents details, trust will collapse quickly.

Mitigation:

- ground prompts in structured relationship context only

### Risk 2 - Generic low-value copy

If drafts feel like generic AI boilerplate, users will ignore the feature.

Mitigation:

- keep drafts short, contextual, and tied to a specific reason

### Risk 3 - Over-assertive assistant UX

If the UI frames suggestions as commands instead of assistance, users may feel pushed into bad actions.

Mitigation:

- preserve user review and explicit control everywhere

### Risk 4 - Premature channel complexity

If the sprint tries to cover every outreach channel deeply, the quality bar may slip.

Mitigation:

- focus on reusable suggestion and drafting contracts first

## Open Questions

1. Should draft generation be on-demand only in V1, or should the assistant precompute a draft for high-priority contacts?

2. Should the assistant support different draft styles in V1, or keep one default tone?

3. Should `WAIT_NO_ACTION` appear as an explicit assistant state to the user, or only as absence of suggestion?

4. How much of the draft should be channel-specific if outbound execution surfaces are still split across the product?

## Recommended Implementation Notes

- Keep suggestions small, explicit, and explainable.
- Use relationship context as structured grounding input.
- Prefer one useful draft over multiple shallow variants.
- Keep the UX focused on execution help, not AI novelty.
- Treat this sprint as the assistant trust layer before automation begins.

## Acceptance Criteria

1. Dotly can suggest appropriate next actions for a contact based on real relationship context.

2. Dotly can generate a grounded follow-up draft with visible rationale.

3. Users retain control to review, edit, or ignore assistant output.

4. The assistant layer is strong enough for follow-up automation and team workflow support in the next sprint.

## Definition Of Done

This sprint is complete when:

- suggestion model is implemented
- draft generation is implemented
- rationale is visible
- user review/edit flow exists
- audit, fix, and re-audit are completed
- documentation clearly explains how automation and team workflows will build on this assistant layer next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy assistant suggestions and draft outputs

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat the assistant output layer as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Suggestions and drafts are grounded in real relationship context
- Users can understand why the assistant made a recommendation
- Automation can now build on a trustworthy human-in-the-loop assistant layer

Deferred:

- Optional style variants
- Optional broader channel-specific drafting refinement
```
