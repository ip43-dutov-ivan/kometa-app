import { TaskFeedbackPage } from "@/features/feedback";

export default async function TaskFeedbackRoute({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  return <TaskFeedbackPage taskId={taskId} />;
}
