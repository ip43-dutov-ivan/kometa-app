export type UserId = string;
export type TaskId = string;
export type ResponseId = string;
export type CompletionRequestId = string;
export type MatchId = string;
export type ConversationId = string;
export type MessageId = string;
export type FeedbackId = string;
export type ReportId = string;

export type TaskStatus =
  | "open"
  | "matched"
  | "inProgress"
  | "completionRequested"
  | "completed"
  | "cancelled";
export type ResponseStatus = "pending" | "accepted" | "declined" | "withdrawn";
export type CompletionRequestStatus = "pending" | "confirmed" | "concernRaised";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

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

export interface UserProfile {
  id: UserId;
  name: string;
  location: string;
  bio: string;
  skills: string[];
  interests: string[];
  rating: number;
  completedTasks: number;
  accountStatus: "active" | "blocked";
  avatarUrl?: string;
  blockedReason?: string;
  blockedAt?: string;
}

export interface AuthSession {
  accessToken: string;
  user: UserProfile;
}

export interface Task {
  id: TaskId;
  title: string;
  description: string;
  category: string;
  location: string;
  compensation: {
    type: "money";
    amount: number;
    currency: "UAH";
  };
  status: TaskStatus;
  ownerId: UserId;
  selectedResponseId?: ResponseId;
  createdAt: string;
  updatedAt: string;
}

export interface TaskResponse {
  id: ResponseId;
  taskId: TaskId;
  providerId: UserId;
  comment: string;
  status: ResponseStatus;
  createdAt: string;
}

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

export interface ChatMessage {
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

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
