import type { Messages } from "@lingui/core";
import { messages as en } from "./en";
import { messages as uk } from "./uk";
import type { Locale } from "../locales";

export const messagesByLocale: Record<Locale, Messages> = {
  en,
  uk,
};
