import { AdminUserModerationPage } from "@/features/admin";

export default async function AdminUserRoute({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <AdminUserModerationPage userId={userId} />;
}
