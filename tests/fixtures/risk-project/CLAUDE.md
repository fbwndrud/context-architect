# Project

## Architecture
The application follows a modular monolith pattern with bounded contexts.
Each module has its own service layer and repository.

## Conventions
See [conventions](docs/conventions.md) for naming rules.

## API
All endpoints must return JSON. Error responses use the standard format:
status, message, and optional details field.

Authentication uses JWT tokens with RS256 signing.
Tokens expire after 1 hour. Refresh tokens last 7 days.

## Build
Run `pnpm build` for production.
Run `pnpm dev` for development with hot reload.

## Testing
Always use Vitest for unit tests.
Integration tests go in `tests/integration/`.
