# Card Privacy V01

## Purpose

This directory contains the full Card Privacy `v01` roadmap pack for Cards.

The pack is organized as a four-sprint specification set for core card privacy.

The scope of `v01` is intentionally focused on:

- card page visibility
- vCard/contact download privacy
- lead capture/connect privacy
- public-surface enforcement consistency

It explicitly does not yet include:

- field-level visibility
- advanced audience rules
- account-wide privacy defaults
- reveal-on-connect workflows

## Sprint Index

1. `001-p01-01A-privacy-foundation.md`
   - privacy model, enums, DTO contract, migration strategy

2. `002-p01-01B-public-surface-enforcement.md`
   - public route enforcement for card page, vCard, and lead capture

3. `003-p01-01C-editor-ux-and-blocked-states.md`
   - editor controls, owner guidance, blocked-state UX

4. `004-p01-01D-audit-consistency-and-rollout.md`
   - route consistency audit, rollout safety, final v01 closeout

## Recommended Execution Order

Execute in document order:

1. `001`
2. `002`
3. `003`
4. `004`

Do not skip `001` or `002`, because the later UX and rollout work depends on a stable privacy model and real server enforcement.

## Product Arc

Card Privacy `v01` evolves like this:

1. define the privacy model
2. enforce the model on public routes
3. make the model understandable in editor and blocked states
4. verify consistency and rollout safety

This means the feature grows from:

- `one narrow vCard privacy setting`

into:

- `a coherent card privacy system for viewing, contact download, and lead capture`

## Core Design Principles

These principles should remain consistent throughout implementation:

- keep `cardVisibility`, `vcardPolicy`, and `leadCapturePolicy` separate
- treat privacy as backend-enforced behavior first, UI behavior second
- preserve backward compatibility for existing public cards by safe defaults
- use truthful language for `Members only`, `Disabled`, and `Unlisted`
- do not imply `Unlisted` is secret or secure

## GREEN Model

Every sprint in this pack uses the same operational completion standard.

A sprint is complete only when:

- implementation scope is complete
- audit is complete
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- sprint-specific GREEN criteria are satisfied

If a sprint is not GREEN, the next sprint must not assume that privacy behavior is safe to build on.

## Completion Standard

Card Privacy `v01` is complete only when `004-p01-01D-audit-consistency-and-rollout.md` exits with:

- `GREEN - v01 Complete`

or

- `GREEN - v01 Complete With Noted Deferrals`

If the final sprint is not GREEN, the Card Privacy v01 pack must be treated as incomplete.
