import { isLocale } from "@kometa/i18n";

export function getMapboxLanguage(locale: string): string {
  return isLocale(locale) ? locale : "en";
}
