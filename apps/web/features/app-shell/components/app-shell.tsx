"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, Compass, Home, LogOut, UserRound } from "lucide-react";
import { kometaApi } from "@/shared/api/client";
import { LoadingState } from "@/shared/components/page-state";
import { useKometaSession } from "@/shared/session/use-kometa-session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/tasks", label: "Discover", icon: Compass },
  { href: "/app/my-tasks", label: "My tasks", icon: ClipboardList },
  { href: "/app/profile", label: "Profile", icon: UserRound },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center gap-3 px-4">
          <Link href="/app" className="font-heading text-xl font-semibold">
            Kometa
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Button key={item.href} variant="ghost" size="sm" asChild>
                <Link
                  href={item.href}
                  className={cn(pathname === item.href && "bg-accent text-accent-foreground")}
                >
                  <item.icon />
                  {item.label}
                </Link>
              </Button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden max-w-40 truncate text-sm text-muted-foreground sm:block">
              {user?.name}
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut />
              Log out
            </Button>
          </div>
        </div>
        <nav className="mx-auto grid w-full max-w-6xl grid-cols-4 gap-1 px-2 pb-2 md:hidden">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? "secondary" : "ghost"}
              asChild
            >
              <Link href={item.href} className="flex-col gap-1 py-2 text-xs">
                <item.icon />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
