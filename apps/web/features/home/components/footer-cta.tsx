"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2 } from "lucide-react";
import { BrandLockup } from "./brand-lockup";

export function FooterCTA() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setIsSubmitted(true);
    setEmail("");
  };

  return (
    <section className="py-24 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
          Ready to join the community?
        </h2>
        <p className="text-muted-foreground mb-10 text-pretty">
          Be the first to know when Kometa launches in your area. Early members get priority access
          and zero fees for the first month.
        </p>

        {isSubmitted ? (
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/10 border border-primary/30 text-primary">
            <span className="font-medium">{"You're on the list!"}</span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-full px-5 bg-card border-border focus-visible:border-primary text-foreground placeholder:text-muted-foreground"
              required
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="h-12 rounded-full px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Join Waitlist
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* Footer links */}
        <div className="mt-20 pt-10 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <BrandLockup />
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Contact
              </a>
            </div>
            <span className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Kometa. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
