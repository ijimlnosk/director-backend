# DOMAIN.md — DIRECTOR Backend

## Domain Model

Core entities:

```text
User
Session
Scene
Evidence
Preference
Memory
PlaceHistory
SessionFeedback
```

## Session

A Session is one DIRECTOR experience.

Suggested state:

```text
DRAFT
ACTIVE
COMPLETED
CANCELLED
```

A Session owns:

- mode
- duration
- budget
- transport
- mood
- start/end time
- current state
- current Scene
- remaining time
- remaining budget

The server is authoritative for Session lifecycle.

## Scene

A Scene is the smallest real-world action unit.

Primary types:

```text
MOVE
DISCOVER
CHOOSE
PHOTO
```

Optional later:

```text
CHALLENGE
```

Suggested state:

```text
PENDING
ACTIVE
COMPLETED
SKIPPED
VETOED
FAILED
EXPIRED
```

Only one Scene should normally be active per Session.

## Scene Contract

A Scene should contain only what the client needs.

Example domain fields:

```text
id
sessionId
type
title
instruction
hint
distance
timeLimit
placeRef?
verificationType
status
createdAt
```

Do not expose provider SDK objects directly.

Do not embed untrusted factual claims from the model without validation.

## Context

Context is transient input used to decide the next Scene.

Possible fields:

```text
currentLocation
currentTime
weather
transport
remainingTime
remainingBudget
recentScenes
accessibility
sessionMode
mood
relevantMemory
```

Context should not automatically become permanent storage.

## Candidate

A Candidate is a feasible place/action option before final Scene selection.

Candidate source should be trusted or deterministic.

Possible fields:

```text
providerPlaceId
name
location
distance
category
openingState
estimatedTravelTime
priceLevel?
accessibility?
```

Candidate != Scene.

Candidates must be filtered before being sent to the AI layer.

## Constraint

Constraints are deterministic rules.

Typical constraints:

- maximum distance
- remaining Session time
- transport mode
- opening hours
- weather
- budget
- duplicate/recent visit
- accessibility
- age restriction
- safety policy
- user veto

Hard constraints reject a Candidate or Scene.

Soft constraints influence ranking.

Do not ask the LLM to replace deterministic constraint logic.

## Evidence

Evidence records how a Scene result was verified.

Supported MVP evidence:

```text
USER_CONFIRMATION
LOCATION
PHOTO
TIME
```

Evidence metadata may include:

```text
sceneId
type
capturedAt
location?
mediaRef?
result
```

Do not keep precise location longer than necessary.

## Completion

Scene completion should validate required evidence.

Example:

```text
MOVE
→ GPS/geofence + optional user confirmation

PHOTO
→ photo evidence + user confirmation

CHOOSE
→ explicit user selection
```

Verification failure must not silently mark a Scene complete.

## Skip

Skip means:

> This Scene is not suitable now.

Possible reasons:

```text
TOO_FAR
NOT_INTERESTED
TOO_EXPENSIVE
NO_TIME
WEATHER
OTHER
```

Skip should influence immediate re-planning and may affect future Memory.

## Veto

Veto is stronger than Skip.

Veto means:

> Avoid this place/category/activity for this user or Session.

Veto should be represented explicitly rather than inferred from every skip.

## Re-Direct

Re-Direct recalculates the next Scene using:

```text
current Session
+ previous Scene result
+ updated Context
+ remaining constraints
+ relevant Memory
```

Never reuse a previous plan blindly after a relevant context change.

## Memory

Memory should be structured.

Useful categories:

```text
EXPLICIT_PREFERENCE
BEHAVIORAL_PREFERENCE
PLACE_HISTORY
SESSION_FEEDBACK
SOCIAL_MEMORY
VETO_HISTORY
```

Memory must be inspectable and deletable at product level.

## Place History

PlaceHistory exists primarily to reduce unwanted repetition.

Store at least:

```text
userId
providerPlaceId
visitedAt
result
```

Prefer provider IDs over place-name matching.

## Session Feedback

SessionFeedback may include:

```text
rating
funLevel
distanceFeedback
difficultyFeedback
freeText?
```

Do not send free text to AI providers unless needed.

## State Authority

Backend authoritative:

- Session status
- Scene status
- current Scene
- Evidence result
- Memory
- PlaceHistory
- constraint decisions

Client authoritative only for temporary UI state.

## Domain Invariants

- A completed Session cannot receive a new active Scene.
- Normally only one active Scene exists per Session.
- A Scene cannot be completed twice.
- A skipped/vetoed Scene is not completed.
- Scene transitions should be transaction-safe.
- A final Scene must pass constraints after AI generation.
- Provider/AI failure must not corrupt Session state.
