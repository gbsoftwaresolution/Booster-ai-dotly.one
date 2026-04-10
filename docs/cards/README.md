# Cards Roadmaps

## Purpose

This directory is the top-level index for Cards roadmap and specification packs.

Each pack is written as an execution-oriented documentation set intended to move from product intent into implementation, audit, fix, and re-audit work.

All packs use the same core operating model:

- sprint-by-sprint execution
- backend scope and frontend scope
- audit, fix, and re-audit inside the sprint
- explicit GREEN criteria
- an explicit continue or stop gate before the next sprint

## Available Packs

### 1. Event Radar

Path:

- `docs/cards/radar/v01/README.md`

Focus:

- event-aware QR exchange
- organizer and stall operations
- participant registration and identity
- event passes, check-in, and post-event routing

Structure:

- `10` sprint documents
- `3` product phases

Recommended when the goal is to build or harden event workflows around Cards.

### 2. Card Privacy

Path:

- `docs/cards/privacy/v01/README.md`

Focus:

- card page visibility
- vCard/contact download privacy
- lead capture/connect privacy
- public-surface enforcement and rollout consistency

Structure:

- `4` sprint documents
- `1` tightly scoped phase for core privacy

Recommended when the goal is to make card exposure rules trustworthy before layering on advanced audience or personalization behavior.

### 3. World Class Cards

Path:

- `docs/cards/world-class/v01/README.md`

Focus:

- relationship timeline and identity resolution
- follow-up intelligence
- inbound inbox and meeting conversion
- team and revenue operations
- trust, privacy, and personalization
- event reliability and offline recovery

Structure:

- `21` sprint documents
- `6` product programs

Recommended when the goal is to evolve Cards into a broader relationship operating system across individual, team, and event use cases.

## Pack Relationships

These packs are related, but they are not duplicates.

- `privacy/v01` is the focused trust foundation for core card visibility and access control.
- `radar/v01` is the event-specific roadmap for exchange, registration, passes, and event-day operations.
- `world-class/v01` is the broader master roadmap that extends Cards across relationship systems, inbound conversion, team operations, personalization, and event reliability.

In practice:

- use `privacy/v01` when the immediate need is trustworthy exposure control
- use `radar/v01` when the immediate need is event product execution
- use `world-class/v01` when planning the longer multi-program Cards roadmap

## Suggested Execution Paths

Choose one of these depending on the current product priority.

### Path A - Trust First

1. Execute `docs/cards/privacy/v01/001-p01-01A-privacy-foundation.md`
2. Continue through `privacy/v01` in order
3. Use the resulting privacy foundation before starting advanced personalization or audience work

Best when current risk is public exposure inconsistency.

### Path B - Event Product First

1. Execute `docs/cards/radar/v01/001-p01-01A-event-foundation.md`
2. Continue through `radar/v01` in order
3. Treat `p01` as mandatory before registration, passes, or event-day ops

Best when current priority is organizer, exhibitor, or conference workflows.

### Path C - Long-Range Cards Platform

1. Execute `docs/cards/world-class/v01/001-p01-01A-relationship-timeline-foundation.md`
2. Continue through `world-class/v01` in order
3. Use dependency notes inside that pack before skipping ahead

Best when planning a larger Cards program across CRM, inbox, meetings, teams, and attribution.

## Shared Completion Standard

No pack should be treated as complete just because documents exist.

A pack is only complete when its final sprint exits GREEN according to that pack's completion standard.

Until then, the pack should be treated as planned work, not shipped capability.
