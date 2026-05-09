import { TaskDetailPage } from "@/features/tasks";

export default async function MyTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ returnToConversationId?: string }>;
}) {
  const { taskId } = await params;
  const { returnToConversationId } = await searchParams;
  return (
    <TaskDetailPage taskId={taskId} scope="owned" returnToConversationId={returnToConversationId} />
  );
}
