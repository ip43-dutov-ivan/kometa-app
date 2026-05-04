# Web App Instructions

This app uses Next.js App Router, React, shadcn/ui, Tailwind, and shared TypeScript logic from `packages/logic`.

## Preferred Structure

Organize new frontend work by feature/domain instead of adding everything to a large global components folder.

```txt
apps/web/
├── app/                    # Routing, layouts, metadata, and route-level composition
├── features/               # Business domains and user workflows
│   └── feature-name/
│       ├── api/            # Web-specific server actions, route fetch wrappers, mutations
│       ├── components/     # UI components used only by this feature
│       ├── hooks/          # Feature-specific React hooks
│       ├── store/          # Web-only feature state
│       ├── types/          # Feature-specific web types
│       └── index.ts        # Public API for the feature
└── shared/                 # Generic web-only building blocks
    ├── components/         # Reusable web UI and shadcn/ui components
    │   └── ui/             # shadcn/ui primitives
    ├── hooks/              # Generic web hooks
    ├── lib/                # Generic web utilities
    └── types/              # Generic web-only types
```

The current app may still contain legacy folders such as `components/`, `hooks/`, and `lib/`. For small edits, follow the existing local pattern. For new substantial work, use `features/` and `shared/`. Migrate only the files needed for the task.

## Feature Module Rules

- A feature folder should behave like a small module with its own UI, hooks, API helpers, local state, and types.
- Export the feature's public surface from `features/<feature>/index.ts`.
- Outside a feature, import from that feature's `index.ts` rather than private paths.
- Do not reach into another feature's `components/`, `hooks/`, `store/`, or `api/` folders.
- If two features need the same web-only code, move it to `apps/web/shared/`.
- If web and mobile both need the same business logic, move it to `packages/logic`.

## App Router Rules

- Keep `app/` route files thin. They should compose layouts, handle route metadata, load route-level data, and delegate business UI to feature modules.
- Prefer Server Components by default.
- Use `"use client"` only for interactivity, browser APIs, event handlers, client hooks, Zustand hooks, or effects.
- Do not consume Zustand stores directly in Server Components.
- Keep server actions and route-specific data loading close to the feature that owns the workflow unless the logic is shared across platforms.

## shadcn/ui Rules

- Treat shadcn/ui primitives as generic shared web UI.
- Put shadcn primitives in `apps/web/shared/components/ui/` for new structure, unless the existing `components/ui/` path is still being used by the nearby code.
- Do not put feature-specific business behavior into shadcn primitive components.
- Compose shadcn primitives inside feature components before creating new generic shared components.
- Keep design primitives reusable, small, and free of domain-specific data fetching.

## Zustand Rules

- Cross-platform stores belong in `packages/logic`.
- Web-only UI stores may live in `apps/web/features/<feature>/store/`.
- Use selectors when consuming Zustand state from React components.
- Keep server data and client UI state separate. Do not mirror backend data into Zustand unless there is a clear interaction need.

## Import Direction

- `app/` may import from `features/`, `shared/`, and `packages/logic`.
- `features/` may import from `shared/` and `packages/logic`.
- `shared/` may import from `packages/logic` only when the code stays web-safe and generic.
- `packages/logic` must never import from `apps/web`.
