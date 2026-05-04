import { AdminReportDetailPage } from "@/features/admin";

export default async function AdminReportRoute({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  return <AdminReportDetailPage reportId={reportId} />;
}
