# Card Privacy V01 - 003 - P01 - 01C - Editor UX And Blocked States

## Objective

Turn the privacy model and enforcement behavior from the first two sprints into a clear, trustworthy user experience for both card owners and visitors.

This sprint adds:

- privacy controls in the card editor
- owner-facing explanations of each privacy setting
- privacy-aware preview and publish guidance
- public blocked states for protected card surfaces
- truthful gating and disabled-action messaging

At the end of this sprint, Card Privacy should feel understandable and intentional rather than technically correct but confusing.

## Problem

After Sprint 002, the backend and public surfaces can enforce card privacy, but the product may still feel unclear if owners and visitors do not understand:

- what each privacy setting does
- how card visibility differs from vCard privacy
- how lead capture privacy differs from page privacy
- why a public visitor is blocked from a surface
- what actions are available after sign-in versus fully disabled

Without editor UX and blocked-state refinement:

- card owners may misconfigure privacy
- visitors may interpret privacy blocks as broken pages
- members-only and disabled states may feel inconsistent
- privacy becomes a support burden instead of a confidence feature

This sprint is what makes card privacy usable.

## Product Intent

This sprint should make Card Privacy feel simple and trustworthy.

The product promise is:

- card owners can understand the effect of each setting before publishing
- privacy controls use plain language instead of technical jargon
- visitors see clear blocked states instead of ambiguous failures
- members-only and disabled actions are clearly differentiated

This sprint is not about new privacy power. It is about making the existing power understandable and usable.

## Sprint Scope

In scope:

- card-editor privacy section
- privacy setting labels and descriptions
- publish-time privacy awareness
- public blocked-state UX for card page
- public blocked-state UX for vCard and lead capture actions
- members-only prompts and disabled-state messaging
- owner preview hints where useful
- consistency of language across all card privacy surfaces

Out of scope:

- field-level privacy controls
- advanced audience segmentation
- analytics dashboards for privacy use
- privacy automation or recommendations
- admin moderation workflows

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

The sprint is not complete just because controls exist visually. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind known UX ambiguity, misleading copy, or blocked-state confusion that causes users to misinterpret privacy behavior, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must preserve the difference among three owner decisions:

- who can view the card
- who can download the contact
- who can send or submit contact details

These decisions should be visible as separate settings in the editor and separate outcomes in the public experience.

Examples:

- `Members only` for the card page is not the same as `Members only` for vCard download
- `Disabled` on lead capture is not the same as `Members only`
- `Unlisted` means link-accessible, not protected

If the UX blurs these distinctions, users will make incorrect assumptions.

## User Roles In This Sprint

Primary roles:

- Card owner
  - configures privacy settings
  - needs to understand effects before publishing

- Anonymous visitor
  - may encounter blocked page or blocked actions

- Signed-in Dotly user
  - may gain members-only access to some surfaces

## User Stories

### Card owner stories

1. As a card owner, I want all privacy settings grouped clearly so I do not have to infer behavior from separate unrelated controls.

2. As a card owner, I want plain-language descriptions of each privacy level so I can choose confidently.

3. As a card owner, I want to understand how privacy affects the public card page, contact download, and lead capture separately.

4. As a card owner, I want to know if a setting blocks anonymous access, signed-in access, or everyone.

### Visitor stories

1. As a visitor, I want blocked states to explain whether I should sign in, request access, or stop trying because the feature is disabled.

2. As a signed-in user, I want members-only actions to feel intentionally unlocked rather than randomly broken.

### Platform stories

1. As the platform, I need privacy language to stay consistent across card page, lead capture, and vCard flows.

2. As the platform, I need the UI to accurately reflect backend enforcement without overpromising access.

## UX Model

This sprint should introduce a dedicated `Card Privacy` section in the card editor.

Recommended settings groups:

### 1. Card visibility

Question:

- `Who can view this card?`

Options:

- `Public`
- `Unlisted`
- `Members only`

Owner guidance:

- `Public`: anyone with the link can open your card
- `Unlisted`: your card is accessible by direct link, but intended to stay out of discovery surfaces
- `Members only`: only signed-in Dotly users can open the card

### 2. Contact download

Question:

- `Who can download your contact?`

Options:

- `Public`
- `Members only`
- `Disabled`

Owner guidance:

- `Public`: anyone can save your contact
- `Members only`: only signed-in Dotly users can download your contact
- `Disabled`: no one can download your public contact card from the card page

### 3. Lead capture and connect

Question:

- `Who can send you their details?`

Options:

- `Public`
- `Members only`
- `Disabled`

Owner guidance:

- `Public`: anyone can submit your lead form or connect flow
- `Members only`: only signed-in Dotly users can submit details
- `Disabled`: visitors cannot send details through this card

## Functional Requirements

### FR1 - Card privacy section in editor

The card editor must include a dedicated privacy section rather than scattering privacy controls across unrelated tabs.

Recommendation:

- keep privacy grouped near existing profile/contact-sharing settings unless a dedicated tab becomes necessary later

### FR2 - Clear setting descriptions

Each privacy option must explain its effect in plain language.

Descriptions should emphasize:

- page access
- sign-in requirements
- whether the action is completely disabled

### FR3 - Distinguish members-only from disabled

The UI must clearly distinguish:

- `Members only`
  - action available to signed-in Dotly users

- `Disabled`
  - action unavailable to everyone through the public card surface

### FR4 - Distinguish public from unlisted

The UI must explain that `Unlisted` is link-accessible and is not a secure or private-by-link feature.

### FR5 - Preview or summary guidance

When a card owner changes privacy settings, the editor should show a concise summary of what visitors will experience.

Example:

- `Visitors can view this card, but only signed-in Dotly users can download your contact.`

### FR6 - Publish awareness

If the card is active or publishable, the UI should make it clear how privacy affects the live card.

This does not need a complex confirmation modal, but privacy should not be invisible at publish time.

### FR7 - Public blocked card state

If a visitor reaches a members-only card page without access, the public experience must show a clear blocked state.

Recommended content:

- that the card is available to Dotly members only
- sign-in prompt if sign-in can unlock access
- no misleading implication that the card is broken or deleted

### FR8 - Public blocked vCard state

If vCard download is members-only or disabled, the UI should explain the difference:

- `Sign in to save this contact`
- `Contact download is not available for this card`

### FR9 - Public blocked lead-capture state

If lead capture is members-only or disabled, the UI should:

- avoid rendering a misleading open form
- show a sign-in prompt if members-only
- show a disabled/unavailable explanation if disabled

### FR10 - Truthful action affordances

Buttons and CTAs must reflect actual backend behavior.

Examples:

- do not show active `Save Contact` button if policy is disabled
- do not show a public lead form if submission is blocked

### FR11 - Accessibility and clarity

Blocked states and privacy controls must remain understandable for keyboard and screen-reader users.

### FR12 - Copy consistency

The words used for privacy states should remain consistent across:

- editor
- public card page
- sheets/modals
- action bars

## Backend Scope

The backend scope for this sprint is limited.

Primary backend needs:

- ensure current API responses expose privacy fields consistently for editor and public rendering
- support any additional summary or policy text only if truly needed

Recommendation:

- do not add new backend privacy logic in this sprint unless required to support truthful UX
- most enforcement should already exist from Sprint 002

### Backend test scope

- verify card payload includes privacy fields needed by editor/public UI
- verify any policy-related response shape changes remain backward-compatible

## Frontend Scope

The frontend scope for this sprint is the main implementation surface.

### Editor UX scope

- add `Card Privacy` section to card editor
- render three privacy groups:
  - card visibility
  - contact download
  - lead capture and connect
- support updating and saving each value
- show concise helper text and state-specific descriptions
- show summary or preview text for current configuration

### Public card page scope

- render members-only blocked page or panel for protected cards
- avoid leaking protected content in blocked state
- preserve truthful allowed-state behavior for public and unlisted cards

### vCard interaction scope

- update existing save-contact affordances to reflect:
  - public allowed
  - members-only gated
  - disabled unavailable

### Lead capture interaction scope

- update lead modal/connect entry to reflect:
  - public form
  - members-only gated form/connect flow
  - disabled no-entry state

### Frontend technical scope

- reuse existing builder patterns in `ProfileTab` or split into a dedicated privacy section if it improves clarity
- reuse existing members-only sheet/prompt patterns where possible
- avoid overcomplicated setting wizards

### Frontend test scope

- editor privacy control rendering
- save/update behavior for privacy settings
- blocked card page state
- blocked and disabled vCard behavior
- blocked and disabled lead capture behavior
- copy consistency across states

## Editor Information Architecture

Recommended approach for v01:

- keep privacy inside the existing card editor rather than creating a separate settings app

Two acceptable UI shapes:

1. Extend existing `ProfileTab`
2. Add dedicated `Privacy` section or subpanel in the editor

Recommendation:

- if the current `ProfileTab` is still manageable, extend it carefully
- if privacy controls make the section too dense, introduce a dedicated `Privacy` tab

The goal is clarity, not forced minimalism.

## Blocked-State Strategy

This sprint should define a consistent public blocked-state language model.

Recommended blocked-state families:

### `Members-only gate`

Use when:

- sign-in may unlock access

Copy pattern:

- `This card is available to signed-in Dotly members.`
- `Sign in to continue.`

### `Disabled action`

Use when:

- the owner has intentionally disabled the action for everyone

Copy pattern:

- `Contact download is not available for this card.`
- `This card is not accepting contact submissions.`

### `Unlisted explanation`

This is mainly owner-facing, not visitor-facing.

Copy pattern:

- `Unlisted cards can still be opened by anyone who has the link.`

## Privacy Summary UX

This sprint should consider a compact summary block for owners.

Example summary lines:

- `Card page: Members only`
- `Contact download: Disabled`
- `Lead capture: Public`

Or a sentence form:

- `Only signed-in Dotly users can view this card. Contact download is disabled. Anyone can send details if they have access to the card.`

This helps reduce misconfiguration.

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- editor clarity
- blocked-state truthfulness
- consistency between owner-facing copy and real behavior
- accessibility of privacy controls and blocked states
- mismatch risk between disabled and members-only messaging

### Audit checklist

- does the editor clearly separate page visibility, vCard privacy, and lead capture privacy?
- does `Unlisted` avoid implying secret or protected access?
- do blocked states explain whether sign-in can help?
- do disabled states avoid suggesting that sign-in can help?
- do buttons and affordances match real backend behavior?
- are privacy controls understandable without internal knowledge of Dotly?
- are screen-reader labels and keyboard behavior acceptable?

## Fix Scope

Any issues found during audit that affect user understanding, privacy truthfulness, or action-state clarity must be fixed inside this sprint.

Must-fix categories:

- misleading editor descriptions
- confusing blocked-state copy
- disabled vs members-only ambiguity
- action affordances that contradict backend policy
- inaccessible privacy controls or blocked states

Can-defer categories only with explicit note:

- visual polish
- optional microcopy refinement
- non-blocking preview enhancements
- optional publish-warning niceties

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- owners can understand settings correctly
- visitors can understand blocked states correctly
- UI still reflects backend enforcement truthfully
- privacy controls remain accessible and consistent

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- card editor has a clear privacy section
- privacy settings are understandable in plain language
- public blocked states are truthful and non-misleading
- disabled and members-only outcomes are clearly differentiated
- action affordances match backend privacy behavior
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for editor UX, blocked states, and copy consistency pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `004-p01-01D-audit-consistency-and-rollout.md` when:

- privacy UX is clear
- blocked-state behavior is understandable
- product messaging matches real enforcement consistently enough for full closeout audit

This sprint must not hand off as ready if:

- owners still misread the settings
- blocked states remain confusing
- public UI still contradicts backend policy in visible ways

### What may continue in the next sprint

- route-by-route consistency audit
- rollout and migration checks
- adjacent surface review
- final GREEN closeout for privacy v01

### What must not be pushed carelessly to the next sprint

- unresolved ambiguous privacy copy
- unresolved disabled vs members-only confusion
- unresolved inaccessible control states

## Dependencies

Technical dependencies:

- Sprint 001 privacy foundation
- Sprint 002 public surface enforcement
- existing card editor and public card UI surfaces

Product dependencies:

- agreement on final user-facing privacy language
- agreement on whether privacy lives in `ProfileTab` or a dedicated editor section

## Non-Goals

- field-level privacy UI
- advanced audience targeting
- blocked-attempt analytics dashboards
- account-wide privacy defaults

## Risks

### Risk 1 - Correct but confusing

If privacy is enforced correctly but explained poorly, users will distrust the feature and configure it wrongly.

Mitigation:

- prioritize plain language and state summaries

### Risk 2 - Overloading one tab

If the editor becomes too dense, privacy controls may get ignored or misunderstood.

Mitigation:

- choose the simplest layout that still preserves clarity

### Risk 3 - Misleading disabled states

If disabled actions look temporarily unavailable rather than intentionally off, visitors may think the site is broken.

Mitigation:

- use explicit disabled-state messaging

### Risk 4 - Inconsistent wording

If one surface says `members only`, another says `private`, and another says `sign in required`, the product feels inconsistent.

Mitigation:

- establish consistent labels and reuse them everywhere

## Open Questions

1. Should privacy controls remain inside `ProfileTab`, or should v01 introduce a dedicated `Privacy` tab?

2. Should blocked card-page state offer only sign-in, or also a `go back` / `return` secondary action?

3. Should the editor show a live privacy summary sentence, badges, or both?

4. Should members-only lead capture route signed-in users into the current connect flow or a dedicated privacy-aware flow?

## Recommended Implementation Notes

- Prefer clarity over compactness in the editor.
- Reuse existing members-only interaction patterns where they are already understandable.
- Keep blocked-state copy explicit and honest.
- Do not add more privacy power in this sprint; focus on usability of the existing model.
- Treat this sprint as the trust and comprehension layer.

## Acceptance Criteria

1. Card owners can understand and configure card privacy settings without guessing.

2. Visitors encounter truthful blocked states for protected card surfaces.

3. Members-only and disabled actions are clearly differentiated in the UI.

4. Privacy UX is strong enough for a final consistency audit and rollout sprint.

## Definition Of Done

This sprint is complete when:

- privacy controls are implemented in the editor
- blocked-state UX exists for the main public surfaces
- copy consistency is established
- audit, fix, and re-audit are completed
- documentation clearly explains how the final audit, consistency, and rollout sprint will close Card Privacy v01

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may close Card Privacy v01 with final consistency and rollout checks

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat card privacy UX as trustworthy

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Card owners can understand privacy settings clearly
- Public blocked states are truthful and consistent
- Final rollout audit can now focus on completeness rather than basic comprehension

Deferred:

- Optional privacy-summary preview enhancements
- Optional visual polish for blocked-state surfaces
```
