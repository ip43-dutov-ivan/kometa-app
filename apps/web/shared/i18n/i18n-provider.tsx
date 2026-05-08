"use client";

import { I18nProvider } from "@lingui/react";
import { defaultI18n } from "@kometa/i18n";

export function KometaI18nProvider({ children }: { children: React.ReactNode }) {
  return <I18nProvider i18n={defaultI18n}>{children}</I18nProvider>;
}
