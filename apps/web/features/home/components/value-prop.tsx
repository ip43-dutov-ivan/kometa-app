import { t } from "@kometa/i18n";
import { Check, X } from "lucide-react";

const comparisons = [
  {
    feature: "Complex portfolios required",
    kometa: false,
    traditional: true,
  },
  {
    feature: "Perfect for micro-tasks",
    kometa: true,
    traditional: false,
  },
  {
    feature: "One unified account",
    kometa: true,
    traditional: false,
  },
  {
    feature: "Post AND complete tasks",
    kometa: true,
    traditional: false,
  },
  {
    feature: "Local community focus",
    kometa: true,
    traditional: false,
  },
  {
    feature: "Heavy platform fees",
    kometa: false,
    traditional: true,
  },
];

export function ValuePropSection() {
  return (
    <section id="manifesto" className="py-24 px-4 bg-card/50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
            {t("Not another freelance platform")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-pretty">
            {t(
              "Traditional platforms are built for long-term gigs and professional portfolios. Kometa is built for quick help between neighbors.",
            )}
          </p>
        </div>

        {/* Comparison table */}
        <div className="rounded-3xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-3 gap-4 p-4 sm:p-6 border-b border-border bg-secondary/50">
            <div className="text-sm font-medium text-muted-foreground">{t("Feature")}</div>
            <div className="text-center">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                {t("Kometa")}
              </span>
            </div>
            <div className="text-center">
              <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
                {t("Traditional")}
              </span>
            </div>
          </div>

          {/* Rows */}
          {comparisons.map((row, index) => (
            <div
              key={row.feature}
              className={`grid grid-cols-3 gap-4 p-4 sm:p-6 items-center ${
                index !== comparisons.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="text-sm text-foreground">{t(row.feature)}</div>
              <div className="flex justify-center">
                {row.kometa ? (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex justify-center">
                {row.traditional ? (
                  <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-destructive" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
