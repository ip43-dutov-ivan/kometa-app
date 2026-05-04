# Mock Backend Instructions

This package is the shared fake backend for frontend-first development.

## Purpose

- Define MSW request handlers used by web, mobile, tests, and demos.
- Keep mock API behavior aligned with the contract in `packages/logic`.
- Model backend behavior closely enough for frontend workflows without implementing Django.

## Boundaries

- Do not import from `apps/web` or `apps/mobile`.
- Do not put React, React Native, Next.js, Expo, or UI code here.
- Do not duplicate frontend view logic here.
- Mock data may be in-memory and deterministic.
- API shapes should match the intended Django API contract.

## Organization

- `src/data/`: seed data and in-memory collections.
- `src/handlers/`: MSW handlers grouped by domain.
- `src/scenarios/`: optional alternate handler sets for empty, error, or slow states.
- `src/types.ts`: temporary API DTO types until they move to `packages/logic`.

## Handler Rules

- Keep default handlers as happy-path behavior.
- Use scenario handlers for errors, empty states, and latency.
- Group handlers by domain and compose them in `src/handlers/index.ts`.
- Prefer realistic status codes and response bodies.
