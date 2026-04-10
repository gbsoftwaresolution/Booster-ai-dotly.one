# World Class Cards V01

## Purpose

This directory contains the master `World Class Cards v01` roadmap pack.

It organizes the next major evolution of Dotly Cards into six product programs and twenty-one execution sprints.

The goal of this pack is not to add disconnected features. The goal is to turn Cards into a relationship operating system that connects:

- identity
- timeline
- inbox
- CRM
- follow-up
- meetings
- events
- privacy
- personalization
- attribution

## Product Vision

Dotly should not stop at being a digital card.

The world-class version of Cards should let a user:

- share identity
- capture interest
- unify that interest into one person record
- follow up intelligently
- convert to meetings or deals
- operate as an individual or team
- prove business outcomes

That means the roadmap is organized around systems, not isolated UI features.

## Program Overview

### P01 - Relationship OS

Create the core relationship engine behind Cards.

Includes:

- Relationship Timeline
- Contact Merge + Identity Resolution
- Deep CRM Workflow

### P02 - Follow-Up Intelligence

Turn relationship data into actionable follow-up.

Includes:

- Smart Follow-Up Assistant
- reminders and suggestion flows
- team-aware follow-up automation

### P03 - Inbound Conversion

Turn inbound interest into structured actions and meetings.

Includes:

- Universal Inbound Inbox
- Inbox routing and contact linking
- Card-to-Meeting Flow

### P04 - Team And Revenue Ops

Make Cards work for companies and teams while proving business value.

Includes:

- Team / Company Identity Layer
- Native Integrations
- Proving ROI

### P05 - Trust And Personalization

Make Cards more controlled and more context-aware.

Includes:

- Trust + Privacy Controls
- Dynamic Card Modes
- Context-aware personalization

### P06 - Event Reliability

Make Event Radar and event-day card operations robust under real-world conditions.

Includes:

- Offline / Event Reliability Mode
- offline scan queue
- reconciliation and operator recovery

## Sprint Index

### P01 - Relationship OS

1. `001-p01-01A-relationship-timeline-foundation.md`
2. `002-p01-01B-identity-resolution-and-merge.md`
3. `003-p01-01C-crm-workflow-hardening.md`
4. `004-p01-01D-relationship-graph-and-cross-surface-view.md`

### P02 - Follow-Up Intelligence

5. `005-p02-02A-follow-up-signals-foundation.md`
6. `006-p02-02B-drafting-and-suggestion-assistant.md`
7. `007-p02-02C-follow-up-automation-and-team-workflows.md`

### P03 - Inbound Conversion

8. `008-p03-03A-unified-inbox-foundation.md`
9. `009-p03-03B-inbox-routing-and-contact-linking.md`
10. `010-p03-03C-card-to-meeting-conversion-flow.md`

### P04 - Team And Revenue Ops

11. `011-p04-04A-team-owned-relationship-model.md`
12. `012-p04-04B-native-integrations-foundation.md`
13. `013-p04-04C-attribution-and-roi-foundation.md`
14. `014-p04-04D-revenue-and-team-performance-views.md`

### P05 - Trust And Personalization

15. `015-p05-05A-privacy-pack-completion.md`
16. `016-p05-05B-field-and-audience-privacy.md`
17. `017-p05-05C-dynamic-card-modes-foundation.md`
18. `018-p05-05D-context-aware-personalization.md`

### P06 - Event Reliability

19. `019-p06-06A-offline-reliability-architecture.md`
20. `020-p06-06B-offline-check-in-and-scan-queue.md`
21. `021-p06-06C-recovery-reconciliation-and-operator-tooling.md`

## Recommended Execution Order

Execute in sprint order.

Recommended sequence:

1. `001`
2. `002`
3. `003`
4. `004`
5. `005`
6. `006`
7. `007`
8. `008`
9. `009`
10. `010`
11. `011`
12. `012`
13. `013`
14. `014`
15. `015`
16. `016`
17. `017`
18. `018`
19. `019`
20. `020`
21. `021`

Do not skip the early relationship sprints if later work depends on identity, timeline, CRM integrity, or attribution.

## Dependency Notes

Strong dependencies:

- `001` before `005`, `006`, `008`, `009`, `013`
- `002` before `004`, `011`, `013`
- `003` before `013`, `014`
- `008` before `009`, `010`
- `015` before `016`, `018`
- Event Radar phase maturity should exist before `019`, `020`, and `021`

## Existing Repo Leverage

This roadmap intentionally builds on existing product groundwork already present in the repository:

- contacts and CRM
- tasks and reminders
- AI enrichment
- team management and brand lock
- inbox messaging, voice notes, and dropbox files
- scheduling and booking
- analytics
- Event Radar and Card Privacy roadmap packs

This means many of these sprints should be treated as `consolidate and elevate` rather than `invent from zero`.

## GREEN Model

Every sprint in this pack uses the same operational completion standard.

A sprint is complete only when:

- implementation scope is complete
- audit is complete
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- sprint-specific GREEN criteria are satisfied

If a sprint is not GREEN, the next sprint must not assume that foundation is safe.

## Handoff Rules

Each sprint includes a `Continue Or Stop Gate` section.

Use it to decide whether:

- the next sprint can proceed safely
- work must pause until blocking issues are resolved

This is critical because later sprints depend on correctness in:

- identity resolution
- timeline integrity
- CRM truthfulness
- inbox routing
- attribution quality
- privacy consistency
- event reliability

## Key Design Principles

- keep `identity`, `timeline`, `CRM`, `inbox`, `meeting`, `event`, `privacy`, and `attribution` as separate but connected concepts
- prefer truthful operational behavior over flashy but weak UX
- preserve source attribution across all systems
- do not collapse all contacts, interactions, and outcomes into one generic record
- build reusable platform layers before optimization features

## Milestones

### Milestone A - Core Relationship Engine

- `001` to `004`

### Milestone B - Follow-Up And Inbound Conversion

- `005` to `010`

### Milestone C - Team And Revenue Ops

- `011` to `014`

### Milestone D - Trust And Personalization

- `015` to `018`

### Milestone E - Event Reliability

- `019` to `021`

## Completion Standard

`World Class Cards v01` is complete only when `021-p06-06C-recovery-reconciliation-and-operator-tooling.md` exits with:

- `GREEN - v01 Complete`

or

- `GREEN - v01 Complete With Noted Deferrals`

If the final sprint is not GREEN, the roadmap pack must be treated as incomplete.
