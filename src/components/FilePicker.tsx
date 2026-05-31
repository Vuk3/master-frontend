import { useId, type Dispatch, type SetStateAction } from "react";
import { useI18n } from "../i18n/use-i18n";

type Props = {
  onPick: Dispatch<SetStateAction<File | null>>;
  file: File | null;
};

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function FilePicker({ onPick, file }: Props) {
  const { t } = useI18n();
  const inputId = useId();

  return (
    <div className="file-picker">
      <div className="field-label">{t("filePicker.label")}</div>
      <input
        id={inputId}
        className="file-picker__input"
        type="file"
        accept="image/*"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <label className="file-picker__dropzone" htmlFor={inputId}>
        <span className="file-picker__icon">+</span>
        <span className="file-picker__text">
          <strong>{file ? file.name : t("filePicker.button")}</strong>
          <span>
            {file ? formatFileSize(file.size) : t("filePicker.empty")}
          </span>
        </span>
        <span className="file-picker__hint">{t("filePicker.hint")}</span>
      </label>
    </div>
  );
}
