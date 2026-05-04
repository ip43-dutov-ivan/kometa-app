# Backend Instructions

This app is a Django Python API.

## Boundaries

- Backend behavior, persistence, authentication, authorization, and API implementation belong here.
- Do not place frontend or mobile UI logic in the backend.
- API contracts consumed by web or mobile must be reflected in `packages/logic`.

## API Workflow

- Keep models, serializers/schemas, views, URLs, and tests aligned.
- When an API response or request shape changes, update shared DTOs/API clients in `packages/logic`.
- Prefer targeted tests for the changed Django app or endpoint.
- Keep environment examples such as `.env.example` current when configuration changes.

## Data Ownership

- Django owns persistence and backend validation.
- Frontend clients should not rely on undocumented response fields.
- Avoid breaking API changes unless the affected consumers are updated in the same change.
