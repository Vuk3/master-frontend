import { useI18n } from "../i18n/use-i18n";
import type { Language } from "../i18n/types";

const languages: Language[] = ["en", "sr"];

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="language-switcher" aria-label={t("language.label")}>
      <span className="language-switcher__icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18" />
        </svg>
      </span>
      <div className="language-switcher__options" role="group">
        {languages.map((code) => (
          <button
            className="language-switcher__option"
            data-active={language === code}
            key={code}
            onClick={() => setLanguage(code)}
            type="button"
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
