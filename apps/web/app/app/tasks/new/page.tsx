import { CreateTaskPage } from "@/features/tasks";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicateFrom?: string }>;
}) {
  const { duplicateFrom } = await searchParams;
  return <CreateTaskPage duplicateFrom={duplicateFrom} />;
}
