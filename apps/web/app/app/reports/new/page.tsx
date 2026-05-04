import { Suspense } from "react";
import { CreateReportPage } from "@/features/reports";
import { LoadingState } from "@/shared/components/page-state";

export default function NewReportRoute() {
  return (
    <Suspense fallback={<LoadingState label="Loading report form" />}>
      <CreateReportPage />
    </Suspense>
  );
}
