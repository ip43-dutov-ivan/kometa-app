import { ChatPage } from "@/features/conversations";

export default async function ChatRoute({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return <ChatPage conversationId={conversationId} />;
}
