# World Class Cards V01 - 009 - P03 - 03B - Inbox Routing And Contact Linking

## Objective

Turn the unified inbox from a passive feed into an operational routing surface that can attach inbound items to the right contact, create a new contact when appropriate, and connect inbox activity to follow-up workflows.

This sprint builds on:

- `002-p01-01B-identity-resolution-and-merge.md`
- `004-p01-01D-relationship-graph-and-cross-surface-view.md`
- `007-p02-02C-follow-up-automation-and-team-workflows.md`
- `008-p03-03A-unified-inbox-foundation.md`

It adds:

- inbox-to-contact linking rules
- create-or-attach workflows for inbound items
- identity-aware routing from inbox into CRM/contact context
- workflow action entry points from inbox items
- safer duplicate prevention during inbound handling

At the end of this sprint, Dotly should be able to take inbound activity and connect it to the right relationship record instead of leaving it as isolated inbox content.

## Problem

After Sprint 008, Dotly can unify inbound items into one inbox, but the inbox still stops short of the real business need.

Without inbox routing and contact linking:

- inbound items remain operationally isolated
- users still need to manually create or find the right contact record
- duplicate contacts can be created from repeated inbound interactions
- workflow follow-up remains slower and more error-prone than it should be
- meeting conversion and CRM routing in the next sprint will build on weak inbox context

The platform needs a routing layer that answers:

- does this inbox item belong to an existing person?
- should it create a new contact?
- should it attach to a canonical contact after merge?
- what action should the user take from the inbox?

## Product Intent

This sprint should make the inbox operationally useful.

The product promise is:

- inbound items can be linked to the correct relationship record
- repeated inbound interactions strengthen one contact rather than spawning duplicates
- users can move directly from inbox item to contact and workflow action
- later meeting conversion can build on a cleaner inbound-to-relationship path

This sprint is not trying to fully automate every routing decision. It is creating a safe and efficient contact-linking layer.

## Sprint Scope

In scope:

- inbox-to-contact matching rules
- create new contact from inbox item
- attach inbox item to existing contact
- canonical-contact-aware linking
- inbox-to-workflow action bridge
- duplicate-prevention logic for inbound-driven contact creation
- routing rationale and user override behavior

Out of scope:

- one-click meeting conversion optimization
- autonomous inbox triage
- team SLA queues
- fully automatic assignment routing across organizations
- broad external inbox integrations

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

The sprint is not complete just because an inbox item can open a contact. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind wrong-contact linking, duplicate-contact creation risk, or ambiguous routing states that block meeting conversion work, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must keep `match suggestion`, `contact linking`, and `contact creation` separate.

That means:

- the system can suggest a likely existing contact
- the user can confirm attach or override it
- the system can create a new contact when no reliable match exists

Examples:

- same normalized email strongly suggests existing contact linkage
- same sender name alone may be too weak for blind attach
- a merged canonical contact must be preferred over a merged-away duplicate

If the routing layer becomes too aggressive, it will damage identity trust. If it is too timid, users will keep doing unnecessary manual cleanup.

## User Roles In This Sprint

Primary roles:

- Individual user reviewing inbound activity
  - wants fast routing from inbox item to correct contact

- Team member handling inbound relationships
  - wants to avoid duplicate contact creation and mislinked follow-up

- Platform
  - needs a reliable bridge from inbox to CRM before meeting conversion and deeper team workflows

## User Stories

### User stories

1. As a user, I want Dotly to suggest whether an inbox item belongs to an existing contact.

2. As a user, I want to attach an inbox item to an existing contact when the match is correct.

3. As a user, I want to create a new contact from an inbox item when no reliable existing contact is found.

4. As a user, I want to avoid duplicate contacts when the same person messages me multiple times.

5. As a user, I want to move from inbox item to follow-up actions quickly.

### Platform stories

1. As the platform, I need inbox-driven contact creation to respect canonical identity and merge rules.

2. As the platform, I need routing decisions to be explainable and auditable.

3. As the platform, I need a safe inbox-to-contact bridge before meeting conversion and ROI attribution deepen.

## Routing Model

This sprint should define a practical inbox routing model.

Recommended routing outcomes:

- `LINK_TO_EXISTING_CONTACT`
- `CREATE_NEW_CONTACT`
- `REVIEW_REQUIRED`
- `ALREADY_LINKED`

Recommendation for V1:

- default to explicit review when confidence is not strong
- allow strong deterministic matches to be suggested clearly

## Contact Matching Model

Recommended initial matching signals:

- normalized sender email exact match
- normalized phone exact match if available
- existing canonical contact linked to prior inbox items from same sender
- strong profile overlap as supporting evidence only

Recommendation:

- prioritize deterministic identity signals
- do not auto-link on name-only similarity

## Functional Requirements

### FR1 - Inbox item match suggestion

The system must be able to suggest likely existing contact matches for an inbox item.

### FR2 - Explicit attach to existing contact

User must be able to link an inbox item to a chosen existing contact.

### FR3 - Create new contact from inbox item

User must be able to create a new contact directly from inbox item context.

The resulting contact should preserve:

- sender identity fields
- inbound source context
- link back to originating inbox item

### FR4 - Canonical-contact preference

If the best match is a merged or canonicalized identity, the system must prefer the canonical active contact.

### FR5 - Duplicate prevention

Creating a contact from an inbox item must check for strong existing-contact matches and avoid obvious duplicate creation.

### FR6 - Routing rationale

The system should explain why a match was suggested.

Examples:

- `Matched by email`
- `Matched by prior linked inbox identity`

### FR7 - Inbox item linked state

The inbox UI must show whether an item is:

- unlinked
- linked to a contact
- needs review

### FR8 - Contact context from inbox

Once linked, user should be able to move directly from inbox item to contact detail and active workflow context.

### FR9 - Follow-up action bridge

From an inbox item, user should be able to create or view:

- task
- reminder
- note
- contact detail

This sprint does not need to optimize the meeting path yet, but must keep it possible.

### FR10 - Timeline compatibility

Inbox linking must preserve relationship timeline continuity.

### FR11 - Access control

Only authorized users should be able to link inbox items to contacts or create contacts from them.

### FR12 - Future meeting conversion compatibility

The inbox-linked contact state must support the next sprint's card-to-meeting conversion flow.

## Backend Scope

The backend scope for this sprint is inbox routing, contact linkage, and safe contact creation.

### Service-layer scope

Recommended backend work:

- compute likely contact matches for inbox items
- expose match reasons
- support contact creation from inbox item context
- support linking inbox item to canonical contact
- prevent duplicate-contact creation when strong match already exists

### API scope

Recommended endpoints:

- `GET /inbox/items/:id/matches`
- `POST /inbox/items/:id/link-contact`
- `POST /inbox/items/:id/create-contact`

Alternative route shapes are acceptable if they fit the current controller structure better.

### Data model scope

Potential additions:

- linked `contactId` reference on inbox items where missing
- metadata for routing state and match rationale if useful

Recommendation:

- prefer linking existing item models to canonical contact over inventing a separate routing table unless necessary

### Validation scope

- linked contact must be accessible to the acting user
- contact creation must not ignore strong deterministic duplicates
- merged-away contacts must not be chosen as active targets
- inbox item must remain correctly scoped to owner/team context

### Backend test scope

- deterministic match suggestion tests
- create-contact-from-inbox tests
- canonical-contact linking tests
- duplicate-prevention tests
- authorization tests

## Frontend Scope

The frontend scope for this sprint is routing UX within the inbox.

### Inbox item routing UX

Recommended actions:

- `Attach to contact`
- `Create contact`
- `Open contact`
- `Create follow-up task`

### Match suggestion UX

The item detail or side panel should show:

- likely contact match
- reason for match
- confidence descriptor if used
- clear confirm/override actions

### Created/linked state UX

The inbox should make it obvious when an item is already linked.

Examples:

- `Linked to Sarah Thomas`
- `Review required`
- `New contact created`

### Frontend technical scope

- reuse inbox detail surface from Sprint 008
- reuse existing contact-create flows where practical
- avoid a heavy triage console in the first version

### Frontend test scope

- match suggestion rendering
- attach-to-contact flow
- create-contact flow
- linked state rendering
- duplicate-warning behavior

## Routing Strategy

Recommended V1 strategy:

- suggest matches strongly when deterministic
- require explicit user confirmation for attach in most cases
- allow one-click create only when no strong match exists or user overrides intentionally

This keeps routing safe without forcing too much manual work.

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- wrong-contact linking risk
- duplicate-contact creation risk
- canonical-contact compatibility
- access control
- inbox-to-workflow continuity

### Audit checklist

- can the same sender create duplicate contacts too easily?
- can an inbox item link to a merged-away contact incorrectly?
- can unauthorized users attach inbox items to contacts they should not control?
- does the UI clearly show linked vs unlinked vs needs-review states?
- does linking preserve timeline and workflow continuity?

## Fix Scope

Any issues found during audit that affect routing safety, duplicate prevention, canonical-contact integrity, or authorization must be fixed inside this sprint.

Must-fix categories:

- wrong-contact linkage
- duplicate-contact creation holes
- merged-contact targeting bugs
- authorization gaps
- misleading linked-state UX

Can-defer categories only with explicit note:

- advanced triage filters
- richer match confidence visuals
- non-blocking layout polish
- lower-value heuristic match expansion

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- inbox routing remains safe and useful
- duplicate prevention remains effective
- canonical-contact linking remains correct
- next meeting-conversion work can build on linked inbound relationships

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- inbox items can be linked to existing canonical contacts safely
- new contacts can be created from inbox items safely
- duplicate creation risk is controlled
- linked state is visible and understandable
- inbox-to-contact workflow bridge is trustworthy
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for routing, linking, creation, dedupe, and authorization pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `010-p03-03C-card-to-meeting-conversion-flow.md` when:

- inbound items are now connected to real relationship records
- meeting conversion can use linked contact context instead of raw inbox content
- workflow actions from inbox are operationally reliable

This sprint must not hand off as ready if:

- inbox routing is still error-prone
- duplicate-contact creation remains easy
- linked state and canonical identity remain ambiguous

### What may continue in the next sprint

- meeting conversion from card and inbox surfaces
- booking-intent routing
- contact-to-meeting workflow shortcuts

### What must not be pushed carelessly to the next sprint

- unresolved wrong-contact linkage risk
- unresolved canonical-contact routing bugs
- unresolved duplicate-contact creation problems

## Dependencies

Technical dependencies:

- Sprint 008 unified inbox foundation
- Relationship OS identity and CRM foundations
- existing contact creation and merge logic

Product dependencies:

- agreement on review-required thresholds
- agreement on when create-contact should warn instead of proceeding

## Non-Goals

- meeting conversion UX
- team SLA inbox routing
- external inbox integrations
- autonomous contact creation without user control

## Risks

### Risk 1 - Wrong contact linking

If inbound items attach to the wrong person, relationship trust collapses quickly.

Mitigation:

- keep V1 deterministic and confirmation-heavy

### Risk 2 - Duplicate contact creation

If creating contacts from inbox ignores strong identity matches, the CRM gets noisier instead of better.

Mitigation:

- use canonical-contact-aware duplicate checks before create flows

### Risk 3 - Routing ambiguity

If users cannot tell whether an inbox item is linked, review-required, or new, the inbox becomes operationally confusing.

Mitigation:

- make routing state explicit in the UI

### Risk 4 - Overbuilding routing AI too early

If the sprint tries to become a broad autonomous triage engine, quality will fall.

Mitigation:

- keep V1 routing rules explicit and reviewable

## Open Questions

1. Should V1 auto-link deterministic exact-email matches, or still require one confirmation click for consistency?

2. Should lead submissions be linkable through exactly the same inbox routing UX as messages and files, or need subtype-specific handling?

3. Do we need a separate `review required` queue view, or is item-level state enough in the first version?

4. Should linking an inbox item to a contact automatically create a note or timeline entry describing the routing action?

## Recommended Implementation Notes

- Prefer deterministic routing rules first.
- Always prefer canonical active contacts.
- Make routing states visible and understandable.
- Keep inbox-to-contact flow lightweight but safe.
- Treat this sprint as the bridge from inbound feed to usable relationship record.

## Acceptance Criteria

1. Inbox items can be safely linked to existing contacts.

2. Inbox items can create new contacts without causing obvious duplicate noise.

3. Routing states are understandable and operationally useful.

4. The system is ready for meeting conversion work in the next sprint.

## Definition Of Done

This sprint is complete when:

- inbox routing exists
- inbox-to-contact linking exists
- create-contact-from-inbox exists
- duplicate protection exists
- audit, fix, and re-audit are completed
- documentation clearly explains how meeting conversion will build on this routing layer next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy inbox routing and contact linking

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat inbox-linked relationships as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Inbound items can now connect to canonical relationship records safely
- Duplicate creation risk is controlled during inbox handling
- Meeting conversion work can now build on a real inbox-to-contact bridge

Deferred:

- Optional review queue view
- Optional richer match-confidence presentation
```
