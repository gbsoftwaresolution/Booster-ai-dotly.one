# World Class Cards V01 - 017 - P05 - 05C - Dynamic Card Modes Foundation

## Objective

Introduce dynamic card modes so a single card can present different intentional versions of identity, content, and call-to-action depending on business context, while still respecting core and field-level privacy rules.

This sprint builds on:

- `015-p05-05A-privacy-pack-completion.md`
- `016-p05-05B-field-and-audience-privacy.md`

It adds:

- card mode model
- mode-specific content presets
- privacy-safe mode rendering contract
- owner-facing mode configuration foundations
- context-neutral mode switching rules

At the end of this sprint, Dotly should support the idea that one person can have one card identity with multiple intentional presentations, instead of forcing every use case into one static card layout.

## Problem

Cards today tend to behave as one static public surface.

That creates obvious limitations:

- one card has to serve networking, sales, hiring, event, and follow-up contexts at once
- owners either overload the card with too much information or remove useful context to stay generic
- privacy controls can reduce exposure, but they do not yet create purposeful context variants
- future personalization work has no stable mode concept to build on

Without dynamic card modes:

- Dotly remains less adaptive than it should be
- context-aware sharing becomes brittle and overly manual
- card experiences stay flatter than the underlying product capability deserves

The platform needs a foundation for purposeful card variants that remain understandable to owners and safe under the privacy model.

## Product Intent

This sprint should make Cards feel intentional and context-aware.

The product promise is:

- one card can support multiple business contexts cleanly
- owners can choose purposeful modes instead of maintaining many near-duplicate cards
- modes enhance relevance without weakening privacy guarantees
- later personalization can build on explicit mode semantics instead of inventing ad hoc rendering logic

This sprint is not trying to make the card automatically adapt to every visitor yet. It is introducing the mode system and its rendering foundation first.

## Sprint Scope

In scope:

- card mode model
- mode presets and naming
- mode-specific content configuration foundation
- mode-aware rendering contract
- privacy-aware mode resolution rules
- owner UX for configuring and selecting modes
- analytics and attribution compatibility with mode rendering

Out of scope:

- fully automatic visitor-specific mode switching
- advanced rule builders for mode targeting
- AI-generated mode configuration
- complex experiment or optimization systems

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

The sprint is not complete just because mode labels exist. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind unclear mode semantics, privacy conflicts, or rendering ambiguity that blocks context-aware personalization later, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must keep `mode`, `content selection`, and `personalization` separate.

That means:

- a mode is an intentional owner-defined presentation state
- content selection determines what parts of the card are emphasized in that mode
- personalization later may choose which mode to render, but should not redefine the meaning of the mode itself

Examples:

- `Sales` mode can emphasize booking, proof, and company details
- `Event` mode can emphasize quick contact exchange and event-specific CTA
- `Hiring` mode can emphasize work, portfolio, and intro context

If mode and personalization are collapsed together too early, the feature becomes hard to configure and hard to trust.

## User Roles In This Sprint

Primary roles:

- Card owner
  - wants one card identity with multiple intentional use-case views

- Public or authenticated viewer
  - sees a coherent card mode without confusion about what the card is for

- Platform
  - needs a stable mode concept before context-aware personalization is added

## User Stories

### User stories

1. As a card owner, I want to define different modes for different situations without creating many separate cards.

2. As a card owner, I want each mode to feel purposeful and controlled.

3. As a viewer, I want the card experience to feel coherent for the current context.

4. As a user, I want privacy settings to continue to apply regardless of which mode is active.

### Platform stories

1. As the platform, I need a reusable mode model for cards.

2. As the platform, I need mode rendering to remain compatible with privacy and analytics.

3. As the platform, I need a clean bridge to the next sprint's context-aware personalization logic.

## Mode Model

This sprint should define a practical card mode model.

Recommended initial modes:

- `DEFAULT`
- `SALES`
- `NETWORKING`
- `EVENT`
- `HIRING`

Recommendation:

- support a small fixed set of mode presets in V1
- allow owners to choose which presets are active for their card
- defer fully custom user-defined mode taxonomies until later unless current product direction strongly requires them

## Mode Configuration Model

Each mode should be able to influence:

- headline or summary emphasis
- visible sections priority
- CTA emphasis
- optional mode-specific copy or labels

Recommendation for V1:

- do not duplicate the entire card schema per mode
- instead, store light mode configuration that references the same underlying card data and changes presentation emphasis

## Privacy Compatibility Rule

This sprint must enforce one hard rule:

- a mode can never reveal more than core and field-level privacy allow

That means:

- mode can hide, reorder, or emphasize
- mode cannot override privacy and expose restricted data

This is the most important safety rule in the sprint.

## Functional Requirements

### FR1 - Card mode persistence

The system must support persisted card mode configuration.

### FR2 - Default mode

Every card must have a default mode, even if no advanced modes are configured.

### FR3 - Mode-aware rendering

The renderer must be able to display a card in a chosen mode.

### FR4 - Mode-specific emphasis

The system should allow mode-specific emphasis of content and CTA without duplicating the whole card.

Examples:

- show booking CTA prominently in `SALES`
- emphasize quick contact and QR-oriented sharing in `EVENT`
- emphasize portfolio/work examples in `HIRING`

### FR5 - Mode selection by owner

Owners must be able to configure which modes are enabled and how each one behaves at a basic level.

### FR6 - Preview by mode

Owners should be able to preview how the card looks in each configured mode.

### FR7 - Privacy-safe payload and rendering

Mode rendering must continue to respect:

- page-level privacy
- action-level privacy
- field-level visibility

### FR8 - Analytics compatibility

Card interactions should preserve which mode was active so later attribution and performance reporting can reason about mode impact.

### FR9 - Relationship and inbox compatibility

If a card mode influences how someone enters the relationship, later systems should be able to preserve that mode context where useful.

### FR10 - Team compatibility

If cards are team-managed or brand-locked, modes must remain consistent with those constraints.

### FR11 - No owner confusion

The configuration model must remain understandable and not feel like the owner is managing multiple separate cards in disguise.

### FR12 - Foundation for contextual mode resolution

The system must expose enough structure that the next sprint can resolve mode by context safely.

## Backend Scope

The backend scope for this sprint is the mode model and privacy-safe rendering contract.

### Data model scope

Potential additions:

- default mode field on card
- mode configuration JSON structure
- analytics metadata support for rendered mode

Recommendation:

- prefer a compact mode config structure keyed by mode name
- avoid duplicating full card blocks per mode in the first version

### Service-layer scope

Recommended backend work:

- return mode-aware card payloads or mode metadata for rendering
- validate configured modes and allowed options
- ensure privacy filtering still applies after mode resolution

### API scope

Possible update points:

- card update endpoints for mode config
- public/member-aware card fetch endpoints to accept or resolve mode context

Recommendation:

- expose just enough mode structure to support preview and rendering cleanly

### Validation scope

- only supported modes can be configured in V1
- mode config cannot expose data beyond privacy allowances
- default mode must always remain valid

### Backend test scope

- mode config validation tests
- mode rendering tests
- privacy-safe mode payload tests
- analytics mode metadata tests

## Frontend Scope

The frontend scope for this sprint is owner configuration and mode-aware card rendering.

### Owner editor UX

Recommended controls:

- enable modes
- choose default mode
- preview modes
- configure basic emphasis per mode

### Public rendering UX

Mode rendering should feel intentional.

Recommendation:

- use the current card visual system but allow mode-based emphasis differences
- avoid making every mode look like a completely different app unless the product already supports that level of divergence

### Preview UX

The owner should be able to switch preview among modes easily.

### Frontend technical scope

- reuse existing card builder and card renderer
- keep mode configuration understandable
- avoid overbuilding drag-and-drop or per-mode full layout editors in V1

### Frontend test scope

- mode configuration rendering
- preview switching
- mode-aware card rendering
- privacy compatibility in mode views

## Analytics Strategy

This sprint should make sure mode context is not lost.

Recommended rule:

- mode is recorded as metadata on relevant card interactions

This will allow later reporting to answer:

- which mode drove stronger outcomes?
- which mode produced more meetings or conversions?

Without needing to redesign analytics later.

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- mode semantics clarity
- privacy compatibility
- rendering coherence
- owner configuration understanding
- analytics mode metadata correctness

### Audit checklist

- do modes feel like intentional contexts rather than duplicate cards?
- can any mode accidentally reveal fields hidden by privacy?
- is the owner able to understand what each mode changes?
- does the card remain coherent in each mode?
- is mode metadata preserved for later attribution?

## Fix Scope

Any issues found during audit that affect mode clarity, privacy safety, rendering coherence, or analytics compatibility must be fixed inside this sprint.

Must-fix categories:

- mode overriding privacy
- unclear or misleading mode semantics
- incoherent mode rendering
- missing mode attribution metadata
- owner confusion in configuration UX

Can-defer categories only with explicit note:

- more advanced mode customizations
- richer visual divergence between modes
- non-blocking preview polish

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- modes remain privacy-safe
- configuration remains understandable
- the next context-aware personalization sprint can safely choose among modes without redefining them

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- card modes exist and are configurable
- default mode behavior is stable
- mode-aware rendering exists
- privacy remains enforced in every mode
- mode context is preserved for analytics and later attribution
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for mode config, rendering, and privacy safety pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `018-p05-05D-context-aware-personalization.md` when:

- dynamic modes are now a stable product concept
- privacy-safe rendering by mode is trustworthy
- the next sprint can choose or resolve modes by context instead of inventing mode semantics from scratch

This sprint must not hand off as ready if:

- mode semantics are still confusing
- mode rendering still conflicts with privacy
- owner configuration is too unclear to support context-aware selection later

### What may continue in the next sprint

- context-based mode resolution
- source-aware personalization
- event-aware personalization
- route or entry-surface aware card presentation

### What must not be pushed carelessly to the next sprint

- unresolved privacy conflicts
- unresolved mode ambiguity
- unresolved analytics metadata gaps

## Dependencies

Technical dependencies:

- core and field-level privacy work
- card renderer and builder foundations
- analytics metadata support

Product dependencies:

- agreement on initial mode set
- agreement on how much visual variation modes should have in V1

## Non-Goals

- automatic mode resolution
- advanced per-visitor rule engines
- full custom layout builder per mode
- AI-generated modes

## Risks

### Risk 1 - Modes become duplicate cards

If each mode feels like a full separate card, the product becomes harder to manage.

Mitigation:

- keep modes lightweight and presentation-oriented in V1

### Risk 2 - Privacy conflict

If a mode can expose more than privacy settings allow, trust collapses immediately.

Mitigation:

- enforce privacy as a hard upper bound on every rendered mode

### Risk 3 - Owner confusion

If owners cannot predict what changes between modes, adoption will be weak.

Mitigation:

- provide clear naming, previews, and restrained configuration scope

### Risk 4 - Weak analytics linkage

If mode context is not tracked, later personalization and ROI work will lose an important dimension.

Mitigation:

- attach mode metadata to relevant interactions now

## Open Questions

1. Which initial mode set best fits Dotly's strongest use cases?

2. Should `EVENT` be part of the first mode set, or remain more tightly tied to Event Radar later?

3. How much per-mode customization is enough to feel useful without becoming card duplication?

4. Should the public URL include explicit mode selection in V1, or should mode choice stay internal and preview-oriented until the next sprint?

## Recommended Implementation Notes

- Keep modes few and intentional.
- Treat privacy as a hard bound.
- Make preview quality high enough that owners trust what each mode does.
- Preserve analytics context from the start.
- Treat this sprint as the semantic foundation for smarter personalization next.

## Acceptance Criteria

1. Card owners can configure a small set of dynamic card modes.

2. Cards can render in different modes intentionally.

3. Privacy remains enforced regardless of mode.

4. The platform is ready for context-aware personalization in the next sprint.

## Definition Of Done

This sprint is complete when:

- mode model exists
- mode config exists
- mode-aware rendering exists
- privacy-safe mode behavior exists
- audit, fix, and re-audit are completed
- documentation clearly explains how context-aware personalization will build on this mode foundation next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy dynamic card modes

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat dynamic mode semantics as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Dynamic card modes are now a stable and privacy-safe product concept
- Owners can intentionally shape different card contexts without duplicating cards
- Context-aware personalization can now build on a trustworthy mode foundation

Deferred:

- Optional richer per-mode customization
- Optional deeper visual divergence by mode
```
