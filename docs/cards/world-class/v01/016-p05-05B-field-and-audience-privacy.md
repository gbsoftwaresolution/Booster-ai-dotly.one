# World Class Cards V01 - 016 - P05 - 05B - Field And Audience Privacy

## Objective

Extend core card privacy into more granular trust controls so card owners can decide not only who can access the card, but which information is visible and to which audience.

This sprint builds on:

- `docs/cards/privacy/v01/README.md`
- `015-p05-05A-privacy-pack-completion.md`

It adds:

- field-level visibility controls
- audience-aware privacy rules
- selective reveal behavior for sensitive fields
- privacy-aware rendering across public and authenticated card surfaces
- stronger trust controls that prepare the product for dynamic personalization later

At the end of this sprint, Dotly should support a more realistic privacy model where card owners can control what is shown, not just whether the page is accessible.

## Problem

Core privacy can already answer:

- who can view the card
- who can download contact details
- who can submit lead or connect actions

But that still leaves an important gap.

Without field and audience privacy:

- sensitive data may be overexposed once access is granted
- owners must choose between fully visible or overly restricted cards
- dynamic card personalization later could become unsafe because the product cannot yet express what specific information different audiences may see
- business and personal use cases remain less flexible than they should be

The platform needs a middle layer between `page-level access` and `full data exposure`.

## Product Intent

This sprint should make Dotly feel more precise and trustworthy.

The product promise is:

- owners can hide sensitive fields without hiding the whole card
- owners can shape what different audiences are allowed to see
- field visibility is intentional, understandable, and enforceable
- future personalization can build on field visibility rules instead of bypassing them

This sprint is not trying to implement unlimited rule complexity. It is introducing practical, controlled granularity.

## Sprint Scope

In scope:

- field-level visibility controls
- audience-aware visibility model
- privacy-aware rendering of card fields
- separation between `visible`, `hidden`, and `conditional` field states
- backend enforcement contract for visible field payloads
- owner-facing privacy editor additions

Out of scope:

- fully dynamic rule builder
- revocable per-recipient access histories
- highly granular enterprise policy engines
- adaptive personalization logic that changes fields by behavior in real time

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

The sprint is not complete just because field toggles exist in the editor. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind field leakage, audience-rule ambiguity, or rendering inconsistency that blocks dynamic-card work later, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must keep `page access`, `action privacy`, and `field visibility` separate.

That means:

- a person may be allowed to open the card page
- a person may still be blocked from downloading contact
- some card fields may still remain hidden even when the page is visible

Examples:

- name and role may be public
- phone and email may be members-only
- address may be hidden entirely

If field privacy is merged into page visibility, the product loses most of the value of granular trust controls.

## User Roles In This Sprint

Primary roles:

- Card owner
  - wants to control what information different audiences can see

- Public visitor
  - may see a partial but still useful version of the card

- Signed-in Dotly user
  - may qualify for richer visibility than anonymous users

- Platform
  - needs field-level trust controls before dynamic personalization becomes safe

## User Stories

### User stories

1. As a card owner, I want to hide sensitive fields like phone or email without hiding the whole card.

2. As a card owner, I want some information to be visible only to signed-in members or approved audiences.

3. As a visitor, I want the card to still feel coherent even when some fields are hidden.

4. As a user, I want privacy settings to be understandable and not require me to think like an engineer.

### Platform stories

1. As the platform, I need a structured field-visibility model that can later support context-aware personalization.

2. As the platform, I need field privacy enforced by the server, not only by UI rendering choices.

3. As the platform, I need audience visibility semantics to remain compatible with the core privacy pack.

## Field Visibility Model

This sprint should define field-level visibility states.

Recommended V1 states:

- `VISIBLE`
- `HIDDEN`
- `MEMBERS_ONLY`

Optional future state:

- `AUDIENCE_RULED`

Recommendation for V1:

- implement `VISIBLE`, `HIDDEN`, and `MEMBERS_ONLY`
- reserve more advanced audience rules for simple named audiences or a lightweight policy layer, not a complex rule builder

## Audience Model

This sprint should define a limited audience concept.

Recommended V1 audiences:

- `PUBLIC`
- `SIGNED_IN_MEMBERS`

Optional future-ready audience groups:

- `TEAM_SHARED`
- `EVENT_PARTICIPANTS`
- `CONNECTED_CONTACTS`

Recommendation:

- keep the initial audience model narrow and compatible with current auth/access reality

## Functional Requirements

### FR1 - Per-field visibility settings

The card model or a related privacy config must support per-field visibility.

Recommended initial fields:

- email
- phone
- address or location
- website if needed
- company
- title

Recommendation:

- start with the most sensitive and commonly relevant fields

### FR2 - Public payload filtering

The server must filter card payloads according to field-visibility settings before rendering public or member-aware card responses.

### FR3 - Members-only field rendering

When a field is marked `MEMBERS_ONLY`, anonymous users should not receive that field value, while authenticated qualified users may.

### FR4 - Hidden field rendering

When a field is `HIDDEN`, it must not appear in the card payload or UI for the relevant public surface.

### FR5 - Owner editing UX

The card editor must allow owners to set field visibility without overwhelming them.

### FR6 - Coherent card rendering

The card page must still look intentional and understandable when some fields are hidden.

### FR7 - No privacy downgrade through alternate actions

If a field is hidden on the card page, related public surfaces must not leak it indirectly.

Examples:

- hidden phone should not still appear via alternate payload fragments
- hidden email should not still be rendered in a visible contact block

### FR8 - Core privacy compatibility

Field-level visibility must work on top of existing page and action privacy, not replace them.

### FR9 - Owner preview clarity

Owners should be able to understand how the card differs for public vs members-only viewers.

### FR10 - Data-model extensibility

The model must leave room for future audience states like connected contacts or event participants.

### FR11 - Access control correctness

Authenticated member-aware field visibility must respect actual signed-in access state and not treat any request as entitled by default.

### FR12 - Dynamic-card compatibility

The output model must be usable by the next sprint's dynamic card modes without weakening privacy rules.

## Backend Scope

The backend scope for this sprint is field filtering and field-visibility contract definition.

### Data model scope

Potential additions:

- per-field visibility metadata on card profile fields
- or a JSON-based `fieldVisibility` structure keyed by field name

Recommendation:

- use a simple structured JSON config if it keeps the implementation compact and explicit
- avoid adding many narrowly scoped columns unless the current schema strongly prefers them

### Service-layer scope

Recommended backend work:

- apply field visibility filtering to public/member-aware card payloads
- expose current field-visibility settings to the editor
- validate allowed field keys and values

### API scope

Potential update points:

- card update endpoints
- public card fetch endpoints
- member-aware card fetch behavior

### Validation scope

- only supported field keys can be configured
- visibility states must be valid
- hidden fields must not leak through raw payloads
- members-only fields must require actual authenticated access

### Backend test scope

- field-visibility filtering tests
- public vs signed-in payload tests
- hidden-field leakage tests
- update validation tests

## Frontend Scope

The frontend scope for this sprint is privacy controls and privacy-aware card rendering.

### Editor UX

Recommended controls:

- per-field visibility selectors for supported fields
- grouped inside card privacy settings, not scattered randomly

### Public/member-aware rendering UX

The card should:

- omit hidden fields cleanly
- show members-only gated treatment where appropriate
- avoid awkward empty gaps or broken layouts

### Preview UX

Recommended owner preview options:

- `Public view`
- `Member view`

This can be lightweight in V1 but should help owners understand the result.

### Frontend technical scope

- reuse existing card renderer and privacy controls where possible
- avoid a heavy rule-building interface

### Frontend test scope

- field visibility control rendering
- public vs member view rendering
- hidden-field layout behavior
- members-only gated field behavior

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- hidden-field leakage risk
- members-only visibility correctness
- editor clarity
- rendering coherence when fields are removed
- compatibility with core privacy behavior

### Audit checklist

- can hidden fields still leak through payloads?
- are members-only fields visible only to correctly authenticated users?
- does the editor clearly distinguish page privacy from field privacy?
- does the card still render coherently when sensitive fields are hidden?
- do alternate UI surfaces still expose hidden values accidentally?

## Fix Scope

Any issues found during audit that affect field secrecy, audience correctness, editor clarity, or rendering consistency must be fixed inside this sprint.

Must-fix categories:

- hidden-field leakage
- broken members-only field gating
- confusing privacy editor semantics
- incoherent card rendering after field removal
- field visibility behavior that contradicts core privacy rules

Can-defer categories only with explicit note:

- richer audience types
- more advanced preview modes
- non-blocking layout polish

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- field visibility remains safe and understandable
- rendering remains coherent
- the next dynamic-card sprint can now build on a stronger trust layer rather than working around missing controls

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- per-field visibility exists for the targeted field set
- payload filtering is enforced correctly
- hidden fields do not leak
- members-only fields work correctly
- owner editing UX is understandable
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for filtering, rendering, and auth-based visibility pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `017-p05-05C-dynamic-card-modes-foundation.md` when:

- field-level trust controls are stable
- audience visibility is explicit enough to support mode-based rendering later
- dynamic modes can now build on privacy-aware output rather than bypassing privacy

This sprint must not hand off as ready if:

- hidden fields can still leak
- audience semantics remain too ambiguous
- editor controls are still confusing enough to misconfigure privacy

### What may continue in the next sprint

- dynamic card mode presets
- context-aware card layouts
- mode-specific surface rendering

### What must not be pushed carelessly to the next sprint

- unresolved hidden-field leakage
- unresolved audience ambiguity
- unresolved field-level trust contradictions

## Dependencies

Technical dependencies:

- core Card Privacy v01 baseline
- current card renderer and editor surfaces

Product dependencies:

- agreement on initial field set
- agreement on whether audience model stays limited to signed-in members for V1

## Non-Goals

- highly granular rule engine
- connected-contact-only gating
- event-participant-only gating
- dynamic personalization logic

## Risks

### Risk 1 - Hidden field leakage

If field-level privacy leaks through payloads or alternate UI paths, trust will be damaged more than if the feature did not exist.

Mitigation:

- enforce filtering server-side first

### Risk 2 - Overcomplicated privacy controls

If the editor becomes too complex, owners will misconfigure privacy.

Mitigation:

- start with a small field set and simple states

### Risk 3 - Confusion with page-level privacy

If users think hiding fields is the same as restricting card access, the product will feel inconsistent.

Mitigation:

- keep field privacy clearly separated in UX and copy

### Risk 4 - Dynamic-mode conflict later

If field privacy is not modeled clearly now, dynamic modes later may accidentally override or ignore it.

Mitigation:

- define field visibility as a hard constraint for later rendering modes

## Open Questions

1. Which fields should be included in the first field-visibility set?

2. Should `company` and `title` be considered privacy-sensitive in V1, or only direct contact fields like email and phone?

3. Is `MEMBERS_ONLY` enough as the first audience distinction, or do we need another audience bucket immediately?

4. Should the UI show hidden field placeholders to owners only, or fully omit them in preview?

## Recommended Implementation Notes

- Keep the initial field set small and high-value.
- Filter at the API layer, not only at render time.
- Preserve clarity between page access and field visibility.
- Treat this sprint as the missing trust layer before dynamic modes begin.

## Acceptance Criteria

1. Owners can control visibility of key fields independently from page access.

2. Hidden and members-only fields are enforced safely.

3. The card still renders coherently under field-level privacy.

4. Dynamic card modes can safely build on top of these controls in the next sprint.

## Definition Of Done

This sprint is complete when:

- field-level visibility controls exist
- payload filtering exists
- editor support exists
- audit, fix, and re-audit are completed
- documentation clearly explains how dynamic card modes will build on this field-privacy layer next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy field and audience privacy

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat field-level privacy as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Owners can now control what data is visible, not just who can open the card
- Field-level trust rules are enforced safely
- Dynamic card modes can now build on a privacy-aware rendering foundation

Deferred:

- Optional richer audience types
- Optional more advanced preview states
```
