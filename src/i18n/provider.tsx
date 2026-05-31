import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createI18nValue, I18nContext } from "./context";
import type { Language } from "./types";

const STORAGE_KEY = "master-language";

function getInitialLanguage() {
  const savedLanguage = localStorage.getItem(STORAGE_KEY);

  if (savedLanguage === "en" || savedLanguage === "sr") {
    return savedLanguage;
  }

  return navigator.language.toLowerCase().startsWith("sr") ? "sr" : "en";
}

type Props = {
  children: ReactNode;
};

export function I18nProvider({ children }: Props) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const value = useMemo(
    () => createI18nValue(language, setLanguage),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
