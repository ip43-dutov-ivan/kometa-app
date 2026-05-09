import { setupI18n } from "@lingui/core";
import { compileMessage } from "@lingui/message-utils/compileMessage";
import { defaultLocale, type Locale } from "./locales";
import { messagesByLocale } from "./messages";

export function createI18n(locale: Locale = defaultLocale) {
  const i18n = setupI18n();

  i18n.setMessagesCompiler(compileMessage);
  i18n.load(locale, messagesByLocale[locale]);
  i18n.activate(locale);

  return i18n;
}

export const defaultI18n = createI18n();

export function t(id: string): string {
  return defaultI18n._(id);
}
