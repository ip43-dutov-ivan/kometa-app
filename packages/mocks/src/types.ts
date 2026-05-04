export type UserId = string;
export type TaskId = string;
export type ResponseId = string;
export type MatchId = string;
export type ConversationId = string;

export type TaskStatus = "open" | "matched" | "in_progress" | "completion_requested" | "completed";
export type ResponseStatus = "pending" | "accepted" | "declined";
export type CompensationType = "money" | "credits";
export type ReportStatus = "open" | "reviewing" | "resolved";

export interface UserProfile {
  id: UserId;
  name: string;
  location: string;
  bio: string;
  skills: string[];
  interests: string[];
  rating: number;
  completedTasks: number;
  avatarUrl?: string;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
}

export interface Task {
  id: TaskId;
  title: string;
  description: string;
  category: string;
  location: string;
  compensation: {
    type: CompensationType;
    amount: number;
    currency: "UAH" | "credits";
  };
  status: TaskStatus;
  ownerId: UserId;
  selectedResponseId?: ResponseId;
  createdAt: string;
}

export interface TaskResponse {
  id: ResponseId;
  taskId: TaskId;
  providerId: UserId;
  comment: string;
  status: ResponseStatus;
  createdAt: string;
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
  id: string;
  conversationId: ConversationId;
  senderId: UserId;
  body: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  taskId: TaskId;
  authorId: UserId;
  receiverId: UserId;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: UserId;
  reportedUserId: UserId;
  taskId?: TaskId;
  reason: string;
  status: ReportStatus;
  createdAt: string;
}

export interface ApiError {
  message: string;
  code: string;
}
