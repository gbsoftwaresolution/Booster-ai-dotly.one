# Card Privacy V01 - 004 - P01 - 01D - Audit Consistency And Rollout

## Objective

Close Card Privacy v01 by validating that privacy behavior is consistent across all relevant card surfaces, safe for existing cards, and trustworthy enough to roll out as a complete feature.

This sprint adds:

- route-by-route privacy consistency audit
- adjacent public-surface review
- migration and rollout verification
- final privacy behavior matrix
- rollout safeguards and completion criteria for Card Privacy v01

At the end of this sprint, Card Privacy v01 should be complete as a roadmap pack and implementation target, with privacy behavior that is consistent, auditable, and safe to ship.

## Problem

After Sprint 003, Card Privacy has:

- a privacy model
- backend enforcement on core public surfaces
- editor UX
- blocked-state UX

But the feature is still incomplete until the whole card surface area is checked for drift, bypasses, migration edge cases, and rollout contradictions.

Without a final audit and rollout sprint:

- some routes may still ignore privacy settings
- existing cards may regress unexpectedly after rollout
- adjacent surfaces like wallet or contact artifacts may behave inconsistently
- copy, enforcement, and data model may still disagree in subtle ways
- the feature may look complete while remaining operationally unsafe

This sprint is the final trust gate.

## Product Intent

This sprint should make Card Privacy feel complete and dependable.

The product promise is:

- privacy means the same thing everywhere a card appears
- existing cards continue working safely after migration
- blocked, members-only, public, and disabled states are consistent across UI and API
- rollout does not create silent regressions or hidden bypasses

This sprint is not about adding more privacy options. It is about proving that the privacy system actually holds together.

## Sprint Scope

In scope:

- full privacy consistency audit across card-related surfaces
- migration and backward-compatibility review
- rollout default verification
- adjacent public surface review
- final privacy behavior matrix documentation
- implementation closeout criteria for v01

Out of scope:

- new privacy capabilities beyond v01
- field-level privacy
- advanced audience rules
- account-wide privacy presets
- privacy analytics productization beyond minimal rollout checks

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

The sprint is not complete just because the major routes work. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

This sprint is intended to close Card Privacy v01.

If known route inconsistencies, rollout risks, or privacy bypasses remain, Card Privacy v01 must be treated as incomplete.

## Core Design Principle

This sprint must verify that privacy is a system behavior, not a collection of local exceptions.

That means consistency across:

- schema
- DTOs
- service logic
- public routes
- public page UI
- editor UI
- adjacent public artifacts

If any one of those layers diverges from the others, privacy is incomplete.

## User Roles In This Sprint

Primary roles:

- Card owner
  - expects privacy settings to behave consistently after rollout

- Anonymous visitor
  - encounters public, gated, or disabled card surfaces

- Signed-in Dotly user
  - may gain members-only access where allowed

- Product and engineering team
  - need a reliable final rollout standard for Card Privacy v01

## User Stories

### Card owner stories

1. As a card owner, I want the privacy settings I configure to behave consistently across all card-related public surfaces.

2. As a card owner, I want existing cards to remain safe and predictable after privacy rollout.

### Visitor stories

1. As a visitor, I want public and blocked card states to be consistent no matter how I reach the card surface.

2. As a signed-in Dotly user, I want members-only behavior to unlock correctly and consistently.

### Platform stories

1. As the platform, I need a final audit that proves privacy cannot be trivially bypassed through ignored routes or legacy flows.

2. As the platform, I need a documented rollout standard so future work builds on a trustworthy v01 baseline.

## Final Privacy Behavior Matrix

This sprint should leave behind a final documented behavior matrix.

At minimum, the matrix should answer behavior for each combination of:

- `cardVisibility`
- `vcardPolicy`
- `leadCapturePolicy`

Across these surfaces:

- public card page
- public card payload fetch
- vCard download
- lead form fetch
- lead submission
- wallet or related public artifact routes if in scope

The purpose is not to enumerate all combinations in code here, but to ensure the implementation and docs agree on expected behavior.

## Functional Requirements

### FR1 - Route-by-route privacy review

Every public-facing card-related route in scope must be reviewed against the privacy model.

Minimum routes to confirm:

- `GET /public/cards/:handle`
- `GET /public/cards/:handle/vcard`
- `GET /public/cards/:handle/lead-form`
- public lead submission route
- wallet-related public routes if they remain applicable

### FR2 - Backward-compatibility verification

Existing cards using default/public behavior must continue working correctly after privacy rollout.

### FR3 - Migration verification

Migration defaults from Sprint 001 must be verified in practice.

Required confirmations:

- old cards become `PUBLIC` visibility by default
- existing `vcardPolicy` behavior remains stable
- lead capture defaults do not silently disable flows for existing cards

### FR4 - Adjacent public surface review

The team must explicitly confirm whether adjacent public surfaces follow privacy policy, are intentionally out of scope, or need follow-up work.

Examples:

- Apple wallet pass route
- Google wallet pass route
- any public contact or artifact download route linked from card page

### FR5 - Rollout safety rules

This sprint must define whether rollout is:

- immediate for all cards
- migration-backed with safe defaults
- optionally feature-flagged if product risk is higher than expected

Recommendation:

- if implementation touches multiple public routes, feature-flagged rollout or staged rollout should be considered if already supported by the product architecture

### FR6 - Final owner truthfulness check

Owner-facing privacy settings and public behavior must match.

No option in the editor should describe behavior that the live product does not actually enforce.

### FR7 - Final visitor truthfulness check

Blocked and allowed states must remain understandable across all public surfaces.

### FR8 - Completion criteria for v01

This sprint must define the exact threshold for calling Card Privacy v01 complete.

## Backend Scope

The backend scope for this sprint is primarily audit, closeout, and any required fixes discovered during consistency review.

Possible backend work includes:

- fixing ignored routes
- aligning error semantics across routes
- closing bypass paths
- fixing migration or default edge cases
- aligning wallet/public artifact behavior if in scope

### Backend test scope

- route coverage tests for all in-scope public endpoints
- migration/default behavior tests
- regression tests for public cards
- bypass resistance tests for protected surfaces

## Frontend Scope

The frontend scope for this sprint is final consistency review and closeout fixes.

Possible frontend work includes:

- aligning public blocked states across card page, lead capture, and contact download
- fixing editor descriptions that drift from backend behavior
- correcting affordances on adjacent surfaces
- tightening publish-time or preview-time privacy messaging if needed

### Frontend test scope

- blocked-state consistency tests
- editor-to-live behavior consistency checks
- public/default card regression checks
- adjacent-surface regression checks if reviewed in scope

## Rollout Strategy

Recommended rollout approach:

1. migrate new privacy fields with safe defaults
2. confirm route enforcement on staging or equivalent environment
3. validate representative existing card cases:
   - fully public card
   - members-only vCard card
   - card with lead capture enabled
   - card with updated privacy settings
4. roll out only after route and UI consistency checks are complete

If feature flags exist and privacy touches too many critical public surfaces, staged enablement may be appropriate.

If not, the rollout should still follow a disciplined validation checklist.

## Adjacent Surface Review

This sprint should explicitly review whether each adjacent public surface is:

- covered by Card Privacy v01
- intentionally deferred
- or in need of follow-up after v01

At minimum, review:

- wallet pass public routes
- share bar affordances
- public contact artifacts beyond vCard if any exist
- any public route that can reveal card data or facilitate contact transfer

This prevents silent holes in the privacy story.

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- full route consistency
- migration safety
- rollout safety
- editor/live behavior alignment
- adjacent surface treatment
- final v01 completeness

### Audit checklist

- do all in-scope public routes obey privacy settings?
- do existing public cards still work correctly after migration?
- do members-only cards behave consistently across page, vCard, and lead capture?
- are disabled actions really disabled everywhere?
- do wallet or related public routes create privacy drift?
- do editor labels still match actual product behavior?
- is there any known bypass left through a legacy or adjacent route?

## Fix Scope

Any issues found during audit that affect consistency, migration safety, rollout safety, or privacy trust must be fixed inside this sprint.

Must-fix categories:

- ignored public routes
- migration regressions
- public/default card regressions
- adjacent route privacy drift
- editor/live behavior mismatches
- contradictory blocked-state behavior

Can-defer categories only with explicit note:

- non-blocking copy polish
- optional analytics on blocked attempts
- visual refinement of already-correct states
- deferred advanced privacy directions beyond v01

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- all reviewed surfaces remain aligned
- fixes did not break existing public behavior
- no important public privacy bypass remains
- rollout criteria are now satisfied

Re-audit output should classify remaining issues as:

- blocking
- acceptable for v01
- intentionally deferred after v01

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- all in-scope public card surfaces obey the privacy model consistently
- migration defaults are verified safe for existing cards
- editor messaging matches live behavior
- adjacent public surface treatment is explicitly resolved or documented
- rollout safety has been reviewed and accepted
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant regression and route-consistency tests pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

This sprint is intended to close Card Privacy v01.

If it exits GREEN, Card Privacy v01 is complete and ready for execution planning, implementation sequencing, or future v02 scope.

If it does not exit GREEN, Card Privacy v01 must be treated as incomplete.

### What may continue after v01

- field-level visibility
- advanced audience rules
- reveal-on-connect or gated profile actions
- account-level privacy defaults
- privacy analytics and blocked-attempt insights

### What must not be claimed before v01 is GREEN

- fully trustworthy card privacy across public surfaces
- migration-safe privacy rollout
- production-ready privacy consistency for Cards

## Dependencies

Technical dependencies:

- all prior Card Privacy v01 sprints
- existing public card, lead, and wallet routes
- migration support and test coverage for card surfaces

Product dependencies:

- agreement on final scope of v01-covered public surfaces
- agreement on rollout method if staged rollout is needed

## Non-Goals

- new privacy capabilities
- field hiding
- segmented audiences
- privacy recommendation engine
- account-wide defaults

## Risks

### Risk 1 - Hidden route drift

If one or two lesser-known routes still bypass privacy, the entire feature becomes hard to trust.

Mitigation:

- use explicit route inventory and route-by-route audit

### Risk 2 - Regression on public cards

If rollout impacts default public cards negatively, core card sharing may regress.

Mitigation:

- verify migration defaults and regression coverage carefully

### Risk 3 - Incomplete adjacent-surface treatment

If wallet or other artifact routes are ignored, users may discover privacy inconsistencies after launch.

Mitigation:

- explicitly classify every adjacent surface as in-scope, deferred, or aligned

### Risk 4 - Declaring v01 complete too early

If the final audit is weak, the roadmap may look done while still leaving obvious privacy gaps.

Mitigation:

- make GREEN contingent on full consistency and re-audit

## Open Questions

1. Should wallet pass public routes be fully brought under Card Privacy v01, or explicitly documented as a follow-up if their behavior differs?

2. Is staged rollout necessary, or are safe defaults and regression checks sufficient?

3. Should Card Privacy v01 include a formal route inventory artifact after implementation, or is the sprint doc itself enough?

4. Are there any public sharing/distribution surfaces outside the main card page that need explicit inclusion before calling v01 complete?

## Recommended Implementation Notes

- Treat this sprint as the final integrity check, not a feature-expansion sprint.
- Prefer explicit route inventory over assumptions.
- Preserve current public-card behavior wherever privacy settings remain effectively public.
- Document any intentionally deferred adjacent-surface behavior clearly.
- Do not call Card Privacy complete until route, UI, and migration behavior all agree.

## Acceptance Criteria

1. All in-scope card public surfaces behave consistently with Card Privacy settings.

2. Existing public cards continue to work safely after rollout.

3. Members-only and disabled behaviors remain consistent across routes and UI.

4. Adjacent public surfaces are either aligned or explicitly documented as deferred.

5. Card Privacy v01 has a credible completion standard and passes it.

## Definition Of Done

This sprint is complete when:

- route consistency audit is complete
- migration and rollout checks are complete
- adjacent public surface review is complete
- required fixes are applied
- audit, fix, and re-audit are completed
- documentation clearly closes the Card Privacy v01 roadmap pack

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - v01 Complete`
  - sprint passed implementation, audit, fix, and re-audit
  - Card Privacy v01 is complete as a roadmap pack and implementation target

- `GREEN - v01 Complete With Noted Deferrals`
  - Card Privacy v01 is complete and safe to proceed with
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - v01 Incomplete`
  - blocking issues remain
  - Card Privacy v01 must not be treated as complete

Recommended closeout message format:

```md
Status: GREEN - v01 Complete

Why:

- Privacy behavior is consistent across in-scope card surfaces
- Migration and rollout checks passed without breaking existing public cards
- Card Privacy now has a trustworthy end-to-end contract from editor to public enforcement

Deferred:

- Optional field-level privacy for a later version
- Optional deeper adjacent-surface alignment if intentionally separated from v01
```
