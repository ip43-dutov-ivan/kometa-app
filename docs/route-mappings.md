# Kometa Web Route Mappings

This document describes the web screens and routes required for the Kometa MVP. It is based on:

- `docs/tz.md`: product scope and MVP user journeys.
- `docs/api.md`: REST API contract.
- `packages/logic/src/api/client.ts`: shared TypeScript API client surface.
- `apps/web/AGENTS.md`: Next.js App Router and feature-module conventions.

The current web app only has the public landing route. The MVP web app should grow into a mobile-first authenticated product surface that supports the complete task lifecycle: account creation, profile setup, task creation, task discovery, responses, matching, chat, completion, feedback, and reports.

## Overall Vision

The web app should be organized around the real user workflow, not around raw API resources.

The primary authenticated experience should answer three questions quickly:

1. What help can I find right now?
2. What tasks or responses need my attention?
3. What active matched interactions am I currently coordinating?

The product model is symmetric: the same user can create tasks and respond to tasks. The UI should therefore avoid hard role separation such as permanent "customer" and "provider" modes. Instead, role-specific controls should appear in context:

- A task owner can edit an open task, review responses, accept a provider, start the task, complete it, leave feedback, or report an issue.
- A non-owner can respond to an open task, track submitted responses, chat after a match, complete the task, leave feedback, or report an issue.
- A matched participant can use chat and task lifecycle actions.
- A completed participant can leave feedback.
- Any authenticated user should be able to report unsafe or problematic behavior, ideally with the relevant user and task prefilled.

For MVP, report functionality should be included in the normal product flow. It should not feel like a separate support system. Users should be able to report from places where risk or conflict can occur: public user profiles, task details, candidate review, active matches, and chat.

## Route Groups

Use Next.js App Router route groups or nested layouts to separate public, authenticated, and admin surfaces:

```txt
apps/web/app/
  page.tsx
  login/page.tsx
  register/page.tsx
  app/
    layout.tsx
    page.tsx
    ...
  admin/
    layout.tsx
    ...
```

The `app/` route segment is the authenticated user product. The `admin/` route segment is optional for the MVP UI but is useful because `docs/api.md` includes manual report review and user moderation endpoints.

Route files should stay thin. They should compose route-level layout, metadata, and data loading, then delegate domain UI to feature modules under `apps/web/features/`.

## Public Routes

| Route       | Screen   | Purpose                                                           | API usage       |
| ----------- | -------- | ----------------------------------------------------------------- | --------------- |
| `/`         | Landing  | Public marketing and product entry point. Already implemented.    | None required   |
| `/login`    | Login    | Authenticate an existing user and store the access token/session. | `auth.login`    |
| `/register` | Register | Create an account with initial profile details.                   | `auth.register` |

## Authenticated Product Routes

| Route                                 | Screen              | Purpose                                                                                                           | API usage                                                                      |
| ------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `/app`                                | Dashboard           | Authenticated home with available tasks, own task status, active matches, and next actions.                       | `users.getMe`, `tasks.list`, `matches.list`, `conversations.list`              |
| `/app/profile`                        | My profile          | View and edit the current user's profile.                                                                         | `users.getMe`, `users.updateMe`                                                |
| `/app/users/[userId]`                 | Public user profile | View another user's profile, rating, completed task count, skills, interests, and feedback.                       | `users.getById`, `users.listFeedback`                                          |
| `/app/tasks`                          | Task discovery      | Browse open tasks not owned by the current user. Supports filters for category and location.                      | `tasks.list({ available: true })`                                              |
| `/app/tasks/new`                      | Create task         | Create a new help request with title, description, category, location, and credit reward.                         | `tasks.create`                                                                 |
| `/app/tasks/[taskId]`                 | Task detail         | Main task screen. Shows task details and context-specific actions for owner, non-owner, and matched participants. | `tasks.get`, `tasks.respond`, `tasks.start`, completion APIs                   |
| `/app/tasks/[taskId]/edit`            | Edit task           | Owner-only edit screen for open tasks.                                                                            | `tasks.get`, `tasks.update`                                                    |
| `/app/tasks/[taskId]/responses`       | Candidate review    | Owner reviews responses and accepts one provider.                                                                 | `tasks.listResponses`, `users.getById`, `tasks.acceptResponse`                 |
| `/app/my-tasks`                       | My created tasks    | List tasks created by the current user across statuses.                                                           | `tasks.list({ owner: "me" })`                                                  |
| `/app/my-responses`                   | My responses        | List responses submitted by the current user and their current status.                                            | `responses.listMine`                                                           |
| `/app/matches`                        | Matches             | List matched task interactions involving the current user.                                                        | `matches.list({ activeOnly: true })`                                           |
| `/app/conversations`                  | Conversation list   | List task-scoped conversations available after match.                                                             | `conversations.list`                                                           |
| `/app/conversations/[conversationId]` | Chat                | Post-match conversation for task coordination.                                                                    | `conversations.get`, `conversations.listMessages`, `conversations.sendMessage` |
| `/app/tasks/[taskId]/feedback`        | Feedback            | Leave feedback after task completion and view task feedback.                                                      | `tasks.leaveFeedback`, `tasks.listFeedback`                                    |
| `/app/reports/new`                    | Create report       | Report a user or task interaction. Supports prefilled `reportedUserId` and optional `taskId`.                     | `reports.create`                                                               |

## Admin Routes

The MVP brief excludes a full admin panel, but it does include basic manual support and reports. Because the API contract already includes admin endpoints, a minimal protected admin surface is recommended.

| Route                       | Screen          | Purpose                                                        | API usage                                               |
| --------------------------- | --------------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| `/admin/reports`            | Reports queue   | View submitted reports by status.                              | `admin.listReports`                                     |
| `/admin/reports/[reportId]` | Report detail   | Review a report, update its status, and add a resolution note. | `admin.updateReport`                                    |
| `/admin/users/[userId]`     | User moderation | Inspect a user and block or unblock them.                      | `users.getById`, `admin.blockUser`, `admin.unblockUser` |

Admin routing requires an authorization decision that is not currently modeled in `User`. The API has admin endpoints, but the shared `User` DTO does not expose a role. Before implementing the admin UI, either add an admin capability to the auth/session model or keep these screens behind a temporary environment/demo guard.

## Report Functionality

Reports are part of the MVP and should be implemented as a normal safety flow.

### User-Facing Report Entry Points

Add report actions in these screens:

- `/app/users/[userId]`: report this user.
- `/app/tasks/[taskId]`: report the task owner or matched participant depending on context.
- `/app/tasks/[taskId]/responses`: owner can report a responding provider if needed.
- `/app/matches`: report a matched participant from an active interaction.
- `/app/conversations/[conversationId]`: report from chat, with task and participant context prefilled.

These entry points should navigate to:

```txt
/app/reports/new?reportedUserId=<userId>&taskId=<taskId>
```

`taskId` should be optional because the API allows reports without task context. `reportedUserId` should be required for creating a report.

### Create Report Screen

`/app/reports/new` should:

- Load the reported user with `users.getById` when `reportedUserId` is present.
- Optionally load the task with `tasks.get` when `taskId` is present.
- Show a concise summary of who and what is being reported.
- Provide a required reason field.
- Submit with `reports.create`.
- Redirect back to the relevant task, conversation, or user profile after success.

The request body should match the shared DTO:

```ts
type CreateReportRequest = {
  reportedUserId: string;
  taskId?: string;
  reason: string;
};
```

### Admin Report Review

`/admin/reports` should support:

- Filtering by `open`, `reviewing`, `resolved`, and `dismissed`.
- Pagination via `limit` and `offset`.
- Quick access to reported user, reporter, and task context.

`/admin/reports/[reportId]` should support:

- Reviewing the report details.
- Updating status with `admin.updateReport`.
- Adding `resolutionNote`.
- Navigating to `/admin/users/[userId]` for moderation.

`/admin/users/[userId]` should support:

- Viewing public profile details.
- Blocking a user with a required reason using `admin.blockUser`.
- Unblocking a user using `admin.unblockUser`.

## Task Lifecycle Screens

The task detail screen is the most important product screen. It should adapt by status and user relationship.

### Open Task

Owner:

- View task details.
- Edit task.
- View responses.
- Accept one response.

Non-owner:

- View task details.
- View task owner profile.
- Submit a response.
- Report the task owner if needed.

### Matched Task

Participants:

- See matched participant summary.
- Open chat.
- Start task.
- Request completion.
- Report the matched participant if needed.

Owner:

- No longer edits task details.
- Can coordinate through chat.

Provider:

- Can coordinate through chat.

### In-Progress Task

Participants:

- Continue chat.
- Request completion.
- Report issue if needed.

### Completion Requested

Requester:

- See pending confirmation state.

Other participant:

- Confirm completion.
- Raise a concern.
- Report issue if needed.

### Completed Task

Participants:

- Leave feedback if not already submitted.
- View task feedback.
- Report issue if needed.

## Feature Module Plan

Add feature modules under `apps/web/features/`:

```txt
apps/web/features/
  auth/
  profile/
  tasks/
  responses/
  matches/
  conversations/
  feedback/
  reports/
  admin/
```

Recommended responsibilities:

- `auth`: login, registration, session persistence, auth redirects.
- `profile`: current-user profile editing and public profile display.
- `tasks`: task list, task detail, task creation, task editing, task lifecycle actions.
- `responses`: response submission, current user's responses, owner candidate review.
- `matches`: matched interaction list and match summaries.
- `conversations`: conversation list, chat messages, send-message form.
- `feedback`: post-completion feedback forms and feedback display.
- `reports`: user-facing report form and report entry-point helpers.
- `admin`: minimal report review and user moderation tools.

Shared generic UI primitives should live in `apps/web/shared/`. Business-specific components should stay inside their feature folder.

## Suggested Implementation Order

1. Add shared web API/session helpers around `createKometaApiClient`.
2. Implement auth routes: `/login`, `/register`.
3. Add authenticated layout at `/app/layout.tsx`.
4. Implement profile setup/editing.
5. Implement task discovery, create task, own tasks, and task detail.
6. Implement responding to tasks and tracking submitted responses.
7. Implement owner candidate review and response acceptance.
8. Implement matches and conversations.
9. Implement task lifecycle actions: start, request completion, confirm completion, raise concern.
10. Implement feedback after completion.
11. Implement user-facing reports and report entry points.
12. Implement minimal admin report review and moderation if admin capability is available.

## Open Decisions

- Auth storage strategy for the web app: cookie-backed session, local storage token, or server-side session wrapper.
- Admin authorization model: `User` currently has `accountStatus` but no role/capability field.
- Whether `/app/tasks/[taskId]/responses` should be a list view only or also include a tinder-like candidate review mode.
- Whether completion requests need a dedicated route or should stay as inline actions on task detail.
- How aggressively chat should poll or refresh during MVP.
