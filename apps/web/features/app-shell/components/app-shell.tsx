"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  Compass,
  Inbox,
  LogOut,
  Menu,
  MessageSquare,
  UserRound,
  UsersRound,
} from "lucide-react";
import { kometaApi } from "@/shared/api/client";
import { LoadingState } from "@/shared/components/page-state";
import { useKometaSession } from "@/shared/session/use-kometa-session";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { hasHydrated, isAuthenticated, user, clearSession } = useKometaSession();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated, router]);

  async function logout() {
    try {
      await kometaApi.auth.logout();
    } finally {
      clearSession();
      router.replace("/login");
    }
  }

  if (!hasHydrated || !isAuthenticated) {
    return <LoadingState label="Checking session" />;
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const allDesktopNavItems = [...primaryNavItems, ...secondaryNavItems];
  const isMenuActive = secondaryNavItems.some((item) => isActive(item.href));

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r bg-background/95 lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b px-5">
          <Link href="/app/tasks" className="font-heading text-xl font-semibold">
            Kometa
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
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="border-t p-3">
          <div className="mb-3 min-w-0 px-3">
            <div className="truncate text-sm font-medium">{user?.name}</div>
          </div>
          <Button variant="outline" className="w-full justify-start" onClick={logout}>
            <LogOut />
            Log out
          </Button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur lg:hidden">
          <div className="flex min-h-14 items-center justify-between gap-3 px-4">
            <Link href="/app/tasks" className="font-heading text-lg font-semibold">
              Kometa
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
                  "h-14 flex-col gap-1 px-1 text-xs",
                  isActive(item.href) && "bg-accent text-accent-foreground",
                )}
              >
                <Link href={item.href}>
                  <item.icon />
                  {item.label}
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
                Menu
              </Button>
            </SheetTrigger>
          </nav>

          <SheetContent side="bottom" className="rounded-t-lg pb-8">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription>More places and account actions.</SheetDescription>
            </SheetHeader>
            <div className="grid gap-2 px-4">
              {secondaryNavItems.map((item) => (
                <SheetClose key={item.href} asChild>
                  <Button
                    variant={isActive(item.href) ? "secondary" : "ghost"}
                    className="h-11 justify-start"
                    asChild
                  >
                    <Link href={item.href}>
                      <item.icon />
                      {item.label}
                    </Link>
                  </Button>
                </SheetClose>
              ))}
              <Button variant="outline" className="mt-2 h-11 justify-start" onClick={logout}>
                <LogOut />
                Log out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
