import { MessageCircle, PlusCircle, Star, Users } from "lucide-react";

const steps = [
  {
    icon: PlusCircle,
    title: "Create Request",
    description: "Post what you need help with in seconds",
  },
  {
    icon: Users,
    title: "Get Matched",
    description: "Nearby helpers see your task instantly",
  },
  {
    icon: MessageCircle,
    title: "Unlock Chat",
    description: "Connect and coordinate the details",
  },
  {
    icon: Star,
    title: "Build Reputation",
    description: "Earn trust through completed tasks",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">How it works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-pretty">
            From request to completion in four simple steps. No barriers, no complexity.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <div key={step.title} className="relative group">
              {/* Connector line for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-border to-transparent" />
              )}

              <div className="flex flex-col items-center text-center p-6 rounded-3xl bg-card border border-border hover:border-primary/30 transition-colors">
                {/* Step number */}
                <div className="absolute -top-3 left-6 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>

                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
