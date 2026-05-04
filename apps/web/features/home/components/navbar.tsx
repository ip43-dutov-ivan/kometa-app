"use client";

import { Button } from "@/components/ui/button";
import { BrandLockup } from "./brand-lockup";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <BrandLockup />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How it works
            </a>
            <a
              href="#manifesto"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Manifesto
            </a>
          </div>

          {/* CTA Button */}
          <Button
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-6"
            size="sm"
          >
            Join Beta
          </Button>
        </div>
      </div>
    </nav>
  );
}
