"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { t } from "@kometa/i18n";
import {
  Check,
  ChevronDown,
  ClipboardList,
  Compass,
  Inbox,
  Languages,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Sun,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useTheme } from "next-themes";
import type { Locale } from "@kometa/i18n";
import { buildOwnTasksQuery, chatRealtimeStore, selectTotalUnreadChatCount } from "@kometa/logic";
import { useStore } from "zustand";
import { kometaApi } from "@/shared/api/client";
import { LoadingState } from "@/shared/components/page-state";
import { useKometaLocale } from "@/shared/i18n/i18n-provider";
import { useKometaSession } from "@/shared/session/use-kometa-session";
import { ConversationRealtimeProvider } from "@/features/conversations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const primaryNavItems = [
  { href: "/app/tasks", label: "Discover", icon: Compass },
  { href: "/app/my-tasks", label: "My tasks", icon: ClipboardList },
  { href: "/app/conversations", label: "Chat", icon: MessageSquare },
];

const secondaryNavItems = [
  { href: "/app/my-responses", label: "Responses", icon: Inbox },
  { href: "/app/matches", label: "Matches", icon: UsersRound },
  { href: "/app/profile", label: "Profile", icon: UserRound },
];

const localeOptions: Array<{ value: Locale; label: string; shortLabel: string }> = [
  { value: "en", label: "English", shortLabel: "EN" },
  { value: "uk", label: "Ukrainian", shortLabel: "UK" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingOwnerResponseCount, setPendingOwnerResponseCount] = useState(0);
  const { hasHydrated, isAuthenticated, user, clearSession } = useKometaSession();
  const totalUnreadChatCount = useStore(chatRealtimeStore, selectTotalUnreadChatCount);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) {
      setPendingOwnerResponseCount(0);
      return;
    }

    let isActive = true;

    async function loadPendingOwnerResponses() {
      try {
        const ownTasks = await kometaApi.tasks.list(buildOwnTasksQuery());
        const openTasks = ownTasks.items.filter((task) => task.status === "open");
        const responseLists = await Promise.all(
          openTasks.map((task) =>
            kometaApi.tasks
              .listResponses(task.id, { status: "pending", limit: 1 })
              .catch(() => ({ pageInfo: { total: 0 } })),
          ),
        );
        const nextCount = responseLists.reduce(
          (total, responseList) => total + responseList.pageInfo.total,
          0,
        );

        if (isActive) {
          setPendingOwnerResponseCount(nextCount);
        }
      } catch {
        if (isActive) {
          setPendingOwnerResponseCount(0);
        }
      }
    }

    loadPendingOwnerResponses();

    return () => {
      isActive = false;
    };
  }, [hasHydrated, isAuthenticated, pathname]);

  async function logout() {
    try {
      await kometaApi.auth.logout();
    } finally {
      clearSession();
      router.replace("/login");
    }
  }

  if (!hasHydrated || !isAuthenticated) {
    return <LoadingState label={t("Checking session")} />;
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const allDesktopNavItems = [...primaryNavItems, ...secondaryNavItems];
  const isMenuActive = secondaryNavItems.some((item) => isActive(item.href));

  return (
    <ConversationRealtimeProvider>
      <div className="min-h-screen bg-background lg:grid lg:grid-cols-[240px_1fr]">
        <aside className="sticky top-0 hidden h-screen border-r bg-background/95 lg:flex lg:flex-col">
          <div className="flex h-16 items-center border-b px-5">
            <Link href="/app/tasks" className="font-heading text-xl font-semibold">
              {t("Kometa")}
            </Link>
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {allDesktopNavItems.map((item) => (
              <Button
                key={item.href}
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className="h-10 justify-start px-3"
                asChild
              >
                <Link href={item.href}>
                  <item.icon />
                  <span className="min-w-0 flex-1 truncate text-left">{t(item.label)}</span>
                  {item.href === "/app/my-tasks" && pendingOwnerResponseCount ? (
                    <Badge variant="default" className="ml-auto h-5 min-w-5 px-1.5">
                      {pendingOwnerResponseCount}
                    </Badge>
                  ) : null}
                  {item.href === "/app/conversations" && totalUnreadChatCount ? (
                    <Badge variant="default" className="ml-auto h-5 min-w-5 px-1.5">
                      {totalUnreadChatCount}
                    </Badge>
                  ) : null}
                </Link>
              </Button>
            ))}
          </nav>
          <div className="border-t p-3">
            <ThemeSwitch id="desktop-theme-switch" className="mb-3" />
            <LocaleSwitch className="mb-3" />
            <div className="mb-3 min-w-0 px-3">
              <div className="truncate text-sm font-medium">{user?.name}</div>
            </div>
            <Button variant="outline" className="w-full justify-start" onClick={logout}>
              <LogOut />
              {t("Log out")}
            </Button>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur lg:hidden">
            <div className="flex min-h-14 items-center justify-between gap-3 px-4">
              <Link href="/app/tasks" className="font-heading text-lg font-semibold">
                {t("Kometa")}
              </Link>
              <span className="max-w-44 truncate text-sm text-muted-foreground">{user?.name}</span>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 lg:pb-6">{children}</main>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-background/95 px-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden">
              {primaryNavItems.map((item) => (
                <Button
                  key={item.href}
                  variant="ghost"
                  asChild
                  className={cn(
                    "relative h-14 flex-col gap-1 px-1 text-xs",
                    isActive(item.href) && "bg-accent text-accent-foreground",
                  )}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span className="leading-none">{t(item.label)}</span>
                    {item.href === "/app/my-tasks" && pendingOwnerResponseCount ? (
                      <Badge className="absolute right-1 top-1 h-5 min-w-5 px-1 text-[0.625rem]">
                        {pendingOwnerResponseCount}
                      </Badge>
                    ) : null}
                    {item.href === "/app/conversations" && totalUnreadChatCount ? (
                      <Badge className="absolute right-1 top-1 h-5 min-w-5 px-1 text-[0.625rem]">
                        {totalUnreadChatCount}
                      </Badge>
                    ) : null}
                  </Link>
                </Button>
              ))}
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-14 flex-col gap-1 px-1 text-xs",
                    isMenuActive && "bg-accent text-accent-foreground",
                  )}
                >
                  <Menu />
                  {t("Menu")}
                </Button>
              </SheetTrigger>
            </nav>

            <SheetContent side="bottom" className="rounded-t-lg pb-8">
              <SheetHeader>
                <SheetTitle>{t("Menu")}</SheetTitle>
                <SheetDescription>{t("More places and account actions.")}</SheetDescription>
              </SheetHeader>
              <div className="grid gap-2 px-4">
                <ThemeSwitch id="mobile-theme-switch" className="mb-1" />
                <LocaleSwitch className="mb-1" />
                {secondaryNavItems.map((item) => (
                  <SheetClose key={item.href} asChild>
                    <Button
                      variant={isActive(item.href) ? "secondary" : "ghost"}
                      className="h-11 justify-start"
                      asChild
                    >
                      <Link href={item.href}>
                        <item.icon />
                        {t(item.label)}
                      </Link>
                    </Button>
                  </SheetClose>
                ))}
                <Button variant="outline" className="mt-2 h-11 justify-start" onClick={logout}>
                  <LogOut />
                  {t("Log out")}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <Toaster closeButton position="top-right" />
      </div>
    </ConversationRealtimeProvider>
  );
}

function LocaleSwitch({ className }: { className?: string }) {
  const { locale, setLocale } = useKometaLocale();
  const selectedLocale =
    localeOptions.find((option) => option.value === locale) ?? localeOptions[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("h-11 w-full justify-between px-3", className)}>
          <span className="flex min-w-0 items-center gap-2">
            <Languages className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{t("Language")}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
            <span>{selectedLocale.shortLabel}</span>
            <ChevronDown className="size-4" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
        {localeOptions.map((option) => {
          const isSelected = locale === option.value;

          return (
            <DropdownMenuItem key={option.value} onSelect={() => setLocale(option.value)}>
              <span className="min-w-0 flex-1 truncate">{t(option.label)}</span>
              {isSelected ? <Check className="size-4" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeSwitch({ id, className }: { id: string; className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <div
      className={cn(
        "flex h-11 items-center justify-between gap-3 rounded-md border bg-background px-3",
        className,
      )}
    >
      <Label htmlFor={id} className="min-w-0 gap-2">
        {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
        <span className="truncate">
          {isDark ? t("Dark") : t("Light")} {t("theme")}
        </span>
      </Label>
      <Switch
        id={id}
        checked={isDark}
        aria-label={t("Toggle dark theme")}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      />
    </div>
  );
}
