# AGENTS.md — DIRECTOR Backend

## Mission

Build the backend for DIRECTOR, a Scene-driven real-world entertainment product.

The backend owns Session orchestration, trusted context, constraint validation, Scene lifecycle, verification and Memory.

It is not a generic CRUD API or an LLM proxy.

## Context Budget

Keep exploration narrow.

- Read this file first.
- Do not recursively inspect the repository by default.
- Search by relevant path, symbol or usage.
- Inspect the nearest implementation before creating new patterns.
- Avoid large directory/file dumps.
- Do not re-summarize unchanged project context.
- `package.json` is the source of truth for installed versions.

Do not preload `docs/ai/*`.

Read only when relevant:

- Product / UX → `docs/ai/PRODUCT.md`
- Session / Scene domain → `docs/ai/DOMAIN.md`
- Backend architecture → `docs/ai/ARCHITECTURE.md`
- Testing / security / quality → `docs/ai/QUALITY.md`

Read multiple docs only when the task genuinely spans them.

## Product Invariants

Always preserve:

- One Scene at a time.
- Real context outranks LLM creativity.
- LLM output is untrusted.
- Real-world places/actions require trusted data.
- Every Scene must pass constraints before being returned.
- Completion, skip, veto and context changes may cause re-planning.
- Memory learns from actual behavior.
- Required safety/accessibility/navigation information is never hidden.

Never invent:

- POIs
- coordinates
- prices
- opening hours
- availability
- weather
- routes
- safety facts

## Stack

For new development:

- Node.js 24 LTS
- TypeScript strict mode
- Fastify 5
- PostgreSQL
- Drizzle ORM
- Zod
- REST
- Docker

Optional only when justified:

- PostGIS
- Redis
- object storage

Installed project versions take precedence.

Do not add or upgrade dependencies unless required.

Do not introduce GraphQL, microservices, queues or distributed infrastructure without a concrete requirement.

## Architecture

```text
src/
  app/
  modules/
  integrations/
  shared/
```

Typical modules:

```text
modules/
  auth/
  user/
  session/
  scene/
  evidence/
  memory/
```

Integrations:

```text
integrations/
  ai/
  places/
  weather/
  storage/
```

Preferred flow:

```text
route
→ service/use-case
→ repository/integration
→ PostgreSQL/provider
```

Rules:

- Routes handle HTTP concerns only.
- Business rules belong in services/use-cases.
- Database access belongs in repositories/focused DB modules.
- Provider SDKs stay inside `integrations`.
- Provider types must not leak into domain contracts.
- Avoid cross-module deep imports.
- Prefer small explicit public module APIs.
- Do not abstract before a real repeated use case exists.

## Core Orchestration

Next Scene generation should resemble:

```text
load Session
→ collect Context
→ fetch trusted Candidates
→ filter Constraints
→ AI/director decision
→ generate Scene representation
→ validate schema
→ validate final Constraints
→ persist
→ respond
```

Never:

```text
client prompt
→ LLM
→ direct Scene response
```

Deterministic validation must remain outside the LLM.

## Domain Flow

```text
START
→ SETUP
→ CONTEXT
→ SAFETY CHECK
→ SCENE
→ ACTIVE SCENE
→ VERIFY / EVIDENCE
→ RE-DIRECT
→ next SCENE
→ END CREDITS
```

MVP:

```text
SOLO
DATE
```

Primary Scene types:

```text
MOVE
DISCOVER
CHOOSE
PHOTO
```

`CHALLENGE` is secondary until safety and verification are explicit.

## API Policy

Prefer explicit REST endpoints.

Typical actions:

```text
POST /sessions
GET  /sessions/:sessionId

POST /sessions/:sessionId/scenes/next

POST /scenes/:sceneId/complete
POST /scenes/:sceneId/skip
POST /scenes/:sceneId/veto

POST /sessions/:sessionId/end
GET  /sessions/:sessionId/credits
```

Rules:

- Validate all external input.
- Prefer Zod contracts.
- Never trust mobile-supplied state.
- Never expose raw provider responses.
- Keep response types stable and explicit.
- Map internal/provider errors to application errors.
- Consider duplicate/retry behavior for mutations.
- Use transactions for atomic state transitions.

## Database Policy

PostgreSQL is authoritative persistence.

Core data may include:

```text
users
sessions
scenes
scene_evidence
preferences
memories
place_history
session_feedback
```

Rules:

- Drizzle schema defines database structure.
- Schema changes require migrations.
- Never silently modify production schema.
- Use database constraints for important invariants.
- Prefer typed columns over unnecessary JSON blobs.
- Use `jsonb` only for flexible data.
- Avoid N+1 queries.
- Avoid `SELECT *` when unnecessary.
- Use transactions for dependent writes.

Do not retain precise-location data longer than necessary.

## State Authority

Server-owned state includes:

- Session lifecycle
- current/previous Scenes
- completion state
- Evidence metadata
- Memory
- PlaceHistory
- constraint decisions

Do not trust client state as the final authority for server-owned data.

## Integration Policy

Wrap every external provider.

Adapters must:

- normalize provider data
- expose minimal domain-friendly contracts
- set timeouts
- handle provider failures
- avoid leaking SDK-specific types

Examples:

```text
AI
Places
Weather
Storage
```

Secrets stay server-side.

## AI Policy

Use AI only where probabilistic reasoning or creative Scene direction adds value.

Preferred pipeline:

```text
trusted input
→ structured AI output
→ Zod/schema validation
→ deterministic constraint validation
→ persistence
```

Treat model output as untrusted.

Do not let AI determine factual availability or safety without trusted validation.

Do not send unnecessary user history or sensitive data to providers.

## Coding Constraints

- Prefer files ≤100 lines when practical.
- Split by responsibility, not line count alone.
- Avoid artificial abstractions.
- Use strict TypeScript.
- Avoid `any` and broad casts.
- Prefer explicit domain names and small pure functions.
- Keep route handlers thin.
- Keep SQL out of route handlers.
- Keep provider SDK calls out of domain modules.
- Avoid duplicated DTO/domain models.
- Comments should explain why, not restate code.

## Error & Logging Policy

Distinguish:

```text
validation
auth
not-found
domain conflict
constraint failure
provider failure
internal failure
```

Never expose:

- stack traces
- raw SQL errors
- credentials
- raw provider secrets

Never log:

- tokens
- passwords
- API keys
- unnecessary precise locations
- private media
- unnecessary personal information

## Test Priorities

Prioritize behavior with business risk:

- Session transitions
- Constraint Engine
- Scene generation pipeline
- Scene complete/skip/veto
- evidence verification
- Memory updates
- API validation
- database transactions
- provider failures

Mock providers at adapter boundaries.

Prefer deterministic unit tests for constraint/domain rules.

## Execution Policy

When changing code:

1. Inspect the nearest implementation and contracts.
2. Identify the smallest affected module/files.
3. Read only relevant docs.
4. Make the smallest coherent change.
5. Preserve API/database contracts unless migration is required.
6. Add/update focused tests.
7. Run focused existing `package.json` scripts.
8. Fix failures caused by the change.
9. Expand checks only when necessary.

Never run destructive commands without explicit permission.

This includes:

```text
DROP DATABASE
DROP TABLE
TRUNCATE
database reset
migration deletion
volume deletion
rm -rf user/project data
destructive Docker cleanup
```

Do not alter production infrastructure merely to make local tests pass.

## Review Before Finish

Check relevant items:

- type safety
- validation boundaries
- null/error paths
- authorization if applicable
- transaction correctness
- N+1/query behavior
- API compatibility
- migrations
- provider timeout/failure behavior
- AI schema validation
- deterministic constraint validation
- sensitive logs/secrets
- module boundaries
- tests

Final response should be compact:

- what changed
- files changed
- API/schema/migration changes
- checks run
- remaining caveats