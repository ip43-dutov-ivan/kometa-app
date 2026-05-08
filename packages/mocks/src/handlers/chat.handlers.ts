import { http } from "msw";
import { apiPath } from "../config";
import { conversations, currentUserId, messages } from "../data";
import type { ChatMessage } from "../types";
import {
  createId,
  error,
  getPagination,
  json,
  pagedListJson,
  requireActiveCurrentUser,
  now,
} from "./utils";

export const chatHandlers = [
  http.get(apiPath("/conversations"), ({ request }) => {
    const url = new URL(request.url);
    const { limit, offset } = getPagination(url);
    const result = conversations
      .filter((conversation) => conversation.participantIds.includes(currentUserId))
      .sort((first, second) => second.lastMessageAt.localeCompare(first.lastMessageAt));

    return pagedListJson(result, limit, offset);
  }),

  http.get(apiPath("/conversations/:conversationId"), ({ params }) => {
    const conversation = conversations.find((item) => item.id === params.conversationId);

    if (!conversation || !conversation.participantIds.includes(currentUserId)) {
      return error("Conversation not found", "conversation_not_found", 404);
    }

    return json(conversation);
  }),

  http.get(apiPath("/conversations/:conversationId/messages"), ({ params, request }) => {
    const conversation = conversations.find((item) => item.id === params.conversationId);

    if (!conversation || !conversation.participantIds.includes(currentUserId)) {
      return error("Conversation not found", "conversation_not_found", 404);
    }

    const url = new URL(request.url);
    const before = url.searchParams.get("before");
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
    const matchingMessages = messages
      .filter((message) => message.conversationId === params.conversationId)
      .filter((message) => !before || message.createdAt < before)
      .sort((first, second) => first.createdAt.localeCompare(second.createdAt));
    const effectiveLimit = Math.max(1, Number.isFinite(limit) ? limit : 50);
    const result = matchingMessages.slice(-effectiveLimit);

    return json({
      items: result,
      pageInfo: {
        limit: effectiveLimit,
        offset: 0,
        total: matchingMessages.length,
        hasMore: matchingMessages.length > effectiveLimit,
      },
    });
  }),

  http.post(apiPath("/conversations/:conversationId/messages"), async ({ params, request }) => {
    const activeUser = requireActiveCurrentUser();
    if (activeUser.response) {
      return activeUser.response;
    }

    const conversation = conversations.find((item) => item.id === params.conversationId);

    if (!conversation || !conversation.participantIds.includes(currentUserId)) {
      return error("Conversation not found", "conversation_not_found", 404);
    }

    const body = await request.json().catch(() => ({}));
    const input = body as Partial<Pick<ChatMessage, "body">>;

    const message: ChatMessage = {
      id: createId("message"),
      conversationId: conversation.id,
      senderId: currentUserId,
      body: input.body?.trim() || "",
      createdAt: now(),
    };

    if (!message.body) {
      return error("Message body is required", "message_body_required", 422);
    }

    conversation.lastMessageAt = message.createdAt;
    messages.push(message);

    return json(message, { status: 201 });
  }),
];
