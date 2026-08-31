# ARCHITECTURE.md — DIRECTOR Backend

## Stack

Baseline for new development:

```text
Node.js 24 LTS
TypeScript
Fastify 5
PostgreSQL
Drizzle ORM
Zod
REST
Docker
```

Optional only when justified:

```text
PostGIS
Redis
Object Storage
```

`package.json` is the source of truth for installed versions.

## Project Structure

```text
src/
  app/
  modules/
  integrations/
  shared/
```

Recommended:

```text
src/
  app/
    server.ts
    plugins/
    routes.ts

  modules/
    auth/
    user/
    session/
    scene/
    evidence/
    memory/

  integrations/
    ai/
    places/
    weather/
    storage/

  shared/
    db/
    config/
    errors/
    logger/
    utils/
```

## Module Structure

Prefer small modules.

Example:

```text
modules/scene/
  scene.routes.ts
  scene.service.ts
  scene.repository.ts
  scene.schema.ts
  scene.types.ts
```

Do not create every file type mechanically.

Only create layers that have a real responsibility.

## Dependency Direction

Preferred flow:

```text
route
→ service/use-case
→ repository / integration
→ PostgreSQL / external provider
```

Rules:

- routes own HTTP concerns
- services/use-cases own business flow
- repositories own persistence
- integrations own external providers
- shared owns cross-cutting infrastructure

Avoid:

- SQL in route handlers
- provider SDK calls in domain services
- domain logic in Fastify hooks
- circular module dependencies
- cross-module deep imports

## API Boundary

Every external input is untrusted.

Validate:

- params
- query
- body
- headers when relevant
- provider responses
- AI structured output

Prefer Zod schemas.

Do not expose raw provider payloads.

## REST Style

Use resource-oriented REST plus explicit domain actions.

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

Do not force action-heavy domain behavior into artificial generic CRUD endpoints.

## Scene Generation Pipeline

Required conceptual order:

```text
load Session
→ collect Context
→ fetch trusted Candidates
→ deterministic filtering
→ AI Director decision
→ Scene generation
→ schema validation
→ deterministic final validation
→ transaction/persist
→ response
```

Never:

```text
client prompt
→ LLM
→ direct Scene response
```

The LLM is not the source of truth for reality.

## Integration Adapters

Each external provider should have an adapter.

Examples:

```text
PlacesProvider
WeatherProvider
AiDirector
StorageProvider
```

Adapters should:

- normalize provider output
- expose minimal domain-friendly types
- hide SDK details
- enforce timeout
- map errors
- support test doubles

Do not leak provider types across the application.

## Database

Primary DB:

```text
PostgreSQL
```

ORM:

```text
Drizzle
```

Core tables may include:

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

Use migrations for schema changes.

Prefer relational columns for important fields.

Use `jsonb` for genuinely flexible structures, not as a replacement for modeling.

## Transactions

Use transactions for invariants such as:

```text
complete current Scene
+ update Session
+ write Evidence
+ update Memory
```

or:

```text
mark previous Scene terminal
+ create next active Scene
+ update Session currentSceneId
```

Avoid partial state updates.

## Concurrency

Mobile requests may be retried or duplicated.

Protect important mutations from duplication.

Consider:

- idempotency keys
- unique constraints
- version/state checks
- transactions

Do not assume one request happens only once.

## Geospatial

Start simple.

For MVP:

- trusted latitude/longitude
- distance calculation
- provider travel estimate where needed

Add PostGIS only when query requirements justify it.

Do not introduce spatial infrastructure prematurely.

## Caching

Do not add Redis by default.

First prefer:

- provider cache headers
- process-level short-lived cache where safe
- PostgreSQL

Add Redis only for clear needs such as:

- distributed cache
- locks
- rate coordination
- queues

## Media

Do not store growing user media on the API server filesystem.

Prefer object storage when PHOTO/End Credits media is enabled.

Database should store metadata/reference, not large binaries.

## Configuration

Environment variables must be validated at startup.

Examples:

```text
DATABASE_URL
AI_API_KEY
PLACES_API_KEY
WEATHER_API_KEY
STORAGE_*
```

Never silently use insecure production defaults.

## Observability

Use structured logs.

Log useful identifiers:

```text
requestId
userId when safe
sessionId
sceneId
provider
errorCode
duration
```

Do not log:

```text
secrets
tokens
full precise-location history
private media
raw provider credentials
unnecessary personal data
```

## File Size

Prefer files <=100 lines when practical.

Split by responsibility.

Do not create meaningless wrappers only to satisfy the line limit.

## Scaling Principle

Start as a modular monolith.

Do not introduce microservices before operational or ownership boundaries require them.
