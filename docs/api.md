# Kometa REST API Contract

This document describes the desired MVP REST API contract for Kometa. It should guide the Django backend, shared TypeScript DTOs in `packages/logic`, and the MSW mock backend in `packages/mocks`.

The contract follows the current product model from `docs/concept.md`, `docs/tz.md`, and `docs/user-stories.md`: one symmetric user account can create tasks, respond to tasks, match with another user, chat after a match, complete the task, leave feedback, and report unsafe behavior.

## Contract Principles

- Base path: `/api/v1`.
- Request and response bodies use JSON.
- Field names use camelCase to match the current TypeScript mocks and future frontend/mobile clients.
- Protected endpoints require `Authorization: Bearer <accessToken>`.
- List endpoints return `{ "items": [...], "pageInfo": {...} }`.
- Resource timestamps use ISO 8601 strings.
- MVP supports money compensation as task metadata only. Payment processing is out of scope for MVP; users coordinate payment outside the platform.
- Credit compensation may remain in shared types as a reserved future value, but should not be exposed as an active MVP flow.
- MVP chat uses authenticated task-scoped messages. P2P encryption is out of scope for MVP and may be revisited after the main task flow is proven.

## Common Shapes

### Error

```json
{
  "code": "task_not_found",
  "message": "Task not found",
  "details": {}
}
```

`details` is optional and should be used for field-level validation errors.

### PageInfo

```json
{
  "limit": 20,
  "offset": 0,
  "total": 42,
  "hasMore": true
}
```

## Core Resources

### User

```ts
type User = {
  id: string;
  name: string;
  location: string;
  bio: string;
  skills: string[];
  interests: string[];
  rating: number;
  completedTasks: number;
  accountStatus: "active" | "blocked";
  avatarUrl?: string;
};
```

### Task

```ts
type TaskStatus =
  | "open"
  | "matched"
  | "inProgress"
  | "completionRequested"
  | "completed"
  | "cancelled";

type Compensation = {
  type: "money";
  amount: number;
  currency: "UAH";
};

type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  compensation: Compensation;
  status: TaskStatus;
  ownerId: string;
  selectedResponseId?: string;
  createdAt: string;
  updatedAt: string;
};
```

### TaskResponse

```ts
type ResponseStatus = "pending" | "accepted" | "declined" | "withdrawn";

type TaskResponse = {
  id: string;
  taskId: string;
  providerId: string;
  comment: string;
  status: ResponseStatus;
  createdAt: string;
};
```

### CompletionRequest

```ts
type CompletionRequestStatus = "pending" | "confirmed" | "concernRaised";

type CompletionRequest = {
  id: string;
  taskId: string;
  requestedByUserId: string;
  confirmedByUserId?: string;
  status: CompletionRequestStatus;
  note?: string;
  concernReason?: string;
  createdAt: string;
  updatedAt: string;
};
```

### Match

```ts
type Match = {
  id: string;
  taskId: string;
  responseId: string;
  ownerId: string;
  providerId: string;
  conversationId: string;
  createdAt: string;
};
```

### Conversation And Message

```ts
type Conversation = {
  id: string;
  taskId: string;
  participantIds: string[];
  lastMessageAt: string;
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};
```

### Feedback

```ts
type Feedback = {
  id: string;
  taskId: string;
  authorId: string;
  receiverId: string;
  rating: number;
  comment: string;
  createdAt: string;
};
```

### Report

```ts
type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

type Report = {
  id: string;
  reporterId: string;
  reportedUserId: string;
  taskId?: string;
  reason: string;
  status: ReportStatus;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
};
```

## Endpoints

### Auth

#### Register

`POST /api/v1/auth/register`

Request:

```json
{
  "email": "user@example.com",
  "password": "strong-password",
  "name": "Maksym Kovalenko",
  "location": "Kyiv",
  "bio": "Student building a reliable local network."
}
```

Response `201`:

```json
{
  "accessToken": "token",
  "user": {}
}
```

#### Login

`POST /api/v1/auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "strong-password"
}
```

Response `200`:

```json
{
  "accessToken": "token",
  "user": {}
}
```

#### Logout

`POST /api/v1/auth/logout`

Response `204`.

### Users

#### Get Current User

`GET /api/v1/users/me`

Returns the current authenticated user.

#### Update Current User

`PATCH /api/v1/users/me`

Request:

```json
{
  "name": "Maksym Kovalenko",
  "location": "Kyiv",
  "bio": "Short public profile text.",
  "skills": ["English tutoring", "Laptop setup"],
  "interests": ["education", "technology"],
  "avatarUrl": "/uploads/avatar.jpg"
}
```

Returns the updated user.

#### Get Public User

`GET /api/v1/users/{userId}`

Returns a public user profile.

#### Get User Feedback

`GET /api/v1/users/{userId}/feedback?limit=20&offset=0`

Returns feedback received by the user.

### Tasks

#### List Tasks

`GET /api/v1/tasks`

Supported query parameters:

- `status`: filter by task status.
- `category`: filter by category.
- `location`: filter by location text.
- `owner=me`: tasks created by the current user.
- `involved=me`: tasks where the current user is owner or matched provider.
- `available=true`: open tasks not owned by the current user.
- `limit`, `offset`: pagination.

Response `200`:

```json
{
  "items": [],
  "pageInfo": {
    "limit": 20,
    "offset": 0,
    "total": 0,
    "hasMore": false
  }
}
```

#### Create Task

`POST /api/v1/tasks`

Request:

```json
{
  "title": "Help set up a Wi-Fi router",
  "description": "Need help configuring a new router.",
  "category": "Home tech",
  "location": "Kyiv, Podil",
  "compensation": {
    "type": "money",
    "amount": 350,
    "currency": "UAH"
  }
}
```

Response `201`: created task with `status: "open"`.

#### Get Task

`GET /api/v1/tasks/{taskId}`

Returns task details.

#### Update Task

`PATCH /api/v1/tasks/{taskId}`

Owner-only. Allowed only while the task is `open`.

Request may include:

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "category": "Education",
  "location": "Remote",
  "compensation": {
    "type": "money",
    "amount": 250,
    "currency": "UAH"
  }
}
```

This endpoint must not accept arbitrary `status`, `ownerId`, or `selectedResponseId` updates.

#### Start Task

`POST /api/v1/tasks/{taskId}/start`

Allowed for the task owner or accepted provider after a match. Moves `matched` to `inProgress`.

#### Request Completion

`POST /api/v1/tasks/{taskId}/completion-requests`

Allowed for either matched participant.

Request:

```json
{
  "note": "The task is done from my side."
}
```

Moves `matched` or `inProgress` to `completionRequested`.

Response `201`:

```json
{
  "completionRequest": {
    "id": "completion-request-1",
    "taskId": "task-1",
    "requestedByUserId": "user-2",
    "status": "pending",
    "note": "The task is done from my side.",
    "createdAt": "2026-05-05T12:00:00.000Z",
    "updatedAt": "2026-05-05T12:00:00.000Z"
  },
  "task": {
    "id": "task-1",
    "status": "completionRequested"
  }
}
```

#### Confirm Completion

`POST /api/v1/tasks/{taskId}/completion-requests/{requestId}/confirm`

Allowed for the other matched participant. Moves the task to `completed`.

Response `200`:

```json
{
  "completionRequest": {
    "id": "completion-request-1",
    "taskId": "task-1",
    "requestedByUserId": "user-2",
    "confirmedByUserId": "user-1",
    "status": "confirmed",
    "note": "The task is done from my side.",
    "createdAt": "2026-05-05T12:00:00.000Z",
    "updatedAt": "2026-05-05T12:10:00.000Z"
  },
  "task": {
    "id": "task-1",
    "status": "completed"
  }
}
```

#### Raise Completion Concern

`POST /api/v1/tasks/{taskId}/completion-requests/{requestId}/concerns`

Allowed for the other matched participant.

Request:

```json
{
  "reason": "The task is not fully complete yet."
}
```

For MVP, this may return the task to `inProgress` and leave manual follow-up to reports/support.

Response `200`:

```json
{
  "completionRequest": {
    "id": "completion-request-1",
    "taskId": "task-1",
    "requestedByUserId": "user-2",
    "status": "concernRaised",
    "note": "The task is done from my side.",
    "concernReason": "The task is not fully complete yet.",
    "createdAt": "2026-05-05T12:00:00.000Z",
    "updatedAt": "2026-05-05T12:10:00.000Z"
  },
  "task": {
    "id": "task-1",
    "status": "inProgress"
  }
}
```

### Responses And Matching

#### List Responses For Task

`GET /api/v1/tasks/{taskId}/responses?status=pending&limit=20&offset=0`

Owner-only. Returns responses submitted to the task. Include enough provider summary data for candidate review, either embedded in each item or through client-side user lookup.

#### Respond To Task

`POST /api/v1/tasks/{taskId}/responses`

Allowed only for non-owners while the task is `open`.

Request:

```json
{
  "comment": "I can help with this task today."
}
```

Response `201`: created response with `status: "pending"`.

#### List My Responses

`GET /api/v1/me/responses?status=pending&limit=20&offset=0`

Returns responses submitted by the current user.

#### Accept Response

`POST /api/v1/tasks/{taskId}/responses/{responseId}/accept`

Owner-only. Accepts one response, declines other pending responses for the same task, creates a match, creates a conversation, and moves the task to `matched`.

Response `201`: created match.

This replaces the current mock path `POST /responses/{responseId}/select`, because acceptance is task-scoped owner behavior.

### Matches

#### List Matches

`GET /api/v1/matches?activeOnly=true&limit=20&offset=0`

Returns matches involving the current user.

### Chat

Chat is only available after a match. MVP does not support free-form direct messages outside task context.

MVP chat messages are stored as plain authenticated API messages scoped to the matched task conversation. P2P chat encryption is not part of the MVP contract.

#### List Conversations

`GET /api/v1/conversations?limit=20&offset=0`

Returns conversations involving the current user.

#### Get Conversation

`GET /api/v1/conversations/{conversationId}`

Returns conversation metadata if the current user is a participant.

#### List Messages

`GET /api/v1/conversations/{conversationId}/messages?before=2026-05-02T16:20:00.000Z&limit=50`

Returns messages if the current user is a participant.

#### Send Message

`POST /api/v1/conversations/{conversationId}/messages`

Request:

```json
{
  "body": "Send me the slides and I will leave comments by evening."
}
```

Response `201`: created message.

### Feedback

#### Leave Feedback

`POST /api/v1/tasks/{taskId}/feedback`

Allowed only after a matched task is completed. The receiver is inferred as the other participant. Each participant can leave one feedback item per task.

Request:

```json
{
  "rating": 5,
  "comment": "Clear communication and careful work."
}
```

Response `201`: created feedback.

#### Get Task Feedback

`GET /api/v1/tasks/{taskId}/feedback`

Returns feedback for a completed task.

### Reports

#### Create Report

`POST /api/v1/reports`

Request:

```json
{
  "reportedUserId": "user-2",
  "taskId": "task-1",
  "reason": "Unsafe behavior during task coordination."
}
```

Response `201`: created report with `status: "open"`.

#### List Reports

`GET /api/v1/admin/reports?status=open&limit=20&offset=0`

Admin-only. Returns reports for manual support handling.

#### Update Report

`PATCH /api/v1/admin/reports/{reportId}`

Admin-only.

Request:

```json
{
  "status": "resolved",
  "resolutionNote": "Handled manually."
}
```

Returns the updated report.

### Admin User Moderation

#### Block User

`POST /api/v1/admin/users/{userId}/block`

Admin-only. Blocks a user from authenticated product actions. A blocked user must not be allowed to create tasks, respond to tasks, accept responses, send chat messages, request completion, leave feedback, or create reports.

Request:

```json
{
  "reason": "Repeated unsafe behavior during task coordination."
}
```

Response `200`:

```json
{
  "id": "user-2",
  "accountStatus": "blocked",
  "blockedReason": "Repeated unsafe behavior during task coordination.",
  "blockedAt": "2026-05-05T12:30:00.000Z"
}
```

#### Unblock User

`POST /api/v1/admin/users/{userId}/unblock`

Admin-only. Restores the user to normal authenticated access.

Response `200`:

```json
{
  "id": "user-2",
  "accountStatus": "active"
}
```

## Recommended Mock Alignment

The current `packages/mocks` implementation already models the main entities well. To align it with this contract, update it as follows when the mocks are next touched:

- Change the base path from `*/api` to `*/api/v1`.
- Rename `token` in auth responses to `accessToken`.
- Wrap list responses in `{ items, pageInfo }`.
- Add `updatedAt` to mutable resources.
- Add `accountStatus` to users and enforce blocked-user access restrictions in protected handlers.
- Rename task status `in_progress` to `inProgress` and `completion_requested` to `completionRequested`.
- Replace `POST /responses/:responseId/select` with `POST /tasks/:taskId/responses/:responseId/accept`.
- Restrict `PATCH /tasks/:taskId` to editable task fields only.
- Add task lifecycle handlers for start, completion request, completion confirmation, and completion concern.
- Store completion requests as first-class mock records so confirmation and concerns can reference `requestId`.
- Add admin block/unblock handlers.
- Move DTO types from `packages/mocks/src/types.ts` to `packages/logic` and import them into mocks.

## Acceptance Scenarios

- A user registers, updates a profile, creates a task, and sees it in their created tasks list.
- Another user sees the task through `available=true`, responds, and tracks the response through `/me/responses`.
- The owner reviews responses, accepts one, and the API creates a match plus a conversation.
- Only matched participants can read and send chat messages.
- Either participant can request completion; the other participant confirms it.
- Completed matched tasks allow feedback from each participant.
- A user can report another user or a task interaction; an admin can resolve the report.
- An admin can block a problematic user, and blocked users are prevented from authenticated product actions.
