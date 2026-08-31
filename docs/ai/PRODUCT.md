# PRODUCT.md — DIRECTOR Backend

## Purpose

DIRECTOR is a real-world entertainment product.

The backend does not merely answer questions. It coordinates a Session that moves the user through one feasible real-world Scene at a time.

Core promise:

> The user sets time, budget, transport and mood, presses START, and DIRECTOR decides the next feasible Scene.

## Product Principles

1. One Scene at a Time
   - Do not expose the full itinerary by default.
   - Surprise is part of the experience.

2. Context First
   - Real-world constraints outrank model creativity.
   - Location, time, weather, budget, transport, opening hours, accessibility and safety matter first.

3. No Chat-first UX
   - Chat is secondary.
   - Backend contracts should serve Session/Scene flows, not generic conversation flows.

4. Reality Verified
   - Completion should be grounded by GPS, time, user confirmation and optional photo evidence.

5. Memory Compounds
   - Completion, skip, veto and feedback should improve later Sessions.

6. Safety Before Surprise
   - Required safety, accessibility and navigation information must never be hidden.

## MVP Scope

Priority modes:

- SOLO
- DATE

Primary Scene types:

- MOVE
- DISCOVER
- CHOOSE
- PHOTO

Secondary:

- CHALLENGE

CHALLENGE should not become a core dependency until safety and verification are clearly defined.

## Core User Flow

```text
START
→ SESSION SETUP
→ SAFETY CHECK
→ SCENE
→ ACTIVE SCENE
→ VERIFY / EVIDENCE
→ RE-DIRECT
→ next SCENE
→ END CREDITS
```

## Session Inputs

A Session may include:

- mode
- duration
- budget
- transport
- mood
- current location
- accessibility constraints
- user veto/preferences

The backend may enrich this with:

- current time
- weather
- trusted place data
- previous Scene results
- remaining time
- remaining budget
- relevant Memory

## Product Behavior

The backend should return a single current Scene.

A Scene should be re-planned when relevant conditions change, including:

- place closed/unavailable
- excessive wait
- weather deterioration
- remaining time reduced
- budget risk
- user skip
- user veto
- safety/accessibility failure

## Memory

Long-term product value comes primarily from observed behavior.

Important signals:

- completed Scene
- skipped Scene
- vetoed category/place
- repeated preference
- completion rate
- distance tolerance
- repeated place history
- Session feedback

Prefer behavioral evidence over long onboarding questionnaires.

## End Credits

End Credits should summarize a completed Session using:

- Scene timeline
- selected photos
- total movement
- notable choices
- short generated story/summary

It should feel like a memory artifact, not an admin activity log.

## Monetization Direction

Do not optimize backend architecture around monetization during MVP.

Likely future models:

- paid Director Session
- Premium Memory / Director's Cut
- Travel Pack
- local booking/experience commission
- B2B themed packs

Do not allow paid tiers to bypass safety constraints.

## Non-Goals for MVP

Do not prioritize:

- social feed/follow system
- full subscription stack
- continuous all-day background location
- nationwide partner reservation platform
- long preference onboarding
- fully automated video editing
- generic LLM chat as a primary feature
