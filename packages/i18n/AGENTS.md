# I18n Package Instructions

This package owns shared locale metadata and Lingui message catalogs that can be consumed by web and mobile.

- Keep framework-specific providers and routing in the consuming app.
- Do not import from `apps/web` or `apps/mobile`.
- Store product copy as Lingui message catalogs here when the copy is shared across platforms.
- Keep app-specific translation wrappers in the relevant app.
