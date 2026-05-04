import { EditTaskPage } from "@/features/tasks";

export default async function EditTaskRoute({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  return <EditTaskPage taskId={taskId} />;
}
