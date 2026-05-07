import Fuse from "fuse.js";
import type { CreateTaskRequest, ListTasksQuery, Task } from "../api/dtos";

export type TaskCategoryLocale = "en" | "uk";

export interface TaskCategory {
  id: string;
  labels: Record<TaskCategoryLocale, string>;
  aliases: Partial<Record<TaskCategoryLocale, readonly string[]>>;
}

export const TASK_CATEGORIES = [
  {
    id: "education",
    labels: { en: "Education", uk: "Освіта" },
    aliases: {
      en: ["study", "tutoring", "homework", "lecture", "university"],
      uk: ["навчання", "репетиторство", "домашнє завдання", "лекція", "університет"],
    },
  },
  {
    id: "home_tech",
    labels: { en: "Home tech", uk: "Домашня техніка" },
    aliases: {
      en: ["wi-fi", "router", "setup", "device", "computer"],
      uk: ["вай-фай", "роутер", "налаштування", "пристрій", "комп'ютер"],
    },
  },
  {
    id: "errands",
    labels: { en: "Errands", uk: "Доручення" },
    aliases: {
      en: ["delivery", "pickup", "documents", "campus"],
      uk: ["доставка", "забрати", "документи", "кампус"],
    },
  },
  {
    id: "design",
    labels: { en: "Design", uk: "Дизайн" },
    aliases: {
      en: ["poster", "portfolio", "review", "visual"],
      uk: ["постер", "портфоліо", "рев'ю", "візуал"],
    },
  },
  {
    id: "household",
    labels: { en: "Household", uk: "Побут" },
    aliases: {
      en: ["cleaning", "repair", "apartment", "home"],
      uk: ["прибирання", "ремонт", "квартира", "дім"],
    },
  },
  {
    id: "transport",
    labels: { en: "Transport", uk: "Транспорт" },
    aliases: {
      en: ["ride", "move", "carry", "trip"],
      uk: ["поїздка", "переїзд", "перенести", "дорога"],
    },
  },
  {
    id: "other",
    labels: { en: "Other", uk: "Інше" },
    aliases: {
      en: ["general", "misc"],
      uk: ["загальне", "різне"],
    },
  },
] as const satisfies readonly TaskCategory[];

const LEGACY_TASK_CATEGORY_IDS: Record<string, string> = {
  "design review": "design",
  education: "education",
  errands: "errands",
  general: "other",
  "home tech": "home_tech",
};

const TASK_CATEGORY_SEARCH_INDEX = new Fuse(TASK_CATEGORIES, {
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.4,
  keys: [
    { name: "id", weight: 0.4 },
    { name: "labels.en", weight: 0.8 },
    { name: "labels.uk", weight: 0.8 },
    { name: "aliases.en", weight: 0.5 },
    { name: "aliases.uk", weight: 0.5 },
  ],
});

export interface TaskFilters {
  category?: string;
  location?: string;
}

export interface TaskFormValues {
  title: string;
  description: string;
  category: string;
  location: string;
  amount: number;
}

export function buildAvailableTasksQuery(filters: TaskFilters = {}): ListTasksQuery {
  return {
    available: true,
    status: "open",
    category: filters.category ? normalizeTaskCategoryId(filters.category) : undefined,
    location: filters.location?.trim() || undefined,
  };
}

export function buildOwnTasksQuery(): ListTasksQuery {
  return { owner: "me" };
}

export function toCreateTaskRequest(values: TaskFormValues): CreateTaskRequest {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    category: normalizeTaskCategoryId(values.category),
    location: values.location.trim(),
    compensation: {
      type: "money",
      amount: Math.max(0, Number(values.amount) || 0),
      currency: "UAH",
    },
  };
}

export function isTaskOwner(task: Task, currentUserId: string | null | undefined): boolean {
  return Boolean(currentUserId && task.ownerId === currentUserId);
}

export function isTaskCategoryId(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  return TASK_CATEGORIES.some((category) => category.id === value);
}

export function normalizeTaskCategoryId(value: string): string {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return "";
  }

  if (isTaskCategoryId(normalizedValue)) {
    return normalizedValue;
  }

  return LEGACY_TASK_CATEGORY_IDS[normalizedValue.toLocaleLowerCase()] ?? normalizedValue;
}

export function getTaskCategoryLabel(category: string, locale: TaskCategoryLocale = "en"): string {
  const categoryId = normalizeTaskCategoryId(category);
  const match = TASK_CATEGORIES.find((item) => item.id === categoryId);

  return match?.labels[locale] ?? category.trim();
}

export function searchTaskCategories(
  query: string,
  locale: TaskCategoryLocale = "en",
): TaskCategory[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [...TASK_CATEGORIES];
  }

  const normalizedQueryLower = normalizedQuery.toLocaleLowerCase();

  return TASK_CATEGORY_SEARCH_INDEX.search(normalizedQuery)
    .sort((firstResult, secondResult) => {
      const rankDifference =
        taskCategorySearchRank(firstResult.item, locale, normalizedQueryLower) -
        taskCategorySearchRank(secondResult.item, locale, normalizedQueryLower);

      return rankDifference || (firstResult.score ?? 0) - (secondResult.score ?? 0);
    })
    .map((result) => result.item);
}

function taskCategorySearchRank(
  category: TaskCategory,
  locale: TaskCategoryLocale,
  query: string,
): number {
  if (category.labels[locale].toLocaleLowerCase().startsWith(query)) {
    return 0;
  }

  if (
    category.id.toLocaleLowerCase().startsWith(query) ||
    category.labels.en.toLocaleLowerCase().startsWith(query) ||
    category.labels.uk.toLocaleLowerCase().startsWith(query)
  ) {
    return 1;
  }

  return 2;
}
