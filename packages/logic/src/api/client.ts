import type {
  ApiErrorDto,
  AuthSession,
  BlockUserRequest,
  BlockUserResponse,
  CompletionMutationResponse,
  CompletionRequestId,
  Conversation,
  ConversationId,
  CreateReportRequest,
  CreateTaskRequest,
  CreateTaskResponseRequest,
  Feedback,
  LeaveFeedbackRequest,
  ListConversationsQuery,
  ListMatchesQuery,
  ListMessagesQuery,
  ListMyResponsesQuery,
  ListReportsQuery,
  ListResponse,
  ListResponsesQuery,
  ListTasksQuery,
  LoginRequest,
  Match,
  Message,
  RaiseCompletionConcernRequest,
  RegisterRequest,
  Report,
  ReportId,
  RequestCompletionRequest,
  ResponseId,
  SendMessageRequest,
  Task,
  TaskId,
  TaskResponse,
  UnblockUserResponse,
  UpdateCurrentUserRequest,
  UpdateReportRequest,
  UpdateTaskRequest,
  User,
  UserFeedbackQuery,
  UserId,
} from "./dtos";

export interface KometaApiClientOptions {
  baseUrl?: string;
  accessToken?: string;
  getAccessToken?: () => string | null | undefined | Promise<string | null | undefined>;
  fetchFn?: typeof fetch;
  defaultHeaders?: HeadersInit;
}

export interface KometaRequestOptions {
  accessToken?: string;
  signal?: AbortSignal;
}

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = object;

export class KometaApiError extends Error {
  readonly status: number;
  readonly data?: ApiErrorDto;

  constructor(status: number, data?: ApiErrorDto) {
    super(data?.message ?? `Kometa API request failed with status ${status}`);
    this.name = "KometaApiError";
    this.status = status;
    this.data = data;
  }
}

export interface KometaApiClient {
  auth: {
    register: (body: RegisterRequest, options?: KometaRequestOptions) => Promise<AuthSession>;
    login: (body: LoginRequest, options?: KometaRequestOptions) => Promise<AuthSession>;
    logout: (options?: KometaRequestOptions) => Promise<void>;
  };
  users: {
    getMe: (options?: KometaRequestOptions) => Promise<User>;
    updateMe: (body: UpdateCurrentUserRequest, options?: KometaRequestOptions) => Promise<User>;
    getById: (userId: UserId, options?: KometaRequestOptions) => Promise<User>;
    listFeedback: (
      userId: UserId,
      query?: UserFeedbackQuery,
      options?: KometaRequestOptions,
    ) => Promise<ListResponse<Feedback>>;
  };
  tasks: {
    list: (query?: ListTasksQuery, options?: KometaRequestOptions) => Promise<ListResponse<Task>>;
    create: (body: CreateTaskRequest, options?: KometaRequestOptions) => Promise<Task>;
    get: (taskId: TaskId, options?: KometaRequestOptions) => Promise<Task>;
    update: (
      taskId: TaskId,
      body: UpdateTaskRequest,
      options?: KometaRequestOptions,
    ) => Promise<Task>;
    start: (taskId: TaskId, options?: KometaRequestOptions) => Promise<Task>;
    requestCompletion: (
      taskId: TaskId,
      body: RequestCompletionRequest,
      options?: KometaRequestOptions,
    ) => Promise<CompletionMutationResponse>;
    confirmCompletion: (
      taskId: TaskId,
      requestId: CompletionRequestId,
      options?: KometaRequestOptions,
    ) => Promise<CompletionMutationResponse>;
    raiseCompletionConcern: (
      taskId: TaskId,
      requestId: CompletionRequestId,
      body: RaiseCompletionConcernRequest,
      options?: KometaRequestOptions,
    ) => Promise<CompletionMutationResponse>;
    listResponses: (
      taskId: TaskId,
      query?: ListResponsesQuery,
      options?: KometaRequestOptions,
    ) => Promise<ListResponse<TaskResponse>>;
    respond: (
      taskId: TaskId,
      body: CreateTaskResponseRequest,
      options?: KometaRequestOptions,
    ) => Promise<TaskResponse>;
    acceptResponse: (
      taskId: TaskId,
      responseId: ResponseId,
      options?: KometaRequestOptions,
    ) => Promise<Match>;
    leaveFeedback: (
      taskId: TaskId,
      body: LeaveFeedbackRequest,
      options?: KometaRequestOptions,
    ) => Promise<Feedback>;
    listFeedback: (taskId: TaskId, options?: KometaRequestOptions) => Promise<Feedback[]>;
  };
  responses: {
    listMine: (
      query?: ListMyResponsesQuery,
      options?: KometaRequestOptions,
    ) => Promise<ListResponse<TaskResponse>>;
  };
  matches: {
    list: (
      query?: ListMatchesQuery,
      options?: KometaRequestOptions,
    ) => Promise<ListResponse<Match>>;
  };
  conversations: {
    list: (
      query?: ListConversationsQuery,
      options?: KometaRequestOptions,
    ) => Promise<ListResponse<Conversation>>;
    get: (conversationId: ConversationId, options?: KometaRequestOptions) => Promise<Conversation>;
    listMessages: (
      conversationId: ConversationId,
      query?: ListMessagesQuery,
      options?: KometaRequestOptions,
    ) => Promise<Message[]>;
    sendMessage: (
      conversationId: ConversationId,
      body: SendMessageRequest,
      options?: KometaRequestOptions,
    ) => Promise<Message>;
  };
  reports: {
    create: (body: CreateReportRequest, options?: KometaRequestOptions) => Promise<Report>;
  };
  admin: {
    listReports: (
      query?: ListReportsQuery,
      options?: KometaRequestOptions,
    ) => Promise<ListResponse<Report>>;
    updateReport: (
      reportId: ReportId,
      body: UpdateReportRequest,
      options?: KometaRequestOptions,
    ) => Promise<Report>;
    blockUser: (
      userId: UserId,
      body: BlockUserRequest,
      options?: KometaRequestOptions,
    ) => Promise<BlockUserResponse>;
    unblockUser: (userId: UserId, options?: KometaRequestOptions) => Promise<UnblockUserResponse>;
  };
}

export function createKometaApiClient(options: KometaApiClientOptions = {}): KometaApiClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? "/api/v1");
  const fetchImpl = options.fetchFn ?? globalThis.fetch;

  if (!fetchImpl) {
    throw new Error("A fetch implementation is required to create the Kometa API client.");
  }

  const request = async <TResponse>(
    path: string,
    init: RequestInit = {},
    requestOptions: KometaRequestOptions = {},
  ): Promise<TResponse> => {
    const token =
      requestOptions.accessToken ??
      options.accessToken ??
      (options.getAccessToken ? await options.getAccessToken() : undefined);
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      signal: requestOptions.signal ?? init.signal,
      headers: buildHeaders(options.defaultHeaders, init.headers, token),
    });

    if (!response.ok) {
      throw new KometaApiError(response.status, await readError(response));
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    return (await response.json()) as TResponse;
  };

  const get = <TResponse>(
    path: string,
    query?: QueryParams,
    options?: KometaRequestOptions,
  ): Promise<TResponse> => request<TResponse>(withQuery(path, query), { method: "GET" }, options);
  const post = <TResponse>(
    path: string,
    body?: unknown,
    options?: KometaRequestOptions,
  ): Promise<TResponse> => request<TResponse>(path, withJsonBody("POST", body), options);
  const patch = <TResponse>(
    path: string,
    body: unknown,
    options?: KometaRequestOptions,
  ): Promise<TResponse> => request<TResponse>(path, withJsonBody("PATCH", body), options);

  return {
    auth: {
      register: (body, options) => post<AuthSession>("/auth/register", body, options),
      login: (body, options) => post<AuthSession>("/auth/login", body, options),
      logout: (options) => post<void>("/auth/logout", undefined, options),
    },
    users: {
      getMe: (options) => get<User>("/users/me", undefined, options),
      updateMe: (body, options) => patch<User>("/users/me", body, options),
      getById: (userId, options) => get<User>(`/users/${segment(userId)}`, undefined, options),
      listFeedback: (userId, query, options) =>
        get<ListResponse<Feedback>>(`/users/${segment(userId)}/feedback`, query, options),
    },
    tasks: {
      list: (query, options) => get<ListResponse<Task>>("/tasks", query, options),
      create: (body, options) => post<Task>("/tasks", body, options),
      get: (taskId, options) => get<Task>(`/tasks/${segment(taskId)}`, undefined, options),
      update: (taskId, body, options) => patch<Task>(`/tasks/${segment(taskId)}`, body, options),
      start: (taskId, options) => post<Task>(`/tasks/${segment(taskId)}/start`, undefined, options),
      requestCompletion: (taskId, body, options) =>
        post<CompletionMutationResponse>(
          `/tasks/${segment(taskId)}/completion-requests`,
          body,
          options,
        ),
      confirmCompletion: (taskId, requestId, options) =>
        post<CompletionMutationResponse>(
          `/tasks/${segment(taskId)}/completion-requests/${segment(requestId)}/confirm`,
          undefined,
          options,
        ),
      raiseCompletionConcern: (taskId, requestId, body, options) =>
        post<CompletionMutationResponse>(
          `/tasks/${segment(taskId)}/completion-requests/${segment(requestId)}/concerns`,
          body,
          options,
        ),
      listResponses: (taskId, query, options) =>
        get<ListResponse<TaskResponse>>(`/tasks/${segment(taskId)}/responses`, query, options),
      respond: (taskId, body, options) =>
        post<TaskResponse>(`/tasks/${segment(taskId)}/responses`, body, options),
      acceptResponse: (taskId, responseId, options) =>
        post<Match>(
          `/tasks/${segment(taskId)}/responses/${segment(responseId)}/accept`,
          undefined,
          options,
        ),
      leaveFeedback: (taskId, body, options) =>
        post<Feedback>(`/tasks/${segment(taskId)}/feedback`, body, options),
      listFeedback: (taskId, options) =>
        get<Feedback[]>(`/tasks/${segment(taskId)}/feedback`, undefined, options),
    },
    responses: {
      listMine: (query, options) =>
        get<ListResponse<TaskResponse>>("/me/responses", query, options),
    },
    matches: {
      list: (query, options) => get<ListResponse<Match>>("/matches", query, options),
    },
    conversations: {
      list: (query, options) => get<ListResponse<Conversation>>("/conversations", query, options),
      get: (conversationId, options) =>
        get<Conversation>(`/conversations/${segment(conversationId)}`, undefined, options),
      listMessages: (conversationId, query, options) =>
        get<Message[]>(`/conversations/${segment(conversationId)}/messages`, query, options),
      sendMessage: (conversationId, body, options) =>
        post<Message>(`/conversations/${segment(conversationId)}/messages`, body, options),
    },
    reports: {
      create: (body, options) => post<Report>("/reports", body, options),
    },
    admin: {
      listReports: (query, options) => get<ListResponse<Report>>("/admin/reports", query, options),
      updateReport: (reportId, body, options) =>
        patch<Report>(`/admin/reports/${segment(reportId)}`, body, options),
      blockUser: (userId, body, options) =>
        post<BlockUserResponse>(`/admin/users/${segment(userId)}/block`, body, options),
      unblockUser: (userId, options) =>
        post<UnblockUserResponse>(`/admin/users/${segment(userId)}/unblock`, undefined, options),
    },
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function withJsonBody(method: "POST" | "PATCH", body: unknown): RequestInit {
  if (body === undefined) {
    return { method };
  }

  return {
    method,
    body: JSON.stringify(body),
  };
}

function buildHeaders(
  defaultHeaders: HeadersInit | undefined,
  requestHeaders: HeadersInit | undefined,
  accessToken: string | null | undefined,
): Headers {
  const headers = new Headers(defaultHeaders);
  new Headers(requestHeaders).forEach((value, key) => {
    headers.set(key, value);
  });

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

function withQuery(path: string, query?: QueryParams): string {
  if (!query) {
    return path;
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (isQueryValue(value)) {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function segment(value: string): string {
  return encodeURIComponent(value);
}

function isQueryValue(value: unknown): value is Exclude<QueryValue, null | undefined> {
  const valueType = typeof value;
  return valueType === "string" || valueType === "number" || valueType === "boolean";
}

async function readError(response: Response): Promise<ApiErrorDto | undefined> {
  try {
    return (await response.json()) as ApiErrorDto;
  } catch (_error) {
    return undefined;
  }
}
