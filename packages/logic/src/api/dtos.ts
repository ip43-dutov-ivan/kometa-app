export type UserId = string;
export type TaskId = string;
export type ResponseId = string;
export type CompletionRequestId = string;
export type MatchId = string;
export type ConversationId = string;
export type MessageId = string;
export type FeedbackId = string;
export type ReportId = string;

export interface ApiErrorDto {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PageInfo {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export interface ListResponse<TItem> {
  items: TItem[];
  pageInfo: PageInfo;
}

export type AccountStatus = "active" | "blocked";

export interface User {
  id: UserId;
  name: string;
  location: string;
  bio: string;
  skills: string[];
  interests: string[];
  rating: number;
  completedTasks: number;
  accountStatus: AccountStatus;
  avatarUrl?: string;
}

export type TaskStatus =
  | "open"
  | "matched"
  | "inProgress"
  | "completionRequested"
  | "completed"
  | "cancelled";

export interface MoneyCompensation {
  type: "money";
  amount: number;
  currency: "UAH";
}

export type Compensation = MoneyCompensation;

export interface Task {
  id: TaskId;
  title: string;
  description: string;
  category: string;
  location: string;
  compensation: Compensation;
  status: TaskStatus;
  ownerId: UserId;
  selectedResponseId?: ResponseId;
  createdAt: string;
  updatedAt: string;
}

export type ResponseStatus = "pending" | "accepted" | "declined" | "withdrawn";

export interface TaskResponse {
  id: ResponseId;
  taskId: TaskId;
  providerId: UserId;
  comment: string;
  status: ResponseStatus;
  createdAt: string;
}

export type CompletionRequestStatus = "pending" | "confirmed" | "concernRaised";

export interface CompletionRequest {
  id: CompletionRequestId;
  taskId: TaskId;
  requestedByUserId: UserId;
  confirmedByUserId?: UserId;
  status: CompletionRequestStatus;
  note?: string;
  concernReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Match {
  id: MatchId;
  taskId: TaskId;
  responseId: ResponseId;
  ownerId: UserId;
  providerId: UserId;
  conversationId: ConversationId;
  createdAt: string;
}

export interface Conversation {
  id: ConversationId;
  taskId: TaskId;
  participantIds: UserId[];
  lastMessageAt: string;
}

export interface Message {
  id: MessageId;
  conversationId: ConversationId;
  senderId: UserId;
  body: string;
  createdAt: string;
}

export interface Feedback {
  id: FeedbackId;
  taskId: TaskId;
  authorId: UserId;
  receiverId: UserId;
  rating: number;
  comment: string;
  createdAt: string;
}

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface Report {
  id: ReportId;
  reporterId: UserId;
  reportedUserId: UserId;
  taskId?: TaskId;
  reason: string;
  status: ReportStatus;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  accessToken: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  location: string;
  bio: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export type UpdateCurrentUserRequest = Partial<
  Pick<User, "name" | "location" | "bio" | "skills" | "interests" | "avatarUrl">
>;

export type CreateTaskRequest = Pick<
  Task,
  "title" | "description" | "category" | "location" | "compensation"
>;

export type UpdateTaskRequest = Partial<CreateTaskRequest>;

export interface RequestCompletionRequest {
  note?: string;
}

export interface CompletionMutationResponse {
  completionRequest: CompletionRequest;
  task: Task;
}

export interface RaiseCompletionConcernRequest {
  reason: string;
}

export interface CreateTaskResponseRequest {
  comment: string;
}

export interface SendMessageRequest {
  body: string;
}

export interface LeaveFeedbackRequest {
  rating: number;
  comment: string;
}

export interface CreateReportRequest {
  reportedUserId: UserId;
  taskId?: TaskId;
  reason: string;
}

export interface UpdateReportRequest {
  status: ReportStatus;
  resolutionNote?: string;
}

export interface BlockUserRequest {
  reason: string;
}

export interface BlockUserResponse {
  id: UserId;
  accountStatus: "blocked";
  blockedReason: string;
  blockedAt: string;
}

export interface UnblockUserResponse {
  id: UserId;
  accountStatus: "active";
}

export interface PaginationQuery {
  limit?: number;
  offset?: number;
}

export interface ListTasksQuery extends PaginationQuery {
  status?: TaskStatus;
  category?: string;
  location?: string;
  owner?: "me";
  involved?: "me";
  available?: boolean;
}

export interface ListResponsesQuery extends PaginationQuery {
  status?: ResponseStatus;
}

export type UserFeedbackQuery = PaginationQuery;

export type ListMyResponsesQuery = ListResponsesQuery;

export interface ListMatchesQuery extends PaginationQuery {
  activeOnly?: boolean;
}

export type ListConversationsQuery = PaginationQuery;

export interface ListMessagesQuery {
  before?: string;
  limit?: number;
}

export interface ListReportsQuery extends PaginationQuery {
  status?: ReportStatus;
}
