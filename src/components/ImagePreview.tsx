import { useEffect, useMemo } from "react";
import { useI18n } from "../i18n/use-i18n";

type Props = {
  file: File | null;
};

export default function ImagePreview({ file }: Props) {
  const { t } = useI18n();
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  if (!file || !url) {
    return (
      <div style={{ padding: 16, border: "1px dashed #999", borderRadius: 8 }}>
        {t("imagePreview.empty")}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontWeight: 600 }}>{file.name}</div>
      <img
        src={url}
        alt={t("imagePreview.alt")}
        style={{
          maxWidth: 520,
          width: "100%",
          borderRadius: 12,
          border: "1px solid #ddd",
        }}
      />
    </div>
  );
}
