# Card Privacy V01 - 002 - P01 - 01B - Public Surface Enforcement

## Objective

Enforce the privacy model defined in `001-p01-01A-privacy-foundation.md` across the actual public card surfaces so card privacy becomes real product behavior rather than only stored configuration.

This sprint adds enforcement for:

- public card page access
- vCard download access
- lead form schema access
- lead submission access
- privacy-aware public response behavior

At the end of this sprint, a card's privacy settings should be honored consistently by both backend routes and frontend rendering paths.

## Problem

After the foundation sprint, Cards can store privacy settings, but the current public routes and public UI surfaces still behave largely as if cards are public by default.

Without public-surface enforcement:

- `cardVisibility` has no real effect on the public page
- `leadCapturePolicy` has no effect on public lead form or lead submission behavior
- `vcardPolicy` enforcement remains incomplete if `DISABLED` is added
- users may see blocked UI states in one place while direct endpoints still allow access
- privacy would be performative rather than trustworthy

This sprint is where the privacy model becomes a true backend and frontend access-control behavior.

## Product Intent

This sprint should make card privacy feel dependable.

The product promise is:

- if a card is members-only, the card page is actually protected
- if vCard download is disabled, the route is actually blocked
- if lead capture is members-only or disabled, the public form and submission path actually follow that rule
- users and visitors get truthful outcomes, not partial UI-only privacy

This sprint is not trying to perfect the editor UX yet. It is focused on correctness and consistency of enforcement.

## Sprint Scope

In scope:

- public card page access enforcement
- vCard endpoint enforcement updates
- public lead form fetch enforcement
- public lead submission enforcement
- privacy-aware API responses
- truth-preserving frontend handling of blocked surfaces
- compatibility with current public card rendering flow
- direct endpoint consistency across UI and API

Out of scope:

- full privacy editor redesign
- field-level visibility enforcement
- advanced audience rules
- analytics dashboards for privacy usage unless minimally needed later
- discovery/search suppression semantics beyond the core definition of `UNLISTED`

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

The sprint is not complete just because some public routes check privacy. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind known endpoint bypasses, mismatched UI/API behavior, or route-level privacy gaps that block dependable use of the feature, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must treat privacy as server-enforced policy first, UI behavior second.

That means:

- hiding a button is not enough
- not rendering a form is not enough
- backend routes must reject access when privacy says they should

Examples:

- if `vcardPolicy = DISABLED`, a direct request to `/public/cards/:handle/vcard` must fail
- if `leadCapturePolicy = MEMBERS_ONLY`, a public anonymous lead submission must fail even if someone bypasses the UI
- if `cardVisibility = MEMBERS_ONLY`, direct fetches to the public card data route must not reveal full card payload to anonymous users

## User Roles In This Sprint

Primary roles:

- Card owner
  - expects configured privacy to be enforced

- Anonymous visitor
  - may try to access card page, vCard, or lead form without sign-in

- Signed-in Dotly user
  - may qualify for members-only access depending on policy

## User Stories

### Card owner stories

1. As a card owner, I want privacy settings to be enforced by the system, not just shown in the editor.

2. As a card owner, I want members-only cards to block anonymous viewing.

3. As a card owner, I want disabled lead capture and disabled vCard download to fully prevent those actions.

### Visitor stories

1. As a visitor, I want to see a truthful blocked state if I do not have access, rather than broken or confusing behavior.

2. As a signed-in Dotly user, I want members-only actions to work when permitted.

### Platform stories

1. As the platform, I need route enforcement to match UI behavior.

2. As the platform, I need the privacy model to apply consistently across card data fetch, vCard download, lead form fetch, and lead submission.

## Enforcement Matrix

This sprint should define and implement an explicit enforcement matrix.

### Surface 1 - Public card page

Controlled by:

- `cardVisibility`

Expected behavior:

- `PUBLIC`
  - anonymous and signed-in users can access

- `UNLISTED`
  - anonymous and signed-in users can access if they have the URL
  - not a protected page mode

- `MEMBERS_ONLY`
  - signed-in users can access
  - anonymous users are blocked

### Surface 2 - vCard download

Controlled by:

- `vcardPolicy`

Expected behavior:

- `PUBLIC`
  - anyone can download

- `MEMBERS_ONLY`
  - only signed-in users can download

- `DISABLED`
  - download is blocked for everyone via public route

Owner-side export flows are a separate product surface and should not be confused with public route download behavior.

### Surface 3 - lead form schema access

Controlled by:

- `leadCapturePolicy`

Expected behavior:

- `PUBLIC`
  - anyone can fetch and render the form

- `MEMBERS_ONLY`
  - only signed-in users can fetch or use the lead form/connect flow

- `DISABLED`
  - public route should not provide usable lead form access

### Surface 4 - lead submission

Controlled by:

- `leadCapturePolicy`

Expected behavior:

- `PUBLIC`
  - anyone can submit

- `MEMBERS_ONLY`
  - anonymous users blocked
  - signed-in users allowed via authenticated or verified path

- `DISABLED`
  - submission blocked

## Functional Requirements

### FR1 - Enforce card visibility on public card payload route

The public card data route must respect `cardVisibility`.

Recommendation:

- `PUBLIC` and `UNLISTED` continue to resolve normally
- `MEMBERS_ONLY` requires authenticated access

If the current public route is unauthenticated only, this sprint must define the minimal authenticated path or equivalent access strategy needed to support members-only viewing.

### FR2 - Enforce card visibility on rendered public card page

The public card page must respect the backend access result and render a truthful blocked or allowed state.

The page must not leak full card content for anonymous users when the card is members-only.

### FR3 - Enforce vCard disabled state

If `vcardPolicy = DISABLED`, the public vCard route must reject access.

### FR4 - Preserve members-only vCard behavior

If `vcardPolicy = MEMBERS_ONLY`, the existing verified bearer-token behavior should remain valid.

### FR5 - Enforce lead form schema access

If `leadCapturePolicy = MEMBERS_ONLY` or `DISABLED`, the lead form schema public route must respond accordingly.

Recommendation:

- `MEMBERS_ONLY` should require signed-in context
- `DISABLED` should behave as unavailable, not like an empty form

### FR6 - Enforce lead submission access

If `leadCapturePolicy = MEMBERS_ONLY`, anonymous public lead submission must fail.

If `leadCapturePolicy = DISABLED`, public lead submission must fail.

### FR7 - Truthful response semantics

Blocked states should be semantically clear.

Examples:

- `401` or `403` for members-only actions depending on route semantics
- `404` only if product intentionally wants concealment behavior

Recommendation:

- choose one consistent blocked-access strategy per surface and document it clearly
- avoid mixing security theater with inconsistent UX

### FR8 - Avoid partial data leakage

If a route is blocked by privacy policy, it must not leak meaningful card data beyond what the chosen response contract allows.

### FR9 - Maintain current public behavior for unchanged policies

Cards that remain effectively public must continue working as before.

### FR10 - Wallet/public share compatibility review

This sprint must explicitly decide whether current wallet public routes should follow only `vcardPolicy`, `cardVisibility`, or their own future rule.

Recommendation for v01:

- if wallet pass is functionally a public contact artifact, it should be reviewed together with vCard behavior
- if uncertain, document the interim behavior and close the gap in a later sprint or this one if risk is high

### FR11 - Backend and frontend alignment

The card page, vCard action, and lead form UI must reflect actual backend access outcomes.

### FR12 - Direct endpoint auditability

This sprint must be testable through direct route access, not only through rendered pages.

## Backend Scope

The backend scope for this sprint is full enforcement of privacy policy on current public card-related endpoints.

### Routes in scope

At minimum, review and enforce:

- `GET /public/cards/:handle`
- `GET /public/cards/:handle/vcard`
- `GET /public/cards/:handle/lead-form`
- `POST /public/contacts` or the lead submission path used by public card flow
- wallet pass public routes if they should participate in privacy enforcement in v01

### Service-layer scope

- enforce `cardVisibility` inside public card retrieval logic
- enforce `vcardPolicy` including `DISABLED`
- enforce `leadCapturePolicy` in public lead-form fetch and lead submission logic
- avoid duplicate policy logic spread across too many places if a small helper can centralize it cleanly

### Authentication strategy scope

This sprint may need a practical approach for members-only public-card viewing.

Possible approaches:

- authenticated fetch path from web app using user token
- dual behavior in public route when auth header is present

Recommendation:

- prefer one consistent server-side privacy decision path rather than separate shadow routes for public vs member access unless clearly required

### Backend validation and error semantics

- policy checks must happen before sensitive payload is returned
- auth checks must be explicit
- error responses should be intentional and documented

### Backend test scope

- public card access by visibility policy
- vCard access by policy including `DISABLED`
- lead form fetch by lead-capture policy
- lead submission by lead-capture policy
- no-data leakage tests for blocked access
- compatibility tests for existing public cards

## Frontend Scope

The frontend scope for this sprint is enforcement-aware public rendering, not final UX polish.

### Public card page scope

- handle blocked card fetches truthfully
- render accessible blocked states for members-only cards
- avoid rendering stale card content if fetch is blocked

### vCard action scope

- hide or disable vCard download affordance when route is known to be blocked
- preserve authenticated members-only download flow
- handle disabled state truthfully

### Lead capture UI scope

- do not render the lead form when policy blocks it
- if members-only, show a truthful gated state rather than a broken form
- if disabled, remove or clearly disable the connect/lead action

### Frontend technical scope

- reuse existing auth token resolution patterns where possible
- keep public route handling consistent with the current card page architecture
- avoid inventing speculative UX while still keeping states understandable

### Frontend test scope

- public card blocked state
- members-only allowed state when signed in
- disabled vCard state
- blocked lead form state
- disabled lead capture state

## Response Strategy

This sprint should choose and document a response strategy for blocked access.

Two possible styles:

1. `Concealment-first`

- blocked cards may return `404`

2. `Truthful-gate-first`

- blocked cards may return `401` or `403`

Recommendation:

- for product clarity, prefer truthful-gate behavior where the UX needs to say `Sign in to view this card`
- for some low-level routes, concealment may still be acceptable if aligned intentionally

What matters most is consistency.

## Wallet And Related Surface Review

This sprint must not ignore adjacent public surfaces.

At minimum, review whether these should honor privacy directly or be documented as intentionally deferred:

- Apple wallet pass route
- Google wallet pass route
- share bars or direct contact artifact routes

If the team decides wallet routes follow `vcardPolicy`, that rule should be documented clearly.

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- route-by-route privacy enforcement
- direct endpoint bypass risk
- frontend/backend consistency
- accidental data leakage in blocked states
- wallet-related surface consistency if in scope

### Audit checklist

- can an anonymous user fetch a members-only card payload directly?
- can an anonymous user still download a disabled or members-only vCard by bypassing the UI?
- can an anonymous user fetch a members-only lead form schema?
- can an anonymous user submit a lead when lead capture is disabled or members-only?
- do blocked routes leak meaningful card data?
- do frontend states match actual backend behavior?
- do adjacent public artifact routes ignore privacy settings?

## Fix Scope

Any issues found during audit that affect privacy enforcement, data leakage, or UI/API consistency must be fixed inside this sprint.

Must-fix categories:

- route bypasses
- disabled route still accessible
- anonymous access to members-only surfaces
- blocked responses leaking sensitive card payload data
- misleading public UI states that contradict backend access rules

Can-defer categories only with explicit note:

- minor copy refinement
- blocked-state visual polish
- optional analytics on blocked attempts
- non-blocking wallet-route polish if clearly deferred and documented

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- blocked routes remain blocked
- public routes still work for allowed policies
- frontend and backend remain aligned
- no meaningful privacy regressions were introduced by fixes

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- public card page respects `cardVisibility`
- vCard route respects `vcardPolicy`, including `DISABLED`
- public lead form and submission respect `leadCapturePolicy`
- blocked access does not leak meaningful protected content
- frontend public states reflect backend enforcement truthfully
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for route enforcement and bypass resistance pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `003-p01-01C-editor-ux-and-blocked-states.md` when:

- route enforcement is trustworthy
- frontend blocked states are at least correct, even if not yet polished
- editor UX can build on real policy behavior instead of hypothetical behavior

This sprint must not hand off as ready if:

- endpoints can still be bypassed
- UI and backend disagree on privacy outcomes
- members-only and disabled semantics are still inconsistent

### What may continue in the next sprint

- card-editor privacy section
- clearer blocked-state copy and visuals
- owner-facing explanations and previews
- publish-time privacy awareness UX

### What must not be pushed carelessly to the next sprint

- unresolved route bypasses
- unresolved public data leakage
- unresolved contradictions between page gating and action gating

## Dependencies

Technical dependencies:

- Sprint 001 privacy foundation
- existing public card routes and lead-form routes
- existing auth-token resolution patterns in web app

Product dependencies:

- agreement on blocked response semantics
- decision on wallet/public artifact treatment in v01

## Non-Goals

- privacy editor redesign
- field visibility enforcement
- advanced discoverability suppression systems
- audience segmentation

## Risks

### Risk 1 - UI-only privacy

If privacy is enforced only in UI, direct route access will bypass it and users will lose trust.

Mitigation:

- make server enforcement primary

### Risk 2 - Inconsistent blocked semantics

If one route returns `404`, another `403`, and the UI says something else, privacy will feel broken.

Mitigation:

- choose and document a consistent response strategy

### Risk 3 - Adjacent surface drift

If wallet or related public artifact routes ignore privacy while card/vCard routes enforce it, the feature becomes incomplete.

Mitigation:

- explicitly review adjacent public surfaces in this sprint

### Risk 4 - Breaking current public cards

If enforcement accidentally applies to public defaults incorrectly, existing card sharing flows will regress.

Mitigation:

- preserve public behavior for default/public cards and test it directly

## Open Questions

1. Should members-only card page access use authenticated fetch against the same public route, or should a dedicated member-aware route exist?

2. Should blocked card page access return `404`, `401`, or `403` for anonymous visitors?

3. Should wallet public routes follow `cardVisibility`, `vcardPolicy`, or remain explicitly out of scope for v01?

4. Should `UNLISTED` have any runtime effect in this sprint beyond documenting that it is link-accessible and non-discoverable?

## Recommended Implementation Notes

- Prefer a small central policy resolution helper over scattered route-specific checks.
- Keep backend enforcement ahead of UI polish.
- Preserve current behavior for public cards.
- Use direct endpoint tests, not only page-level tests.
- Treat this sprint as the privacy correctness sprint.

## Acceptance Criteria

1. Public card page access is enforced according to `cardVisibility`.

2. vCard download is enforced according to `vcardPolicy`.

3. Lead form fetch and lead submission are enforced according to `leadCapturePolicy`.

4. Blocked routes do not expose protected card data.

5. The next sprint can focus on owner-facing privacy UX because enforcement is already real and dependable.

## Definition Of Done

This sprint is complete when:

- public route enforcement exists
- direct endpoint behavior is privacy-aware
- frontend blocked-state handling is correct
- audit, fix, and re-audit are completed
- documentation clearly explains how editor UX and blocked-state refinement will build on this enforcement next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy public privacy enforcement

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat public card privacy enforcement as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Public card, vCard, and lead-capture routes now enforce privacy consistently
- Blocked states are driven by backend truth, not UI-only assumptions
- Editor UX can now build on top of dependable privacy behavior

Deferred:

- Optional privacy-related blocked-attempt analytics
- Optional wallet-route refinement if documented separately
```
