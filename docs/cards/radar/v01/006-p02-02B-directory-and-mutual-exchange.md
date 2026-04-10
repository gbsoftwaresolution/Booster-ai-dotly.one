# Event Radar V01 - 006 - P02 - 02B - Directory And Mutual Exchange

## Objective

Introduce the participant directory and mutual participant exchange layer so approved event participants can discover and share details with one another under explicit visibility and consent rules.

This sprint adds:

- participant directory model and access rules
- participant visibility preferences
- event-wide opt-in discovery
- mutual exchange eligibility rules
- participant-to-participant exchange behavior
- organizer controls for directory safety
- truthful directory and mutual exchange UX

At the end of this sprint, Event Radar should support a structured event participant network rather than only organizer-to-attendee or stall-to-visitor interactions.

## Problem

After Sprint 005, Event Radar knows who is registered and approved for an event, but participants still cannot safely discover or connect with one another through the event itself.

Without a directory and mutual exchange model:

- event-wide sharing remains only a recorded consent flag with no usable participant surface
- approved attendees cannot find others who also opted in
- organizers cannot offer curated event networking beyond stall scans
- participant identity remains underused
- later pass and check-in features would exist without a strong participant network layer

The platform needs a directory model that answers:

- who is visible in the event network
- what details are visible
- who can see whom
- when mutual exchange is allowed
- how directory visibility differs from registration approval and one-off QR exchange

## Product Intent

This sprint should make Event Radar feel like a privacy-aware event networking product.

The product promise is:

- approved participants can opt into being discoverable
- discoverability is not automatic just because someone registered
- participants can choose what is visible event-wide
- event-wide networking only includes people who consented to it
- mutual exchange feels intentional, not invasive

This sprint is not trying to become a public social feed. It is creating a controlled participant network inside an event.

## Sprint Scope

In scope:

- participant directory visibility model
- participant visibility preferences
- approved-participant eligibility rules
- participant search and filter within event scope
- mutual participant exchange rules
- event-wide participant card or profile surface
- organizer controls over directory availability
- directory-aware consent and exchange actions
- event-wide sharing fulfillment for approved participants who opted in

Out of scope:

- event pass issuance
- entry check-in
- session check-in
- AI matchmaking or networking recommendations
- external participant import sync
- chat or messaging between participants
- full social graph features

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

If a sprint leaves behind known directory privacy, participant visibility, authorization, or mutual-exchange gaps that block dependable use of the sprint outcome, the work must not be treated as ready to continue to the next sprint.

If only non-blocking polish or deliberately deferred expansion remains, the sprint may be marked as safe to continue into the next sprint.

## Core Design Principle

This sprint must preserve the separation among:

- registration approval
- directory visibility
- exchange consent

These are related but not equivalent.

Examples:

- someone can be approved for the event but hidden from the directory
- someone can appear in the directory with only name and company visible
- someone can be directory-visible but still require explicit mutual exchange before revealing additional fields

Registration is admission to the event.

Directory visibility is permission to be discoverable in the participant network.

Exchange is the act of sharing more specific details.

## User Roles In This Sprint

Primary active roles:

- Organizer
  - controls whether participant directory exists for the event
  - sets event-wide networking defaults and restrictions
  - may hide or moderate participants if needed

- Approved participant
  - can opt into directory visibility
  - can choose visible fields
  - can discover and exchange with other participants according to rules

- Exhibitor, speaker, sponsor, attendee
  - all may participate in the directory under event-role-aware visibility rules

Unapproved or rejected registrants must not appear in the directory.

## User Stories

### Participant stories

1. As an approved participant, I want to opt into event networking so other participants can discover me only if I choose to be discoverable.

2. As an approved participant, I want to choose which profile details are visible in the event directory so I control my privacy.

3. As an approved participant, I want to browse other visible participants so I can identify useful people to connect with.

4. As an approved participant, I want mutual exchange to happen only with participants who also opted in to networking.

### Organizer stories

1. As an organizer, I want to decide whether the event supports a participant directory at all.

2. As an organizer, I want to restrict directory participation to approved participants only.

3. As an organizer, I want visibility into directory participation without overexposing private information.

### Platform stories

1. As the platform, I need event-wide sharing consent recorded in Phase 1 to become a real feature without violating participant expectations.

2. As the platform, I need mutual exchange to require compatible consent from both sides rather than assuming reciprocity by default.

## Directory Model

This sprint introduces a participant directory surface tied to an event.

The directory should only include participants who satisfy all required conditions.

Recommended baseline conditions:

- registration status is `APPROVED`
- participant has enabled directory visibility
- event has directory enabled
- participant has not been hidden or blocked by organizer moderation

### Recommended directory visibility modes

- `HIDDEN`
- `VISIBLE_TO_ALL_APPROVED`
- `VISIBLE_TO_MUTUAL_ONLY`

Recommendation for V2:

- support `HIDDEN` and `VISIBLE_TO_ALL_APPROVED`
- treat `VISIBLE_TO_MUTUAL_ONLY` as optional if it complicates the first version too much

If included, `VISIBLE_TO_MUTUAL_ONLY` means:

- participant is not broadly listed
- they become visible once there is mutual networking compatibility or explicit mutual action

## Visible Field Model

Participants should be able to control which fields are visible in the directory independently from one-off QR exchange fields.

Recommended visible field set:

- `fullName`
- `company`
- `title`
- `profileImage` if already available
- `cardHandle` or public card link if appropriate
- `bio` optional if later desired

Recommendation for V2:

- keep visible fields focused on professional identity
- do not make phone and personal contact details directory-visible by default

Important rule:

- directory-visible fields are not the same as exchanged fields
- directory visibility does not automatically grant access to private contact details

## Mutual Exchange Model

Mutual participant exchange should be based on compatible consent.

Recommended rule for V2:

- participant A can request or complete a mutual exchange with participant B only if both are approved and both have opted into networking-compatible visibility or exchange settings

Potential modes:

- `DIRECTORY_VIEW_ONLY`
- `REQUEST_MUTUAL_EXCHANGE`
- `AUTO_MUTUAL_IF_BOTH_OPTED_IN`

Recommendation for V2:

- support `REQUEST_MUTUAL_EXCHANGE` or `AUTO_MUTUAL_IF_BOTH_OPTED_IN`
- choose one and message it clearly

Recommended product direction:

- `AUTO_MUTUAL_IF_BOTH_OPTED_IN` for simplicity if the event is networking-focused
- otherwise `REQUEST_MUTUAL_EXCHANGE` is safer and more explicit

If a simpler V2 is desired, use:

- directory visibility
- connect action
- mutual exchange only when both parties allow event networking

## Functional Requirements

### FR1 - Event directory enablement

An organizer can enable or disable the event participant directory.

When disabled:

- participants cannot browse the directory
- event-wide networking opt-in is not operational even if old consent flags exist
- messaging must explain that event networking is not available

### FR2 - Participant visibility preferences

An approved participant can set directory visibility preferences for the event.

Minimum controls:

- visible or hidden
- visible fields selection
- networking participation enabled or disabled

### FR3 - Directory eligibility

Only participants meeting all eligibility rules appear in the directory.

Minimum rule set:

- approved registration
- directory enabled on event
- participant visibility enabled
- not moderated out by organizer

### FR4 - Directory listing

Eligible participants can browse the event directory.

The list should show only visible fields.

Recommended filters:

- role
- company
- name search

Search may be simple in V2.

### FR5 - Participant profile card in directory

Each visible participant should have a directory card or profile view that shows:

- name
- company
- title
- role if appropriate
- visible professional identity fields
- action such as `Connect` or `Exchange`

### FR6 - Mutual exchange eligibility resolution

When participant A tries to connect with participant B, the system resolves whether mutual exchange is allowed.

Factors:

- both approved
- both directory-visible or otherwise eligible
- both have networking enabled
- event-level policy allows participant networking

### FR7 - Mutual exchange action

If mutual exchange is allowed, the system can create a participant-to-participant exchange or connection record.

Recommendation:

- reuse the exchange model where practical, with participant context instead of node-only context

### FR8 - No hidden data leakage

Directory browsing must never reveal fields the participant did not mark as visible.

Mutual exchange must never reveal more than the consented exchange payload.

### FR9 - Organizer moderation controls

Organizer should be able to:

- hide participant from directory
- disable event-wide networking for the event if needed

Keep moderation simple for V2.

### FR10 - Directory and exchange truthfulness

The UX must clearly distinguish among:

- visible in directory
- available for mutual exchange
- already exchanged
- not available for networking

### FR11 - Compatibility with Phase 1 event-wide sharing

If a visitor in Phase 1 selected event-wide sharing, and later becomes a registered approved participant, the system should have a path to align that intent with participant networking.

This sprint does not need perfect migration of prior anonymous event-wide choices, but it must define a compatible model.

### FR12 - Participant self-service settings page

Approved participants should have a simple event-specific settings surface to manage:

- visibility
- visible fields
- networking participation

## Backend Scope

The backend scope for this sprint is the directory visibility and participant-to-participant networking layer.

### Database

Recommended additions to `EventRegistration` or a linked event participant settings model:

- `directoryVisibility: EventDirectoryVisibility`
- `networkingEnabled: Boolean`
- `visibleFields: Json`
- `directoryHiddenByOrganizer: Boolean`

Recommended enum:

- `EventDirectoryVisibility`
  - `HIDDEN`
  - `VISIBLE_TO_ALL_APPROVED`
  - `VISIBLE_TO_MUTUAL_ONLY`

Potential supporting model if needed:

- `ParticipantConnection`

Suggested fields if introduced:

- `id: String`
- `eventId: String`
- `fromRegistrationId: String`
- `toRegistrationId: String`
- `status: ParticipantConnectionStatus`
- `createdAt: DateTime`

Possible statuses:

- `PENDING`
- `ACCEPTED`
- `DECLINED`
- `AUTO_MATCHED`

Recommendation:

- if `AUTO_MUTUAL_IF_BOTH_OPTED_IN` is chosen, a separate connection model may still be useful for traceability
- if implementation can stay simpler by writing participant-scoped `Exchange` records, that may be preferable for V2

### Event settings additions

Recommended event-level controls:

- `directoryEnabled: Boolean`
- `participantNetworkingEnabled: Boolean`

### API module and service

Recommended endpoints:

- `PATCH /events/:id/directory-settings`
- `GET /events/:id/directory`
- `GET /events/:id/directory/:registrationId`
- `PATCH /events/:id/me/directory-settings`
- `POST /events/:id/directory/:registrationId/connect`

Optional:

- `DELETE /events/:id/directory/:registrationId/connect`
- `PATCH /events/:id/registrations/:registrationId/moderation`

### Service responsibilities

- enforce approved-only directory eligibility
- resolve participant visibility and visible fields
- enforce organizer moderation controls
- evaluate mutual networking compatibility
- persist participant connection or participant-scoped exchange result
- ensure no unauthorized browsing across events

### Validation rules

- only approved participants can appear in directory
- only approved participants can enable event networking
- visible fields must be from allowed set
- participants cannot modify another participant's directory settings
- participants cannot access another event's directory unless they are authorized members
- organizer moderation overrides participant visibility where needed

### Backend test scope

- directory eligibility tests
- approved-only visibility tests
- field visibility enforcement tests
- event membership access tests
- organizer moderation tests
- mutual compatibility tests
- connection or participant exchange creation tests

## Frontend Scope

The frontend scope for this sprint covers the participant directory, participant settings, and mutual exchange entry points.

### Organizer settings UX

Add event-level directory controls.

Recommended controls:

- enable participant directory
- enable participant networking
- short privacy explanation text

### Participant directory UX

Recommended route:

- event-specific participant directory page

The page should show:

- event context
- search bar
- role filters if useful
- participant cards
- clear empty state

### Participant card UX

Each card should show only visible fields.

Recommended elements:

- name
- company
- title
- role badge if relevant
- connect action if eligible
- state badge such as:
  - `Visible`
  - `Mutual enabled`
  - `Already connected`

### Participant settings UX

Recommended controls:

- `Appear in event directory`
- `Allow event networking`
- visible field toggles

The settings screen should explain the difference between being listed and sharing more details later.

### Mutual exchange UX

When a participant attempts to connect:

- show the target participant identity
- explain whether the exchange is mutual or request-based
- show what information becomes available if the connection succeeds

Keep this lightweight and explicit.

### Empty-state UX

Examples:

- `No participants are visible yet.`
- `Event networking is disabled for this event.`
- `You are approved for the event, but you are hidden from the directory.`

### Frontend technical scope

- reuse existing card/profile display patterns where possible
- keep event directory mobile-friendly
- avoid building an oversized social interface in V2

### Frontend test scope

- directory visible state
- hidden state
- approved-only access
- participant settings update flow
- connect action behavior
- empty states and disabled networking states

## Directory Access Strategy

Recommended V2 access rule:

- only approved participants and organizers can access the directory for an event

This prevents:

- public browsing of event members
- unapproved registrants viewing the network
- cross-event information leakage

## Mutual Exchange Strategy

Recommended V2 product decision:

- use explicit compatibility rules
- do not assume directory visibility alone means unrestricted contact access

Simple acceptable model:

- participant is visible in directory
- participant enables networking
- another approved participant can connect
- if both sides are compatible, create mutual participant exchange

This is enough for V2 without adding messaging or friend-request complexity.

## CRM And Reporting Impact

This sprint should define how participant-directory connections appear in reporting.

Recommended rule:

- participant-to-participant mutual exchanges should be distinguishable from stall or organizer exchanges

Suggested metadata additions:

- `exchangeContext: PARTICIPANT_DIRECTORY`
- `fromRegistrationId`
- `toRegistrationId`

Reporting should later be able to answer:

- how many participant connections occurred
- which roles were most active in networking
- how many approved participants opted into directory visibility

This sprint does not need a full analytics dashboard for directory networking, but it should keep the data shape ready.

## Privacy And Trust Requirements

- registration approval does not imply directory visibility
- directory visibility does not imply full contact disclosure
- only visible fields can appear in directory
- participant networking must stay inside event authorization boundaries
- organizer moderation must be able to override harmful or inappropriate visibility

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- approved-only access to the directory
- field visibility enforcement
- organizer moderation correctness
- cross-event access leakage
- mutual exchange compatibility logic
- truthfulness of participant settings UX

### Audit checklist

- can an unapproved participant see the directory?
- can a participant view another event's participants without membership?
- can hidden fields still be returned from the API?
- can a participant mark themselves visible when organizer moderation hides them?
- can mutual exchange occur when one side has networking disabled?
- does the UI imply contact access before mutual exchange actually occurs?
- are organizer and participant controls clearly separated?

## Fix Scope

Any issues found during audit that affect directory privacy, event membership boundaries, moderation, or mutual-exchange correctness must be fixed inside this sprint.

Must-fix categories:

- unapproved or unauthorized directory access
- hidden field leakage
- broken organizer moderation override
- cross-event data exposure
- false mutual exchange eligibility
- misleading participant settings or connect flow messaging

Can-defer categories only with explicit note:

- copy polish
- richer profile visuals
- advanced participant filters
- non-blocking layout refinement

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- approved-only access still holds
- hidden fields remain protected
- organizer moderation still works after fixes
- mutual compatibility still behaves correctly
- directory UI remains truthful and usable

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- event directory can be enabled or disabled by organizer
- only approved and eligible participants appear in the directory
- participants can manage their directory visibility preferences
- visible fields are enforced correctly
- mutual participant networking behaves according to explicit compatibility rules
- organizer moderation controls work
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for directory access, visibility, and mutual compatibility pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `007-p02-02C-organizer-and-exhibitor-operations.md` when:

- participant networking is trustworthy
- organizer controls are clear
- directory visibility and participant roles are stable enough for broader operations tooling

This sprint must not hand off as ready if:

- participant visibility is still leaking data
- mutual exchange is semantically unreliable
- organizer moderation is weak
- event membership boundaries are not enforced consistently

### What may continue in the next sprint

- organizer operations dashboard
- exhibitor staffing and role management
- participant lifecycle operational tooling
- richer event management surfaces

### What must not be pushed carelessly to the next sprint

- unresolved directory privacy bugs
- unresolved cross-event access issues
- unresolved participant moderation issues
- unresolved mutual exchange correctness gaps

## Dependencies

Technical dependencies:

- Sprint 005 registration and participant identity
- existing event and exchange foundation
- authenticated event membership checks

Product dependencies:

- agreement on whether mutual exchange is auto-compatible or request-based in V2
- agreement on visible field set
- agreement on who can access the directory beyond organizer and approved participants

## Non-Goals

- pass or badge generation
- event check-in
- live attendee map
- participant chat
- AI matchmaking

## Risks

### Risk 1 - Overexposure through directory defaults

If approved participants are made visible by default without clear consent, trust will drop quickly.

Mitigation:

- require explicit participant visibility preference and visible-field selection

### Risk 2 - Treating directory view as contact access

If the product blurs the line between seeing a profile and obtaining private contact info, privacy will be undermined.

Mitigation:

- keep directory fields and exchanged fields separate

### Risk 3 - Cross-event leakage

If event membership checks are weak, participants from one event may see another event's directory.

Mitigation:

- enforce event membership at API level on every directory read

### Risk 4 - Excess complexity in connection workflow

If mutual participant networking becomes too workflow-heavy, V2 delivery may slow unnecessarily.

Mitigation:

- keep the first version of connect behavior lightweight and explicit

## Open Questions

1. Should V2 use `AUTO_MUTUAL_IF_BOTH_OPTED_IN` or `REQUEST_MUTUAL_EXCHANGE` as the primary participant networking behavior?

2. Should exhibitors and sponsors always be visible when directory is enabled, or should they follow the same opt-in model as attendees?

3. Should participant role be visible in the directory by default?

4. How should prior anonymous event-wide sharing from Phase 1 be reconciled if the same person later becomes a registered participant?

## Recommended Implementation Notes

- Prefer explicit participant visibility settings over smart inference.
- Reuse the exchange model if it stays understandable; do not create parallel networking records unnecessarily.
- Keep event membership and privacy checks server-side.
- Optimize for trust and clarity over viral growth mechanics.
- Keep participant directory lighter than a social app.

## Acceptance Criteria

1. An organizer can enable a participant directory for an event.

2. Approved participants can control whether they appear in the directory.

3. Only approved, eligible participants can access and appear in the directory.

4. Directory-visible fields are enforced correctly.

5. Participants can initiate valid mutual networking actions according to the configured rules.

6. Organizer moderation can remove or hide participants from the directory.

7. The system is ready for the next sprint to add organizer and exhibitor operational tooling on top of a stable participant network.

## Definition Of Done

This sprint is complete when:

- participant directory exists
- participant visibility settings exist
- mutual participant networking flow exists in its chosen V2 form
- organizer moderation controls exist
- audit, fix, and re-audit are completed
- documentation clearly explains how organizer and exhibitor operations build on top of this participant-network foundation next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy participant networking and directory visibility

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat participant directory and mutual networking as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Approved participant directory access and visibility rules are enforced correctly
- Mutual participant networking behaves according to explicit consent rules
- Organizer operations can now build on a stable participant network layer

Deferred:

- Optional advanced participant filters
- Optional request-based networking refinement if not used in V2
```
