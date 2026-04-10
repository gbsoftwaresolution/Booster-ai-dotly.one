# Event Radar V01 - 002 - P01 - 01B - Stall And QR Exchange

## Objective

Introduce the event node layer for Event Radar so an organizer can attach real-world scan destinations to an event.

This sprint turns the event foundation from `001-p01-01A-event-foundation.md` into a usable exchange surface by adding:

- event-level QR destinations
- stall or booth-level QR destinations
- card assignment to those destinations
- QR generation and retrieval for event nodes
- scan entry routing into Event Radar instead of generic card-only flows

At the end of this sprint, Dotly should be able to represent an event with one or more scannable destinations that are owned, attributable, and ready for controlled exchange behavior in the next sprint.

## Problem

The event foundation alone is not enough to support real event usage.

An organizer needs physical or shareable scan targets that map to meaningful event contexts such as:

- main event entrance QR
- event networking QR
- exhibition stall QR
- sponsor desk QR

Without event nodes and QR destinations:

- all scans still resolve to generic card flows
- stall-level attribution is impossible
- exhibitors cannot operate independently within an event
- later sharing-consent logic has nowhere to attach
- event analytics cannot distinguish whether a contact came from the main event or a specific stall

The platform needs an intermediate model between `Event` and `Contact/Analytics` that represents `where the scan happened` and `which card/business identity was involved`.

## Product Intent

This sprint does not yet solve the full consent and exchange logic. It solves the location and routing layer.

The core product intent is:

- organizers create events
- organizers create event nodes inside those events
- nodes can represent the main event or a stall
- a node has one QR identity
- a node can be linked to a Dotly card
- when a user scans the QR, Dotly knows exactly which event and which node they reached

This creates the foundation for the next sprint to decide what happens after a scan.

## Sprint Scope

In scope:

- event node model
- stall and main-event node types
- node ownership and event relationship
- card assignment to node
- QR generation for node
- QR retrieval for node
- scan destination routing for node entry
- node list and node detail management under an event
- organizer-facing node management UI
- basic public scan landing shell for event node entry
- analytics attribution readiness for `eventId` and `eventNodeId`

Out of scope:

- final sharing consent choices
- field-level share picker
- mutual exchange logic
- actual contact exchange policy enforcement beyond basic routing intent
- attendee registration
- pass issuance or check-in
- session node complexity unless represented only as future-safe enum values
- bulk booth import unless it is trivial and already supported by existing patterns

## Sprint Delivery Structure

Every Event Radar sprint should be executable and reviewable through the same delivery frame. This sprint follows that model and future sprint docs should retain it.

Required sections for every sprint:

- backend scope
- frontend scope
- audit scope
- fix scope
- re-audit scope
- GREEN criteria
- handoff decision: can the remaining work continue in the next sprint or not

### Sprint completion rule

The sprint is not complete just because the feature is implemented. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind known correctness, security, routing, ownership, or attribution gaps that block dependable use of the sprint outcome, the work must not be treated as ready to continue to the next sprint.

If only non-blocking polish or deliberately deferred expansion remains, the sprint may be marked as safe to continue into the next sprint.

## User Roles In This Sprint

Primary active roles:

- Organizer
  - creates and manages event nodes
  - decides which nodes exist in an event
  - assigns cards to nodes
  - generates QR codes for nodes

- Exhibitor or stall owner
  - concept becomes visible in this sprint as a node-linked business identity
  - may be represented through assigned card ownership or organizer-managed assignment
  - full exhibitor permissions are not required yet

- Scanner or visitor
  - public user who scans a node QR
  - can reach the event node landing flow
  - does not yet complete final sharing consent logic in this sprint

Roles acknowledged but not fully active:

- Attendee
- Staff
- Speaker
- Sponsor

## User Stories

### Organizer stories

1. As an organizer, I want to create a main event QR so that attendees can enter the event networking flow from one common entry point.

2. As an organizer, I want to create stall-specific nodes so that each exhibitor or booth can have its own scannable identity.

3. As an organizer, I want to assign a Dotly card to each node so that the stall or event identity displayed after scan is correct.

4. As an organizer, I want to download or retrieve a QR for each node so it can be printed or displayed physically.

5. As an organizer, I want scans to resolve with event and node context so future exchange and lead logic can behave correctly.

### Visitor stories

1. As a visitor, I want a node QR to take me to the right event-specific experience rather than a generic card page.

2. As a visitor, I want the landing page to clearly tell me whether I scanned the main event or a specific stall.

### Platform stories

1. As the platform, I need every scan destination to be attributable to both event and node so analytics and CRM can remain structured.

2. As the platform, I need node-to-card assignment to be explicit so the public experience has a reliable identity source.

3. As the platform, I need QR generation for Event Radar to reuse existing QR infrastructure where possible instead of inventing a parallel system unnecessarily.

## Domain Model

This sprint introduces the concept of an `EventNode`.

An event node is a scannable destination inside an event.

Examples:

- main event networking entry
- stall A
- stall B
- sponsor desk

For V1, the product should keep the node model simple.

### Recommended node types

- `EVENT_MAIN`
- `STALL`

Optional future-safe values if needed but not yet active:

- `SPONSOR`
- `SESSION`
- `CHECKIN_DESK`

Recommendation:

- only expose `EVENT_MAIN` and `STALL` in V1 UI
- avoid adding public product complexity for unsupported node types even if the enum leaves room for them later

## Node Behavior Model

### `EVENT_MAIN`

Represents the primary entry point for the whole event.

Use cases:

- event-wide networking entry
- event welcome scan
- main event lead capture or attendee join flow

Constraints:

- an event should normally have only one active primary `EVENT_MAIN` node
- if multiple are allowed later, one should be marked primary

Recommendation for V1:

- enforce one `EVENT_MAIN` node per event

### `STALL`

Represents a booth or stall within the event.

Use cases:

- exhibitor booth QR
- partner desk QR
- product area QR

V1 stall fields should remain pragmatic:

- display name
- code or short label if needed
- optional description
- assigned card
- active/inactive state
- optional sort order

Do not add floor maps, capacity, schedule, or staffing workflows in this sprint.

## Functional Requirements

### FR1 - Create event node

An organizer can create an event node within an event they own.

Required fields:

- event id
- node type
- node name

Optional fields:

- description
- assigned card id
- is active
- display order

Rules:

- event must exist and belong to the organizer
- node type must be valid
- node name must not be empty after trimming
- `EVENT_MAIN` uniqueness must be enforced per event
- assigned card must be valid and authorized for use

### FR2 - List nodes within event

An organizer can list all nodes for an event they own.

The list response should include:

- id
- event id
- type
- name
- description
- assigned card summary if present
- active state
- created at
- updated at
- future-ready scan counts if later added

### FR3 - View event node details

An organizer can retrieve one event node and see:

- parent event summary
- node type
- assigned card
- QR availability
- active state
- future-ready attribution identifiers

### FR4 - Update event node

An organizer can update:

- node name
- description
- assigned card id
- active state
- display order

Updating the node must not break QR identity in a way that loses attribution history.

Important rule:

- node identity should remain stable over time
- card assignment may change
- node id must remain the durable attribution key

### FR5 - Archive or deactivate node

An organizer can deactivate a node.

Recommendation:

- prefer `isActive` or `status` at node level over hard delete
- if delete exists, it should be restricted to unused nodes only or clearly documented as destructive

### FR6 - Assign card to node

An organizer can attach a Dotly card to the node.

Rules:

- assigned card must belong to the organizer or be otherwise authorized via existing team patterns
- assignment is optional for initial node creation but required before public scan flow is considered fully usable
- changing the assigned card later must not erase analytics and exchange history for the node

### FR7 - Generate QR for node

An organizer can generate a QR for a node.

The QR payload should resolve to a stable Event Radar route that preserves:

- event id or event slug context
- node id or node slug context

Recommendation:

- prefer a dedicated Event Radar route rather than pointing directly to `/card/:handle`

Because the system needs to know that this is an event node scan, not a generic card visit.

### FR8 - Retrieve node QR

An organizer can retrieve the existing QR asset or generated payload for a node.

The response should include:

- short url or destination url
- SVG representation
- PNG data if existing QR infrastructure already supports it
- styling metadata if customizable in the future

### FR9 - Public scan route resolves node context

When a user scans an event node QR, the public route must resolve:

- event
- node
- assigned card if present
- node type

The landing route should not yet finalize exchange logic, but it must establish node-aware context for the next sprint.

### FR10 - Basic node landing shell

The public node landing shell should display enough truth for the visitor to understand what they scanned.

Recommended elements:

- event name
- node name
- node type label
- assigned card identity if present
- short message such as `You are connecting with this stall through Event Radar`
- continue CTA into later exchange flow shell

### FR11 - Attribution readiness

Any downstream analytics or exchange flow triggered from a node landing route must be able to attach:

- `eventId`
- `eventNodeId`
- `eventNodeType`
- `assignedCardId`

This sprint can stop short of complete analytics implementation if the route and server resolution are in place.

## Backend Scope

The backend scope for this sprint is the minimum server and data layer required to support node-managed QR destinations within an event.

### Database

Add a new `EventNode` model.

Recommended fields:

- `id: String`
- `eventId: String`
- `type: EventNodeType`
- `name: String`
- `slug: String?`
- `description: String?`
- `assignedCardId: String?`
- `isActive: Boolean`
- `displayOrder: Int`
- `createdAt: DateTime`
- `updatedAt: DateTime`

Recommended relations:

- `event`
- `assignedCard`

Optional supporting model if needed:

- `EventNodeQr`

Recommendation:

- do not create a separate QR table unless existing QR code persistence patterns make it necessary
- if existing QR infra can store node QR metadata in a generic way, reuse it
- otherwise add a minimal event-node QR storage model only if required

### Index and constraints

- index on `eventId`
- index on `assignedCardId`
- composite index on `eventId, type`
- composite index on `eventId, isActive`
- unique constraint to ensure only one `EVENT_MAIN` node per event if implemented at DB level or enforced clearly in service

### API module and service

Recommended endpoints:

- `POST /events/:id/nodes`
- `GET /events/:id/nodes`
- `GET /events/:eventId/nodes/:nodeId`
- `PATCH /events/:eventId/nodes/:nodeId`
- `PATCH /events/:eventId/nodes/:nodeId/deactivate`
- `POST /events/:eventId/nodes/:nodeId/qr`
- `GET /events/:eventId/nodes/:nodeId/qr`

Public route support:

- `GET /public/events/nodes/:nodeId`

or equivalent lookup route needed by the web app to resolve node identity.

### Service responsibilities

- verify event ownership for organizer operations
- verify assigned card ownership or authorization
- enforce one-main-node rule
- produce stable node destination URLs
- generate QR content based on node route, not raw card route
- return node details needed by the web landing page

### DTO and validation scope

- create DTOs for node creation and update
- validate node type enum
- validate trimmed node name
- validate assigned card existence and authorization
- validate event-node relationship consistency
- reject generating QR for nonexistent or unauthorized nodes

### Backend test scope

- owner-only access tests for node CRUD
- one-main-node uniqueness tests
- assigned-card authorization tests
- QR generation tests for node routes
- public route resolution tests
- negative tests for invalid event/node combinations

## Frontend Scope

The frontend scope for this sprint covers organizer-facing node management and a public node landing shell.

### Organizer dashboard scope

Add node management under event detail.

Organizer capabilities:

- create node
- select node type
- name node
- assign card
- generate QR
- see node list within event
- open node detail
- deactivate node

### Event detail integration

The event detail page from Sprint 001 should now include a real `Nodes` or `Stalls` section.

Recommended modules:

- primary event node card
- stall list
- `Create stall` action
- QR availability state
- assigned card summary

### Node creation UX

Recommended flow:

1. Organizer opens event detail
2. Organizer selects `Add node`
3. Organizer chooses:
   - `Main Event`
   - `Stall`
4. Organizer enters node name
5. Organizer optionally assigns card immediately
6. Organizer saves
7. Organizer can generate QR from the node detail or inline action

### Node list UX requirements

Each node row or card should show:

- node name
- node type
- active/inactive state
- assigned card name or handle
- QR state: generated or not generated
- actions: edit, generate QR, view QR, deactivate

### QR management UI

For each node, organizer should be able to:

- generate QR
- preview QR
- download PNG
- download SVG if supported
- copy destination URL

### Public landing shell

This sprint should add a simple node-aware public route that is honest about current capability.

Recommended content:

- event title
- node title
- context line such as `You scanned the networking QR for Chennai Founder Expo 2026`
- if node has assigned card, show brand/business identity
- CTA placeholder for `Continue`
- optional note that exchange preferences are selected in the next step if the next sprint is not implemented yet

The shell must not imply completed sharing logic if it does not exist yet.

### Frontend technical scope

- reuse the existing cards/QR visual language where practical
- avoid creating a separate design system for Event Radar
- use a route structure that will scale to later consent and registration flows

### Frontend test scope

- create node flow
- assign card flow
- generate QR flow if feasible
- render of node landing shell for main event and stall node variants
- empty and error states

## URL And Routing Strategy

Recommendation:

- use a dedicated Event Radar public route

Examples:

- `/r/events/n/:nodeId`
- `/event-radar/n/:nodeId`
- `/card/event/:nodeId`

Preferred principle:

- short enough for QR
- clearly not a generic card route
- stable over time

Do not encode card handle as the primary QR target because card assignment can change while node identity should remain stable.

## QR Strategy

This sprint should leverage the repo's existing QR generation patterns where possible.

Important behavioral rule:

- card QR and event-node QR are not the same product object

Card QR:

- points to a card

Event node QR:

- points to an event-specific route
- may display an assigned card after resolution
- must preserve event attribution

### QR payload rule

The QR destination should identify the node first.

Not this:

- `/card/:handle`

Prefer this:

- `/r/events/n/:nodeId`

Then server or web route resolves:

- event
- node
- assigned card
- node behavior

## Card Assignment Rules

Card assignment is central to this sprint.

Rules:

- a node may exist before a card is assigned
- a public usable node should strongly encourage card assignment
- a node can be reassigned to a different card later
- historical analytics/exchange attribution remains tied to node id, not overwritten by card reassignment

Open product choice:

- can the same card be assigned to multiple nodes?

Recommendation for V1:

- yes, allow it

Reason:

- one business may operate multiple booths or entry points
- restricting this too early creates operational friction

## Data Model Impact

New primary model:

- `EventNode`

Potential optional model:

- `EventNodeQr` if reuse of existing card QR persistence is impractical

Future relations prepared by this sprint:

- `Exchange.eventNodeId`
- analytics metadata `eventNodeId`
- registrations/check-ins may later reference nodes for entry context

## API Plan

### Create node request example

```json
{
  "type": "STALL",
  "name": "Booth A - Dotly Sales",
  "description": "Main lead capture booth for sales demos.",
  "assignedCardId": "card_123",
  "isActive": true
}
```

### Create node response example

```json
{
  "id": "node_123",
  "eventId": "evt_123",
  "type": "STALL",
  "name": "Booth A - Dotly Sales",
  "description": "Main lead capture booth for sales demos.",
  "assignedCardId": "card_123",
  "isActive": true,
  "displayOrder": 0,
  "createdAt": "2026-04-10T11:00:00.000Z",
  "updatedAt": "2026-04-10T11:00:00.000Z"
}
```

### Generate node QR response example

```json
{
  "nodeId": "node_123",
  "shortUrl": "https://dotly.one/r/events/n/node_123",
  "svgData": "<svg>...</svg>",
  "pngDataUrl": "data:image/png;base64,..."
}
```

### Public node resolution response example

```json
{
  "event": {
    "id": "evt_123",
    "name": "Chennai Founder Expo 2026",
    "type": "EXHIBITION"
  },
  "node": {
    "id": "node_123",
    "type": "STALL",
    "name": "Booth A - Dotly Sales",
    "description": "Main lead capture booth for sales demos."
  },
  "assignedCard": {
    "id": "card_123",
    "handle": "dotly-sales",
    "fields": {
      "name": "Dotly Sales"
    }
  },
  "exchangeDefaults": {
    "eventId": "evt_123",
    "eventNodeId": "node_123"
  }
}
```

## Validation Rules

- node name required and trimmed
- node description optional with max length
- node type must be valid
- `EVENT_MAIN` unique per event
- assigned card must exist and be authorized
- QR generation only allowed for authorized organizer and valid node
- public route must not resolve inactive or unauthorized nodes in a misleading way

## Public Route Behavior

The public route is part of this sprint because QR without a route is not a usable product surface.

Recommended behavior:

- if node exists and is active, render node landing shell
- if node exists but has no assigned card, still render a truthful fallback state
- if node is inactive or not found, show a clear unavailable state

Do not silently redirect to unrelated card pages.

## Analytics Plan

This sprint should prepare for event-node attribution even if analytics recording is lightweight at first.

Recommended metadata on any public view events originating from node route:

- `eventId`
- `eventNodeId`
- `eventNodeType`
- `assignedCardId`
- `surface: event_radar_node`

If the repo already records analytics against cards only, V1 may continue to write card-linked events while including node and event metadata in the event payload.

## CRM Impact

This sprint should not yet create exchange contacts automatically just from node resolution.

However, it must define the attribution path so later contacts or lead submissions can reliably include:

- source event id
- source node id
- source node type
- assigned card id

Recommendation:

- attach event/node metadata to future contact timeline and lead submission records rather than inventing a separate contact object

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- event ownership and node ownership correctness
- assigned-card authorization
- one-main-node enforcement
- route resolution correctness
- QR destination stability
- inactive node behavior
- event/node attribution readiness
- UI truthfulness around unimplemented sharing logic

### Audit checklist

- can a non-owner create nodes in another organizer's event?
- can a non-owner assign their card to another organizer's event improperly?
- can a user retrieve another organizer's node QR?
- does node QR point to a stable node route rather than a mutable card route?
- can an inactive node still be used publicly?
- can an organizer create multiple `EVENT_MAIN` nodes accidentally?
- does changing assigned card preserve node identity?
- does the public landing shell mislead users into thinking contact exchange is already complete?

## Fix Scope

Any issues found during audit that affect ownership, routing, node identity, authorization, or user-trust must be fixed inside this sprint.

Must-fix categories:

- broken organizer ownership checks
- broken card authorization checks
- unstable or wrong QR destination construction
- ability to create duplicate main event nodes when not allowed
- inactive nodes resolving as active public experiences
- UI language that claims full exchange logic exists when it does not

Can-defer categories only with explicit note:

- minor QR styling polish
- advanced sorting or filtering
- optional slug support
- richer public landing visuals that do not change behavior

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- node CRUD still works after fixes
- main-event uniqueness still holds
- card assignment rules still hold
- QR generation still produces stable node URLs
- public resolution still loads correct event and node identity
- the public shell remains truthful and non-misleading

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- `EventNode` model and migration are applied cleanly
- organizer can create and manage event nodes
- one active main event node rule is enforced correctly
- card assignment works with proper authorization checks
- organizer can generate and retrieve QR for a node
- QR points to a stable Event Radar route, not a generic card route
- public node route resolves event and node context correctly
- inactive or missing nodes are handled clearly
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for node CRUD, authorization, and QR routing pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `003-p01-01C-sharing-rules-and-consent.md` when:

- node identity is stable
- QR routing is stable
- event and node attribution are reliable
- the public landing shell can hand control to a consent or exchange step next

This sprint must not hand off as ready if:

- QR destinations still point to plain card routes
- event/node context is not consistently available
- assigned card authorization is weak
- inactive nodes behave unpredictably

### What may continue in the next sprint

- field selection for sharing
- stall-only vs organizer-only vs event-wide scope logic
- mutual exchange behavior
- public consent flow after scan

### What must not be pushed carelessly to the next sprint

- broken node ownership
- broken QR route resolution
- duplicate main-node conflicts
- unstable node identity semantics

## Dependencies

Technical dependencies:

- Sprint 001 event foundation
- authenticated user context
- existing QR generation capabilities
- web routing and public page infrastructure

Product dependencies:

- agreement that node route should be node-first, not card-first
- confirmation that `EVENT_MAIN` and `STALL` are enough for V1 UI
- agreement on whether one main event node per event is enforced in V1

## Non-Goals

- registration entry forms
- attendee directory
- mutual exchange network
- event-wide broadcast sharing
- lead capture field consent UI
- pass and check-in workflows

## Risks

### Risk 1 - Reusing card QR behavior too literally

If node QR is implemented as a thin wrapper around card QR, Event Radar may lose event attribution and become impossible to reason about later.

Mitigation:

- make node QR resolve to a node route first

### Risk 2 - Node identity tied too closely to assigned card

If the system treats the card as the node's real identity, later reassignment will break reporting consistency.

Mitigation:

- keep node id as the durable primary attribution key

### Risk 3 - Overcomplicated stall modeling too early

If the sprint tries to model floors, maps, staffing, and scheduling now, it will slow delivery without helping the core QR flow.

Mitigation:

- keep stalls as simple event nodes in V1

### Risk 4 - Misleading public shell

If the scan landing page behaves like a finished exchange flow before consent logic exists, users may be confused or lose trust.

Mitigation:

- ensure the landing page clearly states the current step and next step

## Open Questions

1. Should V1 allow organizers to create a node without assigning a card, or should card assignment be required at create time?

2. Should `slug` be added to nodes now, or should node id remain the only QR target until public URLs matter more?

3. Should `EVENT_MAIN` uniqueness be enforced in the database or only in service logic?

4. Should the public node route render a dedicated Event Radar page, or a card page wrapper with event context?

5. Should deactivation preserve QR resolution with an unavailable message, or return a hard not-found state?

## Recommended Implementation Notes

- Prefer one simple `EventNode` model over multiple booth-specific models.
- Keep QR destinations node-first and stable.
- Reuse existing QR generation service patterns where sensible, but do not reuse card semantics blindly.
- Preserve separation of concerns:
  - event defines context
  - node defines scan destination
  - card defines business identity
  - later sprint defines exchange behavior
- Keep public landing experience honest about current capability.

## Acceptance Criteria

1. An organizer can create an `EVENT_MAIN` node for an event they own.

2. An organizer can create one or more `STALL` nodes for an event they own.

3. The system prevents invalid or duplicate main-event node creation according to the defined rule.

4. An organizer can assign an authorized card to a node.

5. An organizer can generate and retrieve a QR for a node.

6. The QR resolves to a stable Event Radar node route rather than directly to a card route.

7. The public route can resolve and display event and node context for an active node.

8. Inactive or missing nodes are handled clearly and safely.

9. Node identity remains stable even if assigned card changes.

10. The system is ready for the next sprint to add sharing rules and consent on top of the node route.

## Definition Of Done

This sprint is complete when:

- event node schema exists and is migrated
- organizer-owned node CRUD is implemented
- node-to-card assignment works with authorization
- node QR generation and retrieval are implemented
- public node route resolves correct event/node context
- inactive node handling is in place
- audit, fix, and re-audit are completed
- documentation clearly explains how sharing-rules work will attach to node entry next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may start on top of this routing and node foundation

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat node routing and QR behavior as stable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Event nodes are stable and owner-controlled
- QR resolves to node-first Event Radar routes
- Public node route exposes dependable event and node context for consent flow work

Deferred:

- Optional node slug support
- Optional advanced node ordering UX
```
