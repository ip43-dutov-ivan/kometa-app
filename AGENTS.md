# Repository Instructions

This is a polyglot monorepo.

- `apps/web/`: Next.js App Router frontend.
- `apps/mobile/`: Expo React Native app.
- `apps/backend/`: Django Python API.
- `packages/logic/`: Shared TypeScript logic, API clients, DTOs, validation helpers, and cross-platform Zustand stores.
- `packages/mocks/`: Shared MSW fake backend for frontend-first development, demos, and tests.

## Global Boundaries

- Do not mix mobile and web UI components.
- Do not import from `apps/web` into `apps/mobile`, or from `apps/mobile` into `apps/web`.
- Do not import app-specific code into `packages/logic`.
- Put cross-platform business logic in `packages/logic`.
- Put mock backend behavior and fake API fixtures in `packages/mocks`.
- Put web-only UI and browser behavior in `apps/web`.
- Put mobile-only UI and native behavior in `apps/mobile`.
- Put backend behavior, persistence, and API implementation in `apps/backend`.

## Instruction Scope

Use the closest `AGENTS.md` file for detailed rules:

- `apps/web/AGENTS.md`: Next.js, shadcn/ui, feature modules, and web state.
- `apps/mobile/AGENTS.md`: Expo and React Native app rules.
- `apps/backend/AGENTS.md`: Django API rules.
- `packages/logic/AGENTS.md`: shared TypeScript logic, API clients, DTOs, and cross-platform stores.
- `packages/mocks/AGENTS.md`: shared MSW handlers, fixtures, and mock scenarios.

## Cross-Cutting Workflow

- Inspect nearby files before editing and follow existing project patterns.
- Keep changes scoped to the requested behavior.
- When an API contract changes, update the Django backend, `packages/logic`, and affected app consumers together.
- During frontend-first development, keep `packages/mocks` aligned with the intended API contract.
- Run the narrowest relevant checks after changes.
