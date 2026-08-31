# QUALITY.md — DIRECTOR Backend

## Quality Priorities

Order of importance:

1. safety
2. real-world correctness
3. state consistency
4. security/privacy
5. API correctness
6. maintainability
7. performance

Creative Scene quality never overrides safety or factual validity.

## Type Safety

Use TypeScript strict mode.

Avoid:

- `any`
- broad type assertions
- duplicated DTO/domain shapes
- unchecked JSON parsing

Validate external data at boundaries.

## Validation

Validate:

- mobile requests
- URL params
- query params
- provider responses where needed
- AI structured output
- environment variables

A parsed AI response is still untrusted until deterministic constraints pass.

## Testing Priorities

Highest-value tests:

```text
Constraint Engine
Session transitions
Scene lifecycle
complete/skip/veto
Evidence verification
Memory updates
transaction behavior
API validation
provider failures
```

Prefer deterministic unit tests for domain rules.

Use integration tests for:

- Fastify routes
- database repositories
- transaction boundaries

Mock external providers at adapter boundaries.

## Constraint Tests

Test hard constraints explicitly.

Examples:

- closed place rejected
- excessive distance rejected
- budget violation rejected
- expired Session rejected
- weather-blocked outdoor Scene rejected
- vetoed category rejected
- recently visited place deprioritized/rejected as designed
- inaccessible place rejected when accessibility requirement applies

## State Transition Tests

Test invalid transitions.

Examples:

```text
COMPLETED Scene → complete again = reject
SKIPPED Scene → complete = reject
COMPLETED Session → next Scene = reject
ACTIVE Scene exists → duplicate active Scene = prevent
```

## Provider Failure Tests

External services will fail.

Test:

- timeout
- rate limit
- malformed response
- empty candidates
- provider unavailable
- partial provider data

Provider failure should produce explicit application behavior.

It must not leave corrupted Session state.

## AI Failure Tests

Test:

- invalid JSON
- schema mismatch
- candidate not in allowed set
- invented place ID
- unsafe output
- constraint violation
- timeout

Invalid AI output must never become an active Scene.

## Error Policy

Application errors should distinguish:

```text
VALIDATION
AUTHENTICATION
AUTHORIZATION
NOT_FOUND
CONFLICT
CONSTRAINT_FAILED
PROVIDER_FAILED
INTERNAL
```

Client responses should be stable and non-sensitive.

Do not return stack traces or raw provider errors.

## Security

Never commit:

- API keys
- DB credentials
- auth secrets
- private certificates

Use `.env` only locally.

Production secrets should be injected by deployment environment.

Treat as untrusted:

```text
client input
AI output
provider output
uploaded metadata
```

## Authentication

Server-owned resources must be scoped to the authenticated user where applicable.

Never trust a client-supplied `userId` as authorization by itself.

## Privacy

DIRECTOR uses sensitive real-world context.

Minimize:

- precise location retention
- background location
- unnecessary raw photos
- unnecessary AI-provider payloads

Prefer:

- temporary precise location
- summarized/derived long-term location data
- explicit media retention controls
- Memory deletion/edit capabilities

## Logging

Do not log:

```text
access tokens
passwords
API keys
full request auth headers
precise location history
private photo contents
unnecessary free-text user data
```

Use IDs and error codes instead.

## Performance

Avoid premature optimization.

Still prevent obvious issues:

- N+1 queries
- repeated provider calls in one request
- unlimited result sets
- missing database indexes for hot lookups
- long external calls without timeout
- large raw payloads

## Database Review

For schema changes check:

- migration exists
- nullable/default behavior is intentional
- FK behavior is intentional
- indexes match expected lookups
- unique constraints protect invariants
- old data remains compatible

Never delete migrations just to make local state work.

## API Review

For API changes check:

- request schema
- response schema
- status codes
- error codes
- retry behavior
- authorization
- backward compatibility if needed

## Native/Mobile Considerations

The backend must assume:

- network loss
- request retries
- duplicate mutation calls
- app suspension
- stale client state
- delayed photo upload
- permission denial

Design mutation APIs accordingly.

## Done Checklist

Before finishing a change, check relevant items:

- TypeScript passes
- focused tests pass
- route schemas validate
- error paths handled
- transaction boundaries correct
- provider timeout/failure handled
- AI output validated
- final constraints validated
- no sensitive logs
- no secret exposure
- no accidental precise-location retention
- migrations included when needed
- no unrelated refactor

## Command Policy

Run the narrowest useful checks first.

Prefer existing `package.json` scripts.

Do not run destructive commands without explicit permission.

Never automatically:

```text
DROP DATABASE
DROP TABLE
TRUNCATE
db reset
delete migrations
delete Docker volumes
rm -rf project/user data
```
