import {
  useId,
  useState,
  type DragEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
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
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith("image/")) {
      onPick(dropped);
    }
  }

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
      <label
        className="file-picker__dropzone"
        htmlFor={inputId}
        data-dragging={dragging}
        data-filled={Boolean(file)}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <span className="file-picker__icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
          </svg>
        </span>
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
