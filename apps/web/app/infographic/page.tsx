import type { Metadata } from "next";
import { KometaInfographicPage } from "@/features/infographic";

export const metadata: Metadata = {
  title: "Kometa MVP Infographic",
  description: "Kometa MVP delivery infographic.",
};

export default function Page() {
  return <KometaInfographicPage />;
}
