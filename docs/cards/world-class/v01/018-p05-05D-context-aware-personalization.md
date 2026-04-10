# World Class Cards V01 - 018 - P05 - 05D - Context-Aware Personalization

## Objective

Introduce context-aware personalization so Dotly can choose or influence the most appropriate card mode and presentation path based on the viewer's entry context, while preserving owner intent, privacy constraints, and attribution truth.

This sprint builds on:

- `015-p05-05A-privacy-pack-completion.md`
- `016-p05-05B-field-and-audience-privacy.md`
- `017-p05-05C-dynamic-card-modes-foundation.md`

It adds:

- context resolution model
- mode-selection rules based on entry surface and relationship context
- personalization-safe rendering contract
- owner controls over personalization behavior
- attribution and analytics continuity across personalized experiences

At the end of this sprint, Dotly should be able to move from `one card with optional modes` to `the right mode for the right context`, without becoming opaque or unsafe.

## Problem

After Sprint 017, Dotly can support multiple intentional card modes, but the owner or product still has to choose them statically.

Without context-aware personalization:

- owners still need to manually share the right mode for each use case
- the card remains more static than the rest of the relationship platform
- event, inbox, booking, and CRM contexts cannot influence presentation meaningfully
- world-class relevance is left on the table even though the product already has strong context signals

But if personalization is added carelessly:

- privacy can be bypassed
- users may not understand why a card looks different in different contexts
- attribution can become muddy
- owners may feel they lost control of their card

The platform needs a context-resolution layer that is explainable, privacy-safe, and owner-controlled.

## Product Intent

This sprint should make Dotly feel adaptive without feeling unpredictable.

The product promise is:

- the card can adapt to context when that improves relevance
- personalization never reveals more than privacy rules allow
- owners can understand and control how personalization behaves
- attribution still knows which mode and context produced the outcome

This sprint is not trying to become a black-box personalization engine. It is adding a practical, deterministic context layer.

## Sprint Scope

In scope:

- context resolution model
- source-aware mode selection
- owner control over context-aware behavior
- personalization-safe rendering rules
- analytics and attribution compatibility for personalized mode selection
- deterministic fallback behavior

Out of scope:

- AI-driven real-time personalization
- behavioral experimentation system
- opaque scoring-driven mode selection
- deep audience-rule builders beyond the field/audience privacy layer

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

The sprint is not complete just because a personalized view can render. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind opaque mode selection, privacy conflicts, or attribution ambiguity that blocks event reliability work and future optimization, the work must not be treated as ready to continue.

If only non-blocking polish remains, the sprint may be marked as safe to continue.

## Core Design Principle

This sprint must keep `context`, `mode selection`, and `privacy enforcement` separate.

That means:

- context tells the system what kind of situation the viewer came from
- mode selection decides which owner-approved mode to use
- privacy still filters what is actually allowed to be shown

Examples:

- a booking-originated visit may prefer `SALES`
- an event-originated visit may prefer `EVENT`
- an inbox-related relationship view may prefer `NETWORKING` or `DEFAULT`
- even if `SALES` is selected, hidden or restricted fields must remain hidden or restricted

If personalization and privacy are merged together, the system becomes hard to audit and easy to mistrust.

## User Roles In This Sprint

Primary roles:

- Card owner
  - wants the card to adapt usefully without losing control

- Public or authenticated viewer
  - benefits from a more relevant card experience

- Platform
  - needs deterministic personalization before expanding into event and reliability-heavy use cases

## User Stories

### User stories

1. As a card owner, I want the system to choose an appropriate card mode based on context when that improves relevance.

2. As a card owner, I want to know which modes may be used automatically and in which situations.

3. As a viewer, I want the card experience to feel relevant to how I arrived there.

4. As a user, I want personalization to remain consistent and not feel random.

### Platform stories

1. As the platform, I need deterministic context rules instead of black-box mode selection.

2. As the platform, I need personalization to remain compatible with privacy, attribution, and later performance reporting.

3. As the platform, I need a reusable context-resolution layer that can also support Event Radar and future shared entry surfaces.

## Context Model

This sprint should define the first set of supported context sources.

Recommended initial contexts:

- `DIRECT_PUBLIC`
- `CARD_QR`
- `EVENT_ENTRY`
- `INBOX_LINK`
- `CONTACT_FLOW`
- `BOOKING_FLOW`
- `CRM_INTERNAL_PREVIEW`

Recommendation:

- keep contexts explicit and enumerable in V1
- avoid behavioral or inferred contexts that are hard to explain or reproduce

## Mode Resolution Model

This sprint should define deterministic mode resolution.

Recommended resolution order:

1. explicit owner-selected forced mode if present on link or route and allowed
2. owner-approved context mapping rule
3. card default mode

Recommendation:

- owner-approved context mapping should be the core of V1
- if no specific mapping exists, always fall back to default mode

## Owner Control Model

Owners should be able to control personalization at a practical level.

Recommended controls:

- enable or disable context-aware personalization
- map known contexts to enabled modes
- choose default fallback mode

Recommendation:

- keep the UI to mapping preset contexts to preset modes
- do not build a freeform rule engine in V1

## Functional Requirements

### FR1 - Context resolution

The system must be able to determine the relevant rendering context from supported entry surfaces.

### FR2 - Deterministic mode selection

The system must resolve the active mode from context using explicit and auditable rules.

### FR3 - Fallback behavior

If no context rule matches, the system must use the card's default mode.

### FR4 - Owner control over mappings

Owners must be able to configure which context maps to which mode from a supported preset list.

### FR5 - Privacy-safe rendering

Selected mode must still obey all page-level, action-level, and field-level privacy constraints.

### FR6 - Analytics continuity

The system must preserve:

- resolved context
- active mode

as analytics or attribution metadata where relevant.

### FR7 - Attribution compatibility

Later attribution and performance reporting must be able to understand:

- which context was used
- which mode was rendered
- which outcomes followed from that experience

### FR8 - Coherent viewer experience

The personalized view must still look like the same card identity, not like a broken or inconsistent product state.

### FR9 - Team and event compatibility

The context model must leave room for:

- Event Radar entry
- team-shared links
- booking and CRM-originated internal context

### FR10 - Debuggability

The system should make it possible to understand why a mode was selected, at least at an internal or owner-visible level.

### FR11 - No forced hidden complexity

The owner should not need to understand internal routing logic to use the feature correctly.

### FR12 - Future optimization compatibility

The model must support later experimentation or optimization work without rewriting the core context-resolution semantics.

## Backend Scope

The backend scope for this sprint is context resolution and personalization-safe payload selection.

### Service-layer scope

Recommended backend work:

- resolve rendering context from route or entry metadata
- resolve active mode from owner-approved mappings
- apply privacy filtering after mode resolution
- attach context and mode metadata to analytics payloads

### Data model scope

Potential additions:

- context-to-mode mapping config on card
- explicit personalization enabled flag

Recommendation:

- store compact mapping config keyed by supported context values
- avoid generic rule expressions in V1

### API scope

Possible update points:

- public card fetch routes
- member-aware card fetch routes
- card update endpoints for personalization config

### Validation scope

- only supported contexts can be configured
- only enabled modes can be mapped
- mode resolution must always have a valid fallback
- privacy filtering must run after mode selection

### Backend test scope

- context resolution tests
- mode mapping tests
- fallback tests
- privacy-safe personalized payload tests
- analytics metadata tests

## Frontend Scope

The frontend scope for this sprint is owner configuration and personalized rendering behavior.

### Owner editor UX

Recommended controls:

- enable `Context-aware personalization`
- choose default mode
- map supported contexts to available modes
- preview or inspect context scenarios

### Preview UX

Recommended preview states:

- direct public
- event entry
- booking flow
- inbox flow

Recommendation:

- keep preview deterministic and obvious
- make it easy to compare what each context resolves to

### Render UX

Personalized rendering should feel intentional and stable.

Recommendation:

- no sudden unexplained UI jumps within one session unless context truly changed
- preserve consistent brand identity across modes

### Frontend technical scope

- build on the mode foundation from Sprint 017
- avoid overbuilding complex rule-debug consoles in V1

### Frontend test scope

- context mapping UI rendering
- preview behavior
- resolved mode rendering
- fallback mode behavior
- privacy-safe rendering under personalized selection

## Resolution Strategy

Recommended V1 strategy:

- use explicit context values
- use owner-defined context mappings
- fall back to default mode always

This keeps the system predictable and explainable.

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- context resolution correctness
- mode selection correctness
- privacy compatibility
- owner understanding and control
- analytics continuity

### Audit checklist

- does each supported context resolve consistently?
- can personalization ever bypass privacy constraints?
- can owners understand why a given context uses a given mode?
- does fallback work when no explicit mapping exists?
- are context and mode preserved in analytics and attribution metadata?

## Fix Scope

Any issues found during audit that affect context determinism, privacy safety, owner control, or attribution continuity must be fixed inside this sprint.

Must-fix categories:

- wrong context resolution
- wrong mode selection
- privacy bypass through personalization
- missing fallback safety
- missing context/mode analytics linkage
- owner-confusing configuration behavior

Can-defer categories only with explicit note:

- more advanced context sets
- richer debug tools
- non-blocking preview polish
- optimization experiments

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- personalization remains deterministic and privacy-safe
- owner control remains understandable
- the next Event Reliability program can proceed without unresolved trust ambiguity in card rendering behavior

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- context-aware personalization exists
- context-to-mode mapping is deterministic and configurable
- fallback behavior is reliable
- privacy remains enforced after personalization
- context and mode metadata are preserved for attribution and analytics
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for context resolution, mode selection, fallback, and privacy safety pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint completes Program P05 Trust And Personalization and can hand off safely to `019-p06-06A-offline-reliability-architecture.md` when:

- personalization is deterministic and privacy-safe
- the world-class roadmap can move into Event Reliability without unresolved trust-layer contradictions

This sprint must not hand off as ready if:

- mode selection remains opaque
- privacy conflicts remain unresolved
- attribution loses context because personalization metadata is missing

### What may continue in the next sprint

- offline event architecture
- scan queue design
- reconciliation and operator recovery

### What must not be pushed carelessly to the next sprint

- unresolved personalization trust issues
- unresolved context ambiguity
- unresolved mode/attribution continuity gaps

## Dependencies

Technical dependencies:

- dynamic card modes foundation
- field and audience privacy
- analytics metadata support

Product dependencies:

- agreement on supported context set for V1
- agreement on owner control model for personalization

## Non-Goals

- AI-driven personalization
- opaque optimization engines
- complex audience rule builders
- experiment platform

## Risks

### Risk 1 - Opaque behavior

If users cannot understand why a mode was chosen, personalization will feel random or manipulative.

Mitigation:

- keep context resolution deterministic and owner-controlled

### Risk 2 - Privacy regression

If personalization can expose fields or actions that privacy should block, trust will collapse.

Mitigation:

- always apply privacy after mode resolution

### Risk 3 - Owner confusion

If configuration is too complex, owners will stop using the feature or misconfigure it.

Mitigation:

- map simple contexts to simple preset modes

### Risk 4 - Attribution loss

If resolved context is not tracked, later analysis of what worked will be weakened.

Mitigation:

- preserve context and mode metadata consistently

## Open Questions

1. Which contexts should be officially supported in V1 personalization?

2. Should owners be able to disable personalization per mode, per context, or only globally?

3. Should explicit URL parameters be allowed to request mode/context in V1, or only internal route context?

4. How much of the selected context should be visible to the owner in analytics and preview?

## Recommended Implementation Notes

- Keep context resolution small and deterministic.
- Use privacy as the hard safety boundary.
- Make owner control simple and visible.
- Preserve analytics continuity from day one.
- Treat this sprint as the final trust-and-relevance bridge before event reliability work begins.

## Acceptance Criteria

1. Dotly can resolve and render card modes by supported context.

2. Owners can control the personalization mappings.

3. Privacy remains fully enforced under personalization.

4. Program P05 closes with a trustworthy trust-and-personalization layer.

## Definition Of Done

This sprint is complete when:

- context model exists
- context-to-mode mapping exists
- personalized mode resolution exists
- privacy-safe personalized rendering exists
- audit, fix, and re-audit are completed
- documentation clearly explains how Event Reliability begins after this program closes

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy context-aware personalization

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat personalization behavior as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Context-aware personalization is now deterministic and privacy-safe
- Owners can control how context maps to card presentation
- Event Reliability work can now proceed without unresolved trust-layer ambiguity

Deferred:

- Optional richer context sets
- Optional deeper owner-facing debug and analytics views
```
