import { redirect } from "next/navigation";

export default async function EditTaskRoute({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  redirect(`/app/tasks/new?duplicateFrom=${encodeURIComponent(taskId)}`);
}
