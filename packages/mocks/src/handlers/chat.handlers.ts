import { http } from "msw";
import { apiPath } from "../config";
import { conversations, currentUserId, messages } from "../data";
import type { ChatMessage } from "../types";
import { createId, error, json, listJson, now } from "./utils";

export const chatHandlers = [
  http.get(apiPath("/conversations"), () => {
    return listJson(
      conversations.filter((conversation) => conversation.participantIds.includes(currentUserId)),
    );
  }),

  http.get(apiPath("/conversations/:conversationId"), ({ params }) => {
    const conversation = conversations.find((item) => item.id === params.conversationId);

    if (!conversation || !conversation.participantIds.includes(currentUserId)) {
      return error("Conversation not found", "conversation_not_found", 404);
    }

    return json(conversation);
  }),

  http.get(apiPath("/conversations/:conversationId/messages"), ({ params }) => {
    const conversation = conversations.find((item) => item.id === params.conversationId);

    if (!conversation || !conversation.participantIds.includes(currentUserId)) {
      return error("Conversation not found", "conversation_not_found", 404);
    }

    return json(messages.filter((message) => message.conversationId === params.conversationId));
  }),

  http.post(apiPath("/conversations/:conversationId/messages"), async ({ params, request }) => {
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
