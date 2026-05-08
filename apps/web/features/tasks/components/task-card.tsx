import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { t } from "@kometa/i18n";
import type { Task } from "@kometa/logic";
import { getTaskCategoryLabel, getTaskLocationLabel } from "@kometa/logic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function TaskCard({
  task,
  href,
  pendingResponseCount = 0,
  reviewHref,
}: {
  task: Task;
  href?: string;
  pendingResponseCount?: number;
  reviewHref?: string;
}) {
  const hasPendingResponses = pendingResponseCount > 0 && Boolean(reviewHref);
  const cardHref =
    hasPendingResponses && reviewHref ? reviewHref : (href ?? `/app/tasks/${task.id}`);

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{getTaskCategoryLabel(task.category)}</Badge>
          <Badge variant="outline">{t(task.status)}</Badge>
          {hasPendingResponses ? (
            <Badge>
              {pendingResponseCount} {t("pending responses")}
            </Badge>
          ) : null}
        </div>
        <CardTitle className="text-xl leading-tight">{task.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{task.description}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <span>{getTaskLocationLabel(task.location)}</span>
          <span>
            {task.compensation.amount} {task.compensation.currency}
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={cardHref}>
            {hasPendingResponses ? <MessageSquare /> : null}
            {hasPendingResponses ? t("Review responses") : t("Open task")}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
