import { createContext, type Dispatch, type SetStateAction } from "react";
import { dictionaries, translate } from "./translations";
import type { Language } from "./types";

export function createI18nValue(
  language: Language,
  setLanguage: Dispatch<SetStateAction<Language>>,
) {
  return {
    language,
    setLanguage,
    t: (key: string) => translate(dictionaries[language], key),
  };
}

export const I18nContext = createContext<ReturnType<
  typeof createI18nValue
> | null>(null);
