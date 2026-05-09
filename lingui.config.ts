import type { LinguiConfig } from "@lingui/conf";

const config: LinguiConfig = {
  sourceLocale: "en",
  locales: ["en"],
  catalogs: [
    {
      path: "packages/i18n/src/locales/{locale}/messages",
      include: ["apps/web", "apps/mobile", "packages/i18n/src"],
    },
  ],
};

export default config;
