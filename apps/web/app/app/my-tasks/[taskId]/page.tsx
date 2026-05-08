import { TaskDetailPage } from "@/features/tasks";

export default async function MyTaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  return <TaskDetailPage taskId={taskId} scope="owned" />;
}
