import Link from "next/link";
import type { Task } from "@kometa/logic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function TaskCard({ task }: { task: Task }) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{task.category}</Badge>
          <Badge variant="outline">{task.status}</Badge>
        </div>
        <CardTitle className="text-xl leading-tight">{task.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{task.description}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <span>{task.location}</span>
          <span>
            {task.compensation.amount} {task.compensation.currency}
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/app/tasks/${task.id}`}>Open task</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
