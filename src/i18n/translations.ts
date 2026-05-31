import en from "./locales/en.json";
import sr from "./locales/sr.json";
import type { Language } from "./types";

type Dictionary = typeof en;

export const dictionaries: Record<Language, Dictionary> = { en, sr };

export function translate(dictionary: Dictionary, key: string) {
  const value = key
    .split(".")
    .reduce<unknown>(
      (current, segment) =>
        current && typeof current === "object"
          ? (current as Record<string, unknown>)[segment]
          : undefined,
      dictionary,
    );

  return typeof value === "string" ? value : key;
}
