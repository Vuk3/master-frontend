import { useEffect, useState } from "react";
import { useI18n } from "../i18n/use-i18n";

type ThemeMode = "light" | "dark";

const themeStorageKey = "master-theme";

function getInitialTheme(): ThemeMode {
  try {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    return storedTheme === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export default function ThemeToggle() {
  const { t } = useI18n();
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const isDark = theme === "dark";
  const label = isDark ? t("theme.switchToLight") : t("theme.switchToDark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    try {
      window.localStorage.setItem(themeStorageKey, theme);
    } catch {
      // Theme persistence is optional; the visual state still updates.
    }
  }, [theme]);

  return (
    <button
      aria-label={label}
      aria-pressed={isDark}
      className="icon-button theme-toggle"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={label}
      type="button"
    >
      {isDark ? (
        <svg
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M12 3a6.7 6.7 0 0 0 8.8 8.8 8 8 0 1 1-8.8-8.8" />
        </svg>
      )}
    </button>
  );
}
