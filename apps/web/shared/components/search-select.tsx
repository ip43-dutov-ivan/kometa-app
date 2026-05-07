"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface SearchSelectProps<TItem> {
  value: string;
  items?: readonly TItem[];
  searchItems?: (query: string) => TItem[];
  onValueChange: (value: string, item: TItem) => void;
  getItemValue: (item: TItem) => string;
  getItemLabel: (item: TItem) => string;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  className?: string;
}

export function SearchSelect<TItem>({
  value,
  items,
  searchItems,
  onValueChange,
  getItemValue,
  getItemLabel,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled = false,
  className,
}: SearchSelectProps<TItem>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const visibleItems = useMemo(() => {
    return searchItems ? searchItems(query) : [...(items ?? [])];
  }, [items, query, searchItems]);

  const selectedItem = useMemo(() => {
    const candidates = items ?? visibleItems;
    return candidates.find((item) => getItemValue(item) === value);
  }, [getItemValue, items, value, visibleItems]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("group w-full justify-between px-3 font-normal", className)}
        >
          <span
            className={cn(
              "truncate",
              !selectedItem &&
                "text-muted-foreground group-hover:text-black group-focus-visible:text-black",
            )}
          >
            {selectedItem ? getItemLabel(selectedItem) : placeholder}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {visibleItems.map((item) => {
                const itemValue = getItemValue(item);

                return (
                  <CommandItem
                    key={itemValue}
                    value={itemValue}
                    onSelect={() => {
                      onValueChange(itemValue, item);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <Check className={cn("opacity-0", itemValue === value && "opacity-100")} />
                    {getItemLabel(item)}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
