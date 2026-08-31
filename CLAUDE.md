# CLAUDE.md — DIRECTOR Backend

## Working Mode

DIRECTOR Backend orchestrates real-world Sessions and Scenes.

It is not a generic CRUD API and must never treat LLM output as trusted real-world data.

- Make the smallest coherent change.
- Do not refactor unrelated code.
- Inspect only files relevant to the task.
- Prefer existing patterns over new abstractions.
- Do not recursively explore the repository unless required.
- `package.json` is the source of truth for installed versions.
- Preserve existing API/database contracts unless a migration is explicitly required.

Do not preload `docs/ai/*`.

Read only when relevant:

- Product / UX → `docs/ai/PRODUCT.md`
- Session / Scene domain → `docs/ai/DOMAIN.md`
- Backend architecture → `docs/ai/ARCHITECTURE.md`
- Testing / security / quality → `docs/ai/QUALITY.md`

Read multiple docs only when the task crosses those boundaries.

If the user's latest explicit instruction conflicts with documentation, follow the user.

Update documentation only when the decision is intended to become permanent.

## Product Invariants

Always preserve:

1. One Scene at a Time — do not expose the full itinerary by default.
2. Context First — real constraints outrank LLM creativity.
3. Reality Verified — real-world completion must be verifiable.
4. Re-Direct — completion, skip, veto or context changes can alter the next Scene.
5. Memory Compounds — actual behavior improves future Sessions.
6. Safety First — unsafe or unverifiable Scenes must not be returned.

Never invent:

- POIs
- coordinates
- prices
- opening hours
- availability
- routes
- weather
- safety facts

LLM output is untrusted input.

A generated Scene must pass trusted-data and constraint validation before persistence or response.

## Technical Baseline

For new development:

- Node.js 24 LTS
- TypeScript strict mode
- Fastify 5
- PostgreSQL
- Drizzle ORM
- Zod
- REST API
- Docker

Optional only when required:

- PostGIS for advanced geospatial queries
- Redis for caching, locks or queues
- Object storage for user media

Installed versions in `package.json` take precedence.

Do not add or upgrade dependencies unless the task requires them.

Do not introduce GraphQL, microservices, queues or Redis without a concrete need.

## Architecture

Use:

```text
src/
  app/
  modules/
  integrations/
  shared/
```

Responsibilities:

- `app`: server bootstrap, plugins, routing composition, lifecycle
- `modules`: DIRECTOR business domains and use cases
- `integrations`: external AI, Places, Weather, storage providers
- `shared`: database, config, errors, logger, utilities

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

Typical integrations:

```text
integrations/
  ai/
  places/
  weather/
  storage/
```

Preferred dependency flow:

```text
route
→ service/use-case
→ repository or integration
→ database/external provider
```

Rules:

- Routes handle transport concerns only.
- Business rules live in services/use-cases.
- SQL/database access lives in repositories or focused DB modules.
- External providers stay behind integration adapters.
- Domain modules must not directly depend on provider SDK details.
- Avoid cross-module deep imports.
- Prefer small public APIs between modules.
- Do not create generic abstractions before multiple real use cases exist.

## Core Orchestration

Scene generation should follow:

```text
Session
→ Context
→ Candidate Places/Actions
→ Constraint Filtering
→ Director Decision
→ Scene Generation
→ Final Constraint Validation
→ Persist
→ Response
```

Never use:

```text
User
→ LLM
→ Scene returned directly
```

The LLM may decide how to frame or choose an experience.

The LLM must not independently establish whether a place exists, is open, is safe or is reachable.

## Domain Flow

```text
START
→ SESSION SETUP
→ CONTEXT
→ SAFETY CHECK
→ SCENE
→ ACTIVE SCENE
→ VERIFY / EVIDENCE
→ RE-DIRECT
→ next SCENE
→ END CREDITS
```

MVP priority:

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

Treat `CHALLENGE` as secondary until safety and verification are clearly defined.

## API Rules

Use resource-oriented REST with action endpoints where domain behavior requires them.

Examples:

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

- Validate params, query and body at the API boundary.
- Use Zod schemas for external input/output contracts where practical.
- Never trust mobile input.
- Never return raw provider responses.
- Do not expose internal/provider errors directly.
- Keep response contracts explicit and stable.
- Prefer idempotency where duplicate mobile requests can cause incorrect state.
- Use transactions for state changes that must succeed atomically.

## Database Rules

PostgreSQL is the primary database.

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

- Drizzle schema is the source of truth for database structure.
- Schema changes require migrations.
- Do not edit production tables manually as part of normal development.
- Use foreign keys and database constraints where appropriate.
- Prefer explicit columns for important queryable fields.
- Use `jsonb` only for genuinely flexible structures.
- Avoid N+1 queries.
- Select only fields needed by the use case.
- Use transactions for multi-write invariants.

Do not store precise location indefinitely without a product requirement.

Prefer derived or reduced location data for long-term history.

## State Authority

The backend is authoritative for:

- Session lifecycle
- Scene lifecycle
- Scene results
- Evidence metadata
- Memory
- Place history
- server-side constraints

The mobile app may hold temporary UI state but must not be trusted as authoritative for server-owned state.

## External Integrations

External services must be wrapped by adapters.

Examples:

```text
AI provider
Places provider
Weather provider
Object storage
```

Each adapter should:

- expose only data needed by DIRECTOR
- normalize provider-specific responses
- enforce timeouts
- map provider errors
- avoid leaking provider SDK types into domain code

Do not let a provider SDK define the domain model.

API keys and secrets must remain server-side.

## AI Rules

Use structured output.

Validate AI output before using it.

Prefer:

```text
trusted candidates
+ current context
+ session state
+ relevant memory
→ AI decision
→ schema validation
→ constraint validation
```

Avoid sending unnecessary personal or location history to AI providers.

Do not send secrets or unrelated database records to model providers.

Do not use AI when deterministic logic is sufficient.

## Location & Safety

Location-sensitive logic must consider relevant constraints such as:

- current location
- distance
- travel time
- transportation
- remaining Session time
- opening hours
- weather
- budget
- accessibility
- user veto/history
- safety rules

Required safety/navigation data must never be hidden for surprise UX.

Do not generate arbitrary destination coordinates.

Use trusted place/location sources.

## Code Rules

- Prefer files ≤100 lines when practical.
- Split by responsibility, not merely line count.
- Do not create artificial abstractions solely to satisfy the limit.
- Prefer one main use-case/service/repository concern per file.
- Use strict TypeScript.
- Avoid `any` and broad assertions.
- Avoid duplicated domain/DTO shapes.
- Prefer pure domain functions for deterministic rules.
- Prefer early returns over deeply nested conditions.
- Keep route handlers thin.
- Keep provider logic out of domain services.
- Add comments only when intent is not clear from code.

## Error Handling

Use explicit application errors.

Separate:

```text
validation errors
authentication/authorization errors
not found
domain conflicts
constraint failures
provider failures
internal failures
```

Do not:

- expose stack traces to clients
- expose raw SQL errors
- expose provider secrets
- silently swallow errors

Log enough context to diagnose failures without logging sensitive user data.

## Security

Never commit or expose:

- API keys
- database passwords
- JWT/session secrets
- provider credentials

Use environment variables validated at startup.

Reject startup when required configuration is missing.

Treat all client input, provider output and AI output as untrusted.

Use authentication and authorization checks at server boundaries where applicable.

Do not log:

- access tokens
- secrets
- full precise-location history
- private user media
- unnecessary personal data

## Testing

Prefer focused tests around domain behavior.

Prioritize:

- constraint rules
- Session state transitions
- Scene lifecycle
- skip/veto behavior
- evidence verification
- Memory updates
- API validation
- provider adapter error handling

Mock external providers at integration boundaries.

Do not mock core domain logic merely to make tests pass.

## Execution

For non-trivial changes:

1. Inspect the closest implementation and contracts.
2. Identify the smallest affected module.
3. Read only relevant documentation.
4. Plan briefly.
5. Implement without unrelated cleanup.
6. Run the narrowest useful type/test/lint check.
7. Fix failures caused by the change.
8. Run broader checks only when needed.

Do not:

- delete user data
- reset databases
- drop tables
- remove migrations
- run destructive Docker/database commands

without explicit permission.

## Done When

Confirm relevant items:

- types pass
- affected tests pass
- input validation exists
- error paths are handled
- database invariants remain valid
- migrations exist when schema changes
- transactions are used where required
- external calls have failure handling
- AI output is validated
- constraints are not bypassed
- no secrets or sensitive logs were added
- API contracts remain intentional
- module boundaries remain intact

Keep final responses compact:

- what changed
- files changed
- migrations/API changes
- checks run
- unresolved caveats