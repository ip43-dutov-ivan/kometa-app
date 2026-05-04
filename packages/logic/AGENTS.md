# Shared Logic Instructions

This package contains platform-neutral TypeScript shared by web and mobile.

## Allowed

- DTO types and API contract types.
- API clients and fetchers.
- Cross-platform Zustand stores.
- Validation schemas.
- Business/domain logic.
- Pure utilities.

## Forbidden

- Next.js imports.
- React DOM imports.
- React Native imports.
- Expo imports.
- Django/Python code.
- Browser-only APIs unless they are guarded and isolated behind a platform-neutral interface.
- UI components.

## Zustand

- Put stores here only when they are shared across web and mobile or represent true domain state.
- Use slices for larger stores.
- Apply middleware at the combined store level.
- Export stable selectors and actions for app consumers.
- Keep server data and client UI state separate unless there is a clear interaction need.

## API Clients and Types

- Keep client types aligned with the Django API.
- Prefer explicit DTOs over loose `any` shapes.
- Keep fetchers platform-neutral so they can be used by both Next.js and React Native.
- Do not depend on app-specific routing, storage, navigation, or rendering concerns.
