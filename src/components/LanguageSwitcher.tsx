import { useI18n } from "../i18n/use-i18n";
import type { Language } from "../i18n/types";

const languages: Language[] = ["en", "sr"];

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="language-switcher" aria-label={t("language.label")}>
      <span>{t("language.label")}</span>
      <div className="language-switcher__options">
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
