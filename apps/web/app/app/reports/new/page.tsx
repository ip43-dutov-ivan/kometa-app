import { Suspense } from "react";
import { t } from "@kometa/i18n";
import { CreateReportPage } from "@/features/reports";
import { LoadingState } from "@/shared/components/page-state";

export default function NewReportRoute() {
  return (
    <Suspense fallback={<LoadingState label={t("Loading report form")} />}>
      <CreateReportPage />
    </Suspense>
  );
}
