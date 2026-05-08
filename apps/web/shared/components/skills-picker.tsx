"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { t } from "@kometa/i18n";
import { Badge } from "@/components/ui/badge";
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

const PREDEFINED_SKILLS = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "Go",
  "Rust",
  "C++",
  "C#",
  "PHP",
  "Ruby",
  "Swift",
  "Kotlin",
  "React",
  "Vue",
  "Angular",
  "Next.js",
  "HTML",
  "CSS",
  "Node.js",
  "Django",
  "Spring",
  "Laravel",
  "FastAPI",
  "Express",
  "iOS",
  "Android",
  "Flutter",
  "React Native",
  "UI/UX Design",
  "Graphic Design",
  "Figma",
  "Product Design",
  "Data Science",
  "Machine Learning",
  "AI",
  "SQL",
  "PostgreSQL",
  "MongoDB",
  "DevOps",
  "Docker",
  "Kubernetes",
  "AWS",
  "Git",
  "Project Management",
  "Agile",
  "Scrum",
  "Content Writing",
  "Technical Writing",
  "Photography",
  "Videography",
  "Video Editing",
  "Translation",
  "Marketing",
  "SEO",
  "Accounting",
  "Teaching",
  "Tutoring",
];

interface SkillsPickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function SkillsPicker({ value, onChange, disabled }: SkillsPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  function addSkill(skill: string) {
    const trimmed = skill.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setQuery("");
  }

  function removeSkill(skill: string) {
    onChange(value.filter((s) => s !== skill));
  }

  const filtered = PREDEFINED_SKILLS.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(query.toLowerCase()),
  );

  const trimmedQuery = query.trim();
  const showAddCustom =
    trimmedQuery.length > 0 &&
    !value.includes(trimmedQuery) &&
    !PREDEFINED_SKILLS.some((s) => s.toLowerCase() === trimmedQuery.toLowerCase());

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((skill) => (
            <Badge
              key={skill}
              variant="secondary"
              className="gap-1 pr-1 text-sm font-normal transition-colors has-focus-visible:border-primary/30 has-focus-visible:bg-primary/15 has-focus-visible:text-primary"
            >
              {skill}
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeSkill(skill)}
                aria-label={`Remove ${skill}`}
                className="ml-0.5 opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus-visible:opacity-100 disabled:pointer-events-none"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal text-muted-foreground"
          >
            {t("Search skills...")}
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0"
          style={{ width: "var(--radix-popper-anchor-width)" }}
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t("Search skills...")}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {filtered.length === 0 && !showAddCustom && (
                <CommandEmpty>{t("No skills found.")}</CommandEmpty>
              )}
              <CommandGroup>
                {showAddCustom && (
                  <CommandItem
                    value={`__add__${trimmedQuery}`}
                    onSelect={() => {
                      addSkill(trimmedQuery);
                      setOpen(false);
                    }}
                  >
                    <Check className="size-4 opacity-0" />
                    {`Add "${trimmedQuery}"`}
                  </CommandItem>
                )}
                {filtered.map((skill) => (
                  <CommandItem
                    key={skill}
                    value={skill}
                    onSelect={() => {
                      addSkill(skill);
                    }}
                  >
                    <Check className="size-4 opacity-0" />
                    {skill}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
