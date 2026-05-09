"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { t } from "@kometa/i18n";
import type { Report, ReportStatus } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const statuses: Array<ReportStatus | "all"> = ["all", "open", "reviewing", "resolved", "dismissed"];

export function AdminReportsPage() {
  const [status, setStatus] = useState<ReportStatus | "all">("open");
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await kometaApi.admin.listReports(status === "all" ? undefined : { status });
      setReports(response.items);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("Reports failed to load."));
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-heading text-3xl font-semibold">{t("Reports queue")}</h1>
        <p className="mt-2 text-muted-foreground">{t("Manual review surface for MVP support.")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {statuses.map((item) => (
          <Button
            key={item}
            variant={status === item ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus(item)}
          >
            {t(item)}
          </Button>
        ))}
      </div>
      {error ? <ErrorState message={error} /> : null}
      {isLoading ? (
        <LoadingState label={t("Loading reports")} />
      ) : reports.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {reports.map((report) => (
            <Card key={report.id} className="rounded-lg">
              <CardHeader>
                <Badge className="w-fit" variant="outline">
                  {t(report.status)}
                </Badge>
                <CardTitle className="text-xl">{report.reason}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1 text-sm text-muted-foreground">
                <span>
                  {t("Reporter")}: {report.reporterId}
                </span>
                <span>
                  {t("Reported")}: {report.reportedUserId}
                </span>
                {report.taskId ? (
                  <span>
                    {t("Task")}: {report.taskId}
                  </span>
                ) : null}
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/admin/reports/${report.id}`}>{t("Review")}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title={t("No reports")} body={t("Try another status filter.")} />
      )}
    </div>
  );
}
