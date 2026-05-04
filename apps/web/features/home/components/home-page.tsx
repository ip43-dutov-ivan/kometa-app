import { FooterCTA } from "./footer-cta";
import { HeroSection } from "./hero-section";
import { HowItWorksSection } from "./how-it-works";
import { Navbar } from "./navbar";
import { TaskTicker } from "./task-ticker";
import { ValuePropSection } from "./value-prop";

export function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <TaskTicker />
      <ValuePropSection />
      <FooterCTA />
    </main>
  );
}
