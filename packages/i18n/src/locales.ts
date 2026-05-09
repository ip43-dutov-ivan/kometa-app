export const defaultLocale = "en";

export const locales = [defaultLocale, "uk"] as const;

export type Locale = (typeof locales)[number];

export function isLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
