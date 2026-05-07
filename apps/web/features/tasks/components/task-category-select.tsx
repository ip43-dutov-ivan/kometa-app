"use client";

import {
  getTaskCategoryLabel,
  normalizeTaskCategoryId,
  searchTaskCategories,
  TASK_CATEGORIES,
  type TaskCategory,
} from "@kometa/logic";
import { SearchSelect } from "@/shared/components/search-select";

const TASK_CATEGORY_LOCALE = "en";

interface TaskCategorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  name?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

export function TaskCategorySelect({
  value,
  onValueChange,
  name,
  placeholder = "Select category",
  searchPlaceholder = "Search categories...",
  emptyMessage = "No category found.",
  disabled = false,
}: TaskCategorySelectProps) {
  const normalizedValue = value ? normalizeTaskCategoryId(value) : "";

  return (
    <>
      {name ? <input type="hidden" name={name} value={normalizedValue} /> : null}
      <SearchSelect<TaskCategory>
        value={normalizedValue}
        items={TASK_CATEGORIES}
        searchItems={(query) => searchTaskCategories(query, TASK_CATEGORY_LOCALE)}
        onValueChange={(nextValue) => onValueChange(nextValue)}
        getItemValue={(item) => item.id}
        getItemLabel={(item) => getTaskCategoryLabel(item.id, TASK_CATEGORY_LOCALE)}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
        disabled={disabled}
      />
    </>
  );
}
