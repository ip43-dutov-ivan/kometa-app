Then the best order is: **contract → shared logic → UI workflow mocks → web app → backend → mobile UI**.

Do not treat `packages/mocks` as the real backend. Treat it as a deterministic UI workflow simulator: a way to exercise every important screen, state, permission branch, empty state, error state, and interaction before the Django API is fully implemented.

The mocks should be rich enough for product and frontend validation, but they should not become the source of truth for persistence, authentication, authorization, moderation, or production backend behavior. `docs/api.md` remains the contract, `packages/logic` owns shared DTOs/client code, and `apps/backend` is the real API implementation target.

Recommended sequence:

1. **Finalize API contract in `docs/api.md`**
   - Keep it as the source of truth.
   - No backend implementation needed.
   - Contract should describe the intended fake backend behavior clearly enough for web/mobile to consume.

2. **Move DTOs and API client into `packages/logic`**
   - Shared DTOs.
   - Shared fetch/client functions.
   - Shared validation schemas if needed.
   - Web and mobile should not import mock types directly.

3. **Build `packages/mocks` as a UI workflow simulator**
   - `/api/v1` paths.
   - List envelopes: `{ items, pageInfo }`.
   - Auth/session demo behavior.
   - Task lifecycle.
   - Responses/matching.
   - Chat.
   - Feedback/reports.
   - Empty/error/blocked/conflict scenarios.
   - Seed states for every MVP screen: open tasks, own tasks, pending responses, accepted matches, active chat, completion requested, completed tasks, feedback, reports, and admin review.
   - Keep behavior deterministic and easy to reset for frontend demos/tests.

4. **Build web app against the UI workflow mocks**
   - Auth/profile.
   - Task creation/browsing/details.
   - Responses and matching.
   - Chat.
   - Completion.
   - Feedback/reports.

5. **Implement the Django backend against the same contract**
   - Models, serializers, permissions, and `/api/v1` endpoints.
   - Real auth/session behavior.
   - Persistence-backed task lifecycle.
   - Report moderation and blocked-user enforcement.
   - Keep API responses aligned with `packages/logic` DTOs and the frontend expectations proven with mocks.

6. **Add workflow tests**
   - Prefer tests around the mock-backed API client and key web UI flows.
   - Main scenario: register/login → create task → respond → accept → chat → complete → feedback.
   - Add backend API tests for the same lifecycle once Django endpoints exist.

7. **Add mobile UI at the end of MVP**
   - Do this after the web MVP flow is implemented and proven.
   - Reuse `packages/logic`.
   - Keep UI native.
   - Build against the same contract.
   - Use mocks for fast UI state coverage and Django for integration confidence.
   - Match the finalized core MVP flow, not necessarily pixel parity with web.

For parallel agents, I’d split like this:

**Wave 1**

- Agent A: `docs/api.md` refinement + DTO decisions.
- Agent B: `packages/logic` DTOs and API client skeleton.
- Agent C: inspect `packages/mocks` re UI workflow simulation plan.
- Agent D: inspect web structure and identify screens/routes needed.

**Wave 2**

- Agent B: finish shared API client and validation.
- Agent C: implement UI workflow mocks fully against `/api/v1`.
- Agent D: build web auth/profile/tasks against mocks.

**Wave 3**

- Agent C: add richer mock behavior for responses, matches, chat, completion, feedback, reports.
- Agent D: build web responses/matching/chat/completion.

**Wave 4**

- Agent D: web polish, empty/error/loading states.
- Agent B/C: shared test fixtures, mock scenarios, API consistency checks.
- Agent F: implement Django backend endpoints against `docs/api.md` and `packages/logic`.

**Final MVP mobile wave**

- Agent E: inspect mobile structure and identify screens/navigation needed.
- Agent E: build mobile auth/profile/tasks against the same contract.
- Agent E: build mobile responses/matching/chat/completion.
- Agent E: mobile polish, empty/error/loading states.

The important constraint: `packages/mocks` should simulate product workflows, not become the behavioral backend. `packages/logic` should own the contract types and client, while `apps/backend` should own real backend behavior. That keeps web and mobile from coupling directly to mock internals and lets mocks stay focused on fast UI coverage.
