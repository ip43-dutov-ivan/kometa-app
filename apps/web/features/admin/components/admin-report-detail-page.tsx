"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Report, ReportStatus } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/page-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function AdminReportDetailPage({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [status, setStatus] = useState<ReportStatus>("reviewing");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadReport = useCallback(async () => {
    setError(null);
    try {
      const response = await kometaApi.admin.listReports();
      const nextReport = response.items.find((item) => item.id === reportId) ?? null;
      setReport(nextReport);
      if (nextReport) {
        setStatus(nextReport.status);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Report failed to load.");
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  async function updateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setError(null);
    try {
      const nextReport = await kometaApi.admin.updateReport(reportId, {
        status,
        resolutionNote: String(formData.get("resolutionNote") ?? ""),
      });
      setReport(nextReport);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Report update failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading report" />;
  }

  if (!report) {
    return error ? <ErrorState message={error} /> : <EmptyState title="Report not found" />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="grid gap-5">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Report detail</h1>
          <p className="mt-2 text-muted-foreground">{report.id}</p>
        </div>
        {error ? <ErrorState message={error} /> : null}
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>{report.reason}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <span>Status: {report.status}</span>
            <span>Reporter: {report.reporterId}</span>
            <span>Reported user: {report.reportedUserId}</span>
            {report.taskId ? <span>Task: {report.taskId}</span> : null}
            {report.resolutionNote ? <span>Resolution: {report.resolutionNote}</span> : null}
          </CardContent>
        </Card>
      </section>
      <aside className="h-fit rounded-lg border p-5">
        <form className="grid gap-4" onSubmit={updateReport}>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as ReportStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">open</SelectItem>
                <SelectItem value="reviewing">reviewing</SelectItem>
                <SelectItem value="resolved">resolved</SelectItem>
                <SelectItem value="dismissed">dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="resolutionNote">Resolution note</Label>
            <Textarea
              id="resolutionNote"
              name="resolutionNote"
              rows={5}
              defaultValue={report.resolutionNote ?? ""}
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving" : "Save review"}
          </Button>
          <Button asChild variant="outline">
            <Link href={`/admin/users/${report.reportedUserId}`}>Moderate user</Link>
          </Button>
        </form>
      </aside>
    </div>
  );
}
