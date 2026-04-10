# Card Privacy V01 - 001 - P01 - 01A - Privacy Foundation

## Objective

Establish the core privacy model for Cards so Dotly can support card-level access control beyond the current narrow `vcardPolicy` behavior.

This sprint creates the base domain and product contract for Card Privacy by defining:

- who can view a card page
- who can download a contact card or vCard
- who can submit a lead or connect through the card
- how privacy settings are stored and enforced across backend and frontend surfaces

At the end of this sprint, the platform should have a clear, extensible privacy model for Cards that later sprints can enforce on public routes and editor UX without ambiguity.

## Problem

The current product has only one narrow privacy control:

- `vcardPolicy`
  - `PUBLIC`
  - `MEMBERS_ONLY`

That means the current privacy story is incomplete.

Today:

- the public card page is still openly accessible
- the public lead form is still openly accessible
- wallet and share-related surfaces are not part of one unified privacy model
- privacy choices are not expressed as a complete card-level policy

Without a broader privacy foundation:

- users cannot meaningfully control who can see their card
- backend and frontend privacy enforcement can drift apart
- new privacy features would be bolted on inconsistently
- blocked states may become misleading because the product has no single privacy language

The platform needs a coherent privacy model before it starts enforcing privacy more broadly.

## Product Intent

Card Privacy should begin as a simple, understandable, and enforceable control system for core public card surfaces.

The product promise is:

- card owners can decide who sees the card
- card owners can decide who downloads their contact
- card owners can decide who can submit a lead or connect
- privacy settings are enforced consistently by both UI and API

This sprint is not trying to deliver advanced audience targeting or field-by-field secrecy yet. It is defining the foundational privacy contract.

## Sprint Scope

In scope:

- card visibility model
- vCard/download privacy model
- lead capture/privacy model
- privacy enum design
- card privacy storage shape
- API and DTO contract changes
- enforcement contract definition for future public routes
- migration and compatibility strategy for existing cards
- auditability and extensibility decisions

Out of scope:

- final public route enforcement behavior
- blocked public page UX
- editor UX implementation
- field-level visibility
- domain or organization-based audience rules
- expiring links or one-time access
- analytics of blocked attempts unless needed later

## Sprint Delivery Structure

Every Card Privacy sprint should be executable and reviewable through the same delivery frame used in Event Radar.

Required sections for every sprint:

- backend scope
- frontend scope
- audit scope
- fix scope
- re-audit scope
- GREEN criteria
- handoff decision: can the remaining work continue in the next sprint or not

### Sprint completion rule

The sprint is not complete just because the model is proposed or partly wired. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind known privacy-model ambiguity, migration risk, or contract-level gaps that block dependable enforcement in the next sprint, the work must not be treated as ready to continue.

If only non-blocking polish or deliberately deferred expansion remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must preserve separation among three different privacy concerns:

- card page visibility
- contact download privacy
- lead capture privacy

These must not collapse into one switch.

Examples:

- a card may be publicly viewable, but vCard download can be members-only
- a card may be publicly viewable, but lead capture can be disabled
- a card may be members-only while still allowing approved signed-in users to connect

If these concepts are merged into one global privacy flag, the product loses flexibility and later enforcement becomes brittle.

## User Roles In This Sprint

Primary roles:

- Card owner
  - controls privacy settings for a card

- Public visitor
  - may attempt to view a card, download contact, or submit lead information

- Signed-in Dotly user
  - may qualify for members-only actions depending on card policy

## User Stories

### Card owner stories

1. As a card owner, I want to control who can view my card so I can decide whether it is public, link-only, or members-only.

2. As a card owner, I want to control who can download my contact so I can avoid unrestricted vCard sharing.

3. As a card owner, I want to control who can send me lead information or connect through the card so I can reduce noise or keep interactions private.

4. As a card owner, I want privacy settings to be understandable and predictable so I know what happens when I publish a card.

### Platform stories

1. As the platform, I need a single privacy model that all card public surfaces can depend on.

2. As the platform, I need compatibility with existing `vcardPolicy` so existing cards do not break unexpectedly.

3. As the platform, I need backend-enforceable privacy rules so hiding something in the UI does not create a false sense of protection.

## Recommended Privacy Model

This sprint should define three distinct settings.

### 1. `cardVisibility`

Recommended values:

- `PUBLIC`
- `UNLISTED`
- `MEMBERS_ONLY`

Meaning:

- `PUBLIC`
  - card page can be opened by anyone with the URL

- `UNLISTED`
  - card page can still be opened by direct URL
  - card is treated as intentionally not discoverable in future listing or discovery contexts

- `MEMBERS_ONLY`
  - card page requires signed-in access

Recommendation for V1:

- treat `UNLISTED` as a routing and discovery policy, not as cryptographic secrecy
- be honest that direct-link holders can still access it

### 2. `vcardPolicy`

Recommended values:

- `PUBLIC`
- `MEMBERS_ONLY`
- `DISABLED`

Meaning:

- `PUBLIC`
  - anyone can download the vCard

- `MEMBERS_ONLY`
  - only signed-in Dotly users can download the vCard

- `DISABLED`
  - vCard download is disabled entirely

This extends the current model in a backward-compatible direction.

### 3. `leadCapturePolicy`

Recommended values:

- `PUBLIC`
- `MEMBERS_ONLY`
- `DISABLED`

Meaning:

- `PUBLIC`
  - anyone can submit the lead form or connect flow where supported

- `MEMBERS_ONLY`
  - only signed-in Dotly users can submit lead or connect actions

- `DISABLED`
  - lead capture and connect entry are disabled on the card

## Functional Requirements

### FR1 - Persist card visibility

The `Card` model should support a persisted visibility field.

It must be independent of publication state and independent of vCard download policy.

### FR2 - Extend vCard policy

The current `vcardPolicy` model should be extended to support `DISABLED`.

Compatibility requirement:

- existing cards using `PUBLIC` or `MEMBERS_ONLY` must continue to behave consistently after migration

### FR3 - Add lead capture policy

The `Card` model should support a persisted lead-capture privacy field.

This policy must be separate from `cardVisibility` and `vcardPolicy`.

### FR4 - DTO support

Card create/update APIs must support the new privacy settings in a validated way.

Validation requirements:

- enum values only
- optional fields remain backward-compatible where needed
- invalid values rejected cleanly

### FR5 - Public contract definition

This sprint must define how future public endpoints should interpret privacy settings.

Examples:

- public card page route depends on `cardVisibility`
- vCard route depends on `vcardPolicy`
- lead form and lead submission routes depend on `leadCapturePolicy`

This sprint does not need to enforce all of them yet, but the contract must be explicit.

### FR6 - Existing card migration strategy

This sprint must define safe defaults for existing cards.

Recommended migration defaults:

- `cardVisibility = PUBLIC`
- existing `vcardPolicy` preserved as-is
- `leadCapturePolicy = PUBLIC`

These defaults minimize breaking change risk.

### FR7 - Shared types support

Any shared frontend/backend card types should reflect the new privacy fields.

### FR8 - No hidden coupling to publication state

Privacy and publication should remain separate concepts unless the existing product contract makes a tighter relationship unavoidable.

Example:

- unpublished card is not public regardless of privacy settings
- published card still applies privacy settings on top of being published

### FR9 - Future extensibility

The privacy model must leave room for future additions such as:

- field-level visibility
- audience rules
- gated reveal or connection-based reveal

Without requiring the current core settings to be redesigned.

## Backend Scope

The backend scope for this sprint is the data and contract foundation for card privacy.

### Database

Recommended schema updates:

- add enum `CardVisibility`
  - `PUBLIC`
  - `UNLISTED`
  - `MEMBERS_ONLY`

- extend enum `VcardPolicy`
  - add `DISABLED`

- add enum `LeadCapturePolicy`
  - `PUBLIC`
  - `MEMBERS_ONLY`
  - `DISABLED`

- add fields to `Card`
  - `cardVisibility`
  - `leadCapturePolicy`

Recommended defaults:

- `cardVisibility = PUBLIC`
- `vcardPolicy = PUBLIC`
- `leadCapturePolicy = PUBLIC`

### DTO and validation scope

Update card DTOs to support:

- `cardVisibility`
- `vcardPolicy`
- `leadCapturePolicy`

Validation requirements:

- strict enum validation
- no silent coercion
- no invalid fallback on unknown values

### Service-layer scope

Service methods that return or update cards should include the new fields.

This sprint should also define helper logic or policy-resolution helpers if needed later, but should avoid overbuilding a large privacy service unless clearly necessary.

### Backend test scope

- schema and migration verification
- update-card DTO validation tests
- card create/update persistence tests for privacy fields
- backward-compatibility tests for existing cards
- type serialization tests if existing API contracts need coverage

## Frontend Scope

The frontend scope for this sprint is limited to type and contract readiness, not full editor UX.

In scope:

- update shared card types to include new privacy fields
- make card editing state capable of holding the new privacy settings
- ensure existing card-fetching and card-update flows can carry the new fields safely

Out of scope:

- final privacy editor UI
- final public blocked-state UI
- complete public enforcement

Recommendation:

- do only the minimum frontend wiring necessary for later sprints to implement editor UX cleanly

### Frontend test scope

- state shape compatibility tests if present
- verify existing card builder state can carry and save the new privacy fields without type breakage

## Data Model

Recommended Prisma additions:

### `CardVisibility`

- `PUBLIC`
- `UNLISTED`
- `MEMBERS_ONLY`

### `LeadCapturePolicy`

- `PUBLIC`
- `MEMBERS_ONLY`
- `DISABLED`

### Updated `VcardPolicy`

- `PUBLIC`
- `MEMBERS_ONLY`
- `DISABLED`

### `Card` additions

- `cardVisibility CardVisibility @default(PUBLIC)`
- `leadCapturePolicy LeadCapturePolicy @default(PUBLIC)`

## API Plan

Recommended update contract changes:

- `PATCH /cards/:id`
  - accepts `cardVisibility`
  - accepts `vcardPolicy`
  - accepts `leadCapturePolicy`

Create-card support may also be added if the create flow should immediately support privacy defaults.

Recommendation:

- even if create UI does not expose all controls yet, backend create path should remain compatible with defaults

### Example update payload

```json
{
  "cardVisibility": "UNLISTED",
  "vcardPolicy": "MEMBERS_ONLY",
  "leadCapturePolicy": "DISABLED"
}
```

### Example response shape

```json
{
  "id": "card_123",
  "handle": "jane-doe",
  "isActive": true,
  "cardVisibility": "UNLISTED",
  "vcardPolicy": "MEMBERS_ONLY",
  "leadCapturePolicy": "DISABLED"
}
```

## Migration Strategy

This sprint must treat existing cards carefully.

Recommended migration plan:

1. add new enums and fields with safe defaults
2. preserve current `vcardPolicy` values exactly
3. backfill `cardVisibility = PUBLIC`
4. backfill `leadCapturePolicy = PUBLIC`
5. ensure public card fetch and existing editor behavior remain unchanged until enforcement sprints land

Important rule:

- the model may land before full enforcement, but the enforcement contract must be explicit so the temporary state is understood and short-lived

## Compatibility Rules

- existing cards must remain publicly viewable until later enforcement sprint changes route behavior
- existing members-only vCard logic must continue to work
- no existing card should become inaccessible by surprise due to migration defaults

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- model correctness
- migration safety
- enum design clarity
- API backward compatibility
- absence of hidden coupling between privacy and unrelated card state

### Audit checklist

- do the three privacy concerns remain separate?
- can migration safely preserve existing cards?
- can invalid privacy values enter through DTOs?
- do shared types reflect the new fields correctly?
- is the enforcement contract explicit enough for the next sprint?
- does the model accidentally imply that `UNLISTED` is secret rather than link-based?

## Fix Scope

Any issues found during audit that affect privacy model correctness, migration safety, or API contract clarity must be fixed inside this sprint.

Must-fix categories:

- broken or ambiguous enum design
- unsafe migration defaults
- DTO validation gaps
- shared type mismatch
- accidental coupling of privacy settings to unrelated behavior

Can-defer categories only with explicit note:

- wording refinement in docs
- optional helper abstractions not yet needed
- non-blocking naming polish

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- schema remains stable
- migration remains safe
- DTO and type changes remain aligned
- next sprint can enforce public route privacy without redefining the model

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- privacy enums and fields are defined cleanly
- card persistence supports the new privacy model
- DTOs and shared types support the new privacy fields
- migration plan is safe for existing cards
- the privacy contract for public surfaces is explicitly documented
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for schema, DTO validation, and type compatibility pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `002-p01-01B-public-surface-enforcement.md` when:

- the privacy model is stable
- migration defaults are safe
- public route enforcement can build on the model without redesigning it

This sprint must not hand off as ready if:

- the three privacy concerns are still blurred together
- migration risk remains unclear
- API and shared types disagree on the contract

### What may continue in the next sprint

- public card page gating
- vCard endpoint enforcement updates
- lead form and lead submission gating
- privacy-aware blocked responses and states

### What must not be pushed carelessly to the next sprint

- ambiguous enum semantics
- unclear migration behavior
- unclear separation between page visibility and action privacy

## Dependencies

Technical dependencies:

- existing card schema and DTO pipeline
- current public card and lead-form routes
- shared types package

Product dependencies:

- agreement on `UNLISTED`
- agreement on `DISABLED` for vCard and lead capture
- agreement that field-level privacy is deferred

## Non-Goals

- full public route gating
- blocked-state page UX
- privacy editor visual design
- field-level privacy controls
- advanced audience segmentation

## Risks

### Risk 1 - Overloading one setting

If one privacy setting tries to govern all card behavior, the product will become inflexible and enforcement will be inconsistent.

Mitigation:

- keep page visibility, contact download, and lead capture separate

### Risk 2 - Breaking existing cards

If migration defaults are not safe, existing cards may unexpectedly become inaccessible or behave differently.

Mitigation:

- default new fields to current public behavior

### Risk 3 - Misleading `UNLISTED`

If the product implies `UNLISTED` is secure or secret, user expectations will be wrong.

Mitigation:

- document and message it as link-accessible, not secret

### Risk 4 - Premature complexity

If field-level privacy and advanced audience rules are added too early, the foundation may become bloated.

Mitigation:

- keep v01 focused on core privacy settings only

## Open Questions

1. Should `MEMBERS_ONLY` on `cardVisibility` hide the full card page, or only block interactive actions?

2. Should `DISABLED` for `vcardPolicy` fully remove download affordances, or can owners still preview/export privately in some contexts?

3. Should `leadCapturePolicy = MEMBERS_ONLY` allow only signed-in Dotly users to submit leads, or should it route them into a different connect flow?

4. Should create-card APIs explicitly accept these privacy fields now, or rely on defaults until editor UX lands?

## Recommended Implementation Notes

- Prefer minimal schema additions with clear names.
- Preserve backward compatibility by defaulting to today's public behavior.
- Update shared types early so later frontend sprints are smoother.
- Treat this sprint as contract foundation, not enforcement completion.
- Keep enforcement rules documented so the temporary transition state is understood.

## Acceptance Criteria

1. The Card model supports card visibility, vCard privacy, and lead-capture privacy as separate concepts.

2. Existing cards migrate safely without unexpected behavior changes.

3. Card update contracts support the new privacy settings.

4. Shared types support the new privacy fields.

5. The privacy foundation is stable enough for the next sprint to enforce public route behavior.

## Definition Of Done

This sprint is complete when:

- privacy enums and fields exist
- DTO and shared type support exists
- migration strategy is documented and safe
- audit, fix, and re-audit are completed
- documentation clearly explains how public-surface enforcement will build on this foundation next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of a stable card privacy model

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat the card privacy contract as stable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Card privacy settings are modeled cleanly and separately
- Migration defaults are safe for existing cards
- Public route enforcement can now build on a stable privacy contract

Deferred:

- Optional field-level privacy direction
- Optional advanced audience rules for later versions
```
