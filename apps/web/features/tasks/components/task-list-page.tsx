"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { t } from "@kometa/i18n";
import type { Task, TaskLocationFacet } from "@kometa/logic";
import { buildAvailableTasksQuery, buildOwnTasksQuery } from "@kometa/logic";
import { kometaApi } from "@/shared/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/page-state";
import { SearchSelect } from "@/shared/components/search-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TaskCategorySelect } from "./task-category-select";
import { TaskCard } from "./task-card";

export function TaskDiscoveryPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [locationFacets, setLocationFacets] = useState<TaskLocationFacet[]>([]);
  const [category, setCategory] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTasks = useCallback(async (nextCategory: string, nextLocationCity: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await kometaApi.tasks.list(
        buildAvailableTasksQuery({ category: nextCategory, locationCity: nextLocationCity }),
      );
      setTasks(response.items);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("Tasks failed to load."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadLocationFacets = useCallback(async (nextCategory: string) => {
    try {
      const facets = await kometaApi.tasks.listLocationFacets(
        buildAvailableTasksQuery({ category: nextCategory }),
      );
      setLocationFacets(facets);
    } catch {
      setLocationFacets([]);
    }
  }, []);

  useEffect(() => {
    loadTasks("", "");
  }, [loadTasks]);

  useEffect(() => {
    loadLocationFacets(category);
  }, [category, loadLocationFacets]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadTasks(category, locationCity);
  }

  function onCategoryChange(nextCategory: string) {
    setCategory(nextCategory);
    setLocationCity("");
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold">{t("Task discovery")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("Browse open tasks from other Kometa users.")}
          </p>
        </div>
        <Button asChild>
          <Link href="/app/tasks/new">
            <Plus />
            {t("Create task")}
          </Link>
        </Button>
      </div>
      <form
        className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_1fr_auto]"
        onSubmit={onSubmit}
      >
        <div className="grid gap-2">
          <Label>{t("Category")}</Label>
          <div className="flex gap-2">
            <TaskCategorySelect
              value={category}
              onValueChange={onCategoryChange}
              placeholder={t("All categories")}
              searchPlaceholder={t("Search categories...")}
            />
            {category ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t("Clear category")}
                onClick={() => onCategoryChange("")}
              >
                <X />
              </Button>
            ) : null}
          </div>
        </div>
        <div className="grid gap-2">
          <Label>{t("Location")}</Label>
          <div className="flex gap-2">
            <SearchSelect<TaskLocationFacet>
              value={locationCity}
              items={locationFacets}
              onValueChange={(nextValue) => setLocationCity(nextValue)}
              getItemValue={(item) => item.id}
              getItemLabel={(item) => `${item.label} (${item.count})`}
              placeholder={t("All locations")}
              searchPlaceholder={t("Search locations...")}
              emptyMessage={t("No available locations.")}
            />
            {locationCity ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t("Clear location")}
                onClick={() => setLocationCity("")}
              >
                <X />
              </Button>
            ) : null}
          </div>
        </div>
        <Button type="submit" className="self-end">
          <Search />
          {t("Search")}
        </Button>
      </form>
      {error ? <ErrorState message={error} /> : null}
      {isLoading ? (
        <LoadingState label={t("Loading tasks")} />
      ) : tasks.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} href={`/app/tasks/${task.id}`} />
          ))}
        </div>
      ) : (
        <EmptyState title={t("No tasks found")} body={t("Try a broader category or location.")} />
      )}
    </div>
  );
}

export function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    async function loadTasks() {
      try {
        const response = await kometaApi.tasks.list(buildOwnTasksQuery());
        if (isActive) {
          setTasks(response.items.filter((task) => task.status !== "cancelled"));
        }
      } catch (caughtError) {
        if (isActive) {
          setError(
            caughtError instanceof Error ? caughtError.message : t("Your tasks failed to load."),
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }
    loadTasks();
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold">{t("My tasks")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t(
              "Manage your created tasks. Duplicate a task to revise it, or delete open tasks you no longer need.",
            )}
          </p>
        </div>
        <Button asChild>
          <Link href="/app/tasks/new">
            <Plus />
            {t("Create task")}
          </Link>
        </Button>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {isLoading ? (
        <LoadingState label={t("Loading your tasks")} />
      ) : tasks.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} href={`/app/my-tasks/${task.id}`} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("You have not created tasks yet")}
          body={t("Create one when you need help.")}
        />
      )}
    </div>
  );
}
