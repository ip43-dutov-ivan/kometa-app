import { PublicProfilePage } from "@/features/profile";

export default async function PublicProfileRoute({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <PublicProfilePage userId={userId} />;
}
