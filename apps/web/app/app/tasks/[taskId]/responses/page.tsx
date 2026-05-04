import { CandidateReviewPage } from "@/features/responses";

export default async function CandidateReviewRoute({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  return <CandidateReviewPage taskId={taskId} />;
}
