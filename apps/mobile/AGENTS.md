# Mobile App Instructions

This app uses Expo and React Native.

## Boundaries

- Do not import web UI components, Next.js modules, React DOM code, or browser-only utilities.
- Mobile UI belongs in `apps/mobile`.
- Business logic shared with web belongs in `packages/logic`.
- Mobile-only native integrations, navigation behavior, and platform-specific UI stay in `apps/mobile`.

## Organization

- Prefer feature/domain folders for substantial new mobile work.
- Keep reusable mobile-only components in a mobile shared area when the app structure exists.
- Do not duplicate shared API clients or DTOs locally if they can live in `packages/logic`.

## State and Data

- Use cross-platform stores from `packages/logic` when state is shared with web.
- Keep mobile-only UI state local to the mobile app.
- Keep server data and UI state separate unless local interaction requires a client-side store.
