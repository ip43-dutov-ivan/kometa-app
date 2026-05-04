Then the best order is: **contract → shared logic → mocks → web app → mobile UI**. Treat `packages/mocks` as the backend and avoid building Django until the product flow is proven.

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

3. **Align `packages/mocks` to the contract**
   - `/api/v1` paths.
   - List envelopes: `{ items, pageInfo }`.
   - Auth/session behavior.
   - Task lifecycle.
   - Responses/matching.
   - Chat.
   - Feedback/reports.
   - Empty/error scenarios.

4. **Build web app against mocks**
   - Auth/profile.
   - Task creation/browsing/details.
   - Responses and matching.
   - Chat.
   - Completion.
   - Feedback/reports.

5. **Add workflow tests**
   - Prefer tests around the mock-backed API client and key web UI flows.
   - Main scenario: register/login → create task → respond → accept → chat → complete → feedback.

6. **Add mobile UI at the end of MVP**
   - Do this after the web MVP flow is implemented and proven.
   - Reuse `packages/logic`.
   - Keep UI native.
   - Build against the same mocks and contract.
   - Match the finalized core MVP flow, not necessarily pixel parity with web.

For parallel agents, I’d split like this:

**Wave 1**

- Agent A: `docs/api.md` refinement + DTO decisions.
- Agent B: `packages/logic` DTOs and API client skeleton.
- Agent C: inspect `packages/mocks` re mock alignment plan.
- Agent D: inspect web structure and identify screens/routes needed.

**Wave 2**

- Agent B: finish shared API client and validation.
- Agent C: implement mocks fully against `/api/v1`.
- Agent D: build web auth/profile/tasks against mocks.

**Wave 3**

- Agent C: add richer mock behavior for responses, matches, chat, completion, feedback, reports.
- Agent D: build web responses/matching/chat/completion.

**Wave 4**

- Agent D: web polish, empty/error/loading states.
- Agent B/C: shared test fixtures, mock scenarios, API consistency checks.

**Final MVP mobile wave**

- Agent E: inspect mobile structure and identify screens/navigation needed.
- Agent E: build mobile auth/profile/tasks against the same mocks.
- Agent E: build mobile responses/matching/chat/completion.
- Agent E: mobile polish, empty/error/loading states.

The important constraint: `packages/mocks` becomes the behavioral backend, but `packages/logic` should still own the contract types and client. That keeps web and mobile from coupling directly to mock internals when the mobile UI is added at the end of MVP.
