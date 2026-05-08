"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { I18nProvider } from "@lingui/react";
import { defaultI18n, defaultLocale, isLocale, messagesByLocale, type Locale } from "@kometa/i18n";

const LOCALE_STORAGE_KEY = "kometa-locale";

interface KometaLocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const KometaLocaleContext = createContext<KometaLocaleContextValue | null>(null);

export function KometaI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  const activateLocale = useCallback((nextLocale: Locale) => {
    defaultI18n.load(nextLocale, messagesByLocale[nextLocale]);
    defaultI18n.activate(nextLocale);
    document.documentElement.lang = nextLocale;
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    setLocaleState(nextLocale);
  }, []);

  useEffect(() => {
    const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (storedLocale && isLocale(storedLocale)) {
      activateLocale(storedLocale);
    }
  }, [activateLocale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale: activateLocale,
    }),
    [activateLocale, locale],
  );

  return (
    <KometaLocaleContext.Provider value={value}>
      <I18nProvider i18n={defaultI18n}>
        <div key={locale} className="contents">
          {children}
        </div>
      </I18nProvider>
    </KometaLocaleContext.Provider>
  );
}

export function useKometaLocale() {
  const context = useContext(KometaLocaleContext);

  if (!context) {
    throw new Error("useKometaLocale must be used within KometaI18nProvider");
  }

  return context;
}
