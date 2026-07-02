import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useI18n } from "../i18n/use-i18n";
import type { DetectResponse, Detection } from "../api/types";
import ImageWithDetections from "./ImageWithDetection";
import { getDetectionColor } from "../utils/detection-colors";

type ServiceKey = "python" | "dotnet";
type RunStatus = "idle" | "loading" | "success" | "error";

type Props = {
  service: ServiceKey;
  title: string;
  imageUrl: string | null;
  result: DetectResponse | null;
  detections: Detection[];
  status: RunStatus;
  durationMs: number | null;
  error: string | null;
  threshold: number;
};

function formatDuration(durationMs: number | null) {
  if (durationMs === null) return "-";
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`;
  return `${(durationMs / 1000).toFixed(2)} s`;
}

function formatScore(score: number) {
  return `${Math.round(score * 100)}%`;
}

function formatAnnotationType(annotationType: string | null | undefined) {
  if (!annotationType) return null;
  return annotationType.replace(/[-_]/g, " ");
}

function formatModelName(service: ServiceKey, model: string | null | undefined) {
  if (!model) return "-";

  if (service === "dotnet" && model.includes("ML.NET")) {
    return "ML.NET";
  }

  return model;
}

export default function DetectionResultPanel({
  service,
  title,
  imageUrl,
  result,
  detections,
  status,
  durationMs,
  error,
  threshold,
}: Props) {
  const { t } = useI18n();
  const [selectedDetectionIndex, setSelectedDetectionIndex] = useState<
    number | null
  >(null);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showFill, setShowFill] = useState(true);
  const [onlySelected, setOnlySelected] = useState(false);

  const hasResult = status === "success" && Boolean(result);
  const imageSize =
    result &&
    Number.isFinite(result.imageWidth) &&
    Number.isFinite(result.imageHeight) &&
    Number(result.imageWidth) > 0 &&
    Number(result.imageHeight) > 0
      ? {
          width: Number(result.imageWidth),
          height: Number(result.imageHeight),
        }
      : null;
  const rawDetectionCount = result?.detections.length ?? 0;
  const hasHiddenDetections = rawDetectionCount > detections.length;

  const statusDetail = useMemo(() => {
    if (status === "loading") return t("runDetails.loading");
    if (status === "error") return t("runDetails.failed");
    if (status === "success") {
      return `${t("runDetails.done")} ${formatDuration(durationMs)}`;
    }
    return t("runDetails.idle");
  }, [durationMs, status, t]);

  useEffect(() => {
    setSelectedDetectionIndex(null);
  }, [detections.length, result, threshold]);

  function toggleOnlySelected() {
    const nextValue = !onlySelected;
    if (nextValue && selectedDetectionIndex === null && detections.length > 0) {
      setSelectedDetectionIndex(0);
    }
    setOnlySelected(nextValue);
  }

  return (
    <article className="result-card" data-service={service}>
      <div className="result-card__header">
        <div>
          <span className="eyebrow">{t(`services.${service}`)}</span>
          <h2>{title}</h2>
          <p className="run-detail">{statusDetail}</p>
        </div>
        <span className="run-status" data-status={status}>
          {t(`status.${status}`)}
        </span>
      </div>

      <div className="result-metrics" aria-label={t("metrics.title")}>
        <div className="metric">
          <span>{t("metrics.duration")}</span>
          <strong>{formatDuration(durationMs)}</strong>
        </div>
        <div className="metric">
          <span>{t("metrics.detections")}</span>
          <strong>
            {hasHiddenDetections
              ? `${detections.length}/${rawDetectionCount}`
              : detections.length}
          </strong>
        </div>
        <div className="metric">
          <span>{t("metrics.model")}</span>
          <strong>{formatModelName(service, result?.model)}</strong>
          {result?.annotationType ? (
            <small>{formatAnnotationType(result.annotationType)}</small>
          ) : null}
        </div>
        <div className="metric">
          <span>{t("metrics.inputSize")}</span>
          <strong>
            {imageSize ? `${imageSize.width}x${imageSize.height}` : "-"}
          </strong>
        </div>
      </div>

      <div className="result-toolbar" aria-label={t("display.title")}>
        <button
          aria-pressed={showBoxes}
          className="toggle-button"
          onClick={() => setShowBoxes((value) => !value)}
          type="button"
        >
          {t("display.boxes")}
        </button>
        <button
          aria-pressed={showFill}
          className="toggle-button"
          onClick={() => setShowFill((value) => !value)}
          type="button"
        >
          {t("display.fill")}
        </button>
        <button
          aria-pressed={onlySelected}
          className="toggle-button"
          disabled={!detections.length}
          onClick={toggleOnlySelected}
          type="button"
        >
          {t("display.selectedOnly")}
        </button>
      </div>

      <div className="result-card__content">
        <div className="result-image">
          {imageUrl ? (
            imageSize ? (
              <ImageWithDetections
                detections={detections}
                imageHeight={imageSize.height}
                imageUrl={imageUrl}
                imageWidth={imageSize.width}
                onlySelected={onlySelected}
                onSelect={(index) =>
                  setSelectedDetectionIndex((current) =>
                    current === index ? null : index,
                  )
                }
                selectedIndex={selectedDetectionIndex}
                showBoxes={showBoxes}
                showFill={showFill}
              />
            ) : (
              <img
                alt={t("imagePreview.alt")}
                className="result-image__plain"
                src={imageUrl}
              />
            )
          ) : (
            <div className="empty-preview empty-preview--compact">
              <div className="empty-preview__mark">IMG</div>
              <strong>{t("dashboard.emptyImage")}</strong>
            </div>
          )}

          {status === "loading" && (
            <div className="scan-layer" aria-hidden="true">
              <span />
            </div>
          )}
        </div>

        <div className="detections-panel">
          <div className="detections-panel__header">
            <span>{t("detections.title")}</span>
            <strong>{detections.length}</strong>
          </div>

          {error ? (
            <div className="inline-error">{error}</div>
          ) : detections.length ? (
            <ol className="detection-list">
              {detections.map((detection, index) => (
                <li key={`${detection.label}-${index}`}>
                  <button
                    className="detection-item"
                    data-selected={selectedDetectionIndex === index}
                    onClick={() =>
                      setSelectedDetectionIndex((current) =>
                        current === index ? null : index,
                      )
                    }
                    style={
                      {
                        "--detection-color": getDetectionColor(
                          detection.label,
                        ),
                      } as CSSProperties
                    }
                    type="button"
                  >
                    <span className="detection-index">{index + 1}</span>
                    <span className="detection-label">{detection.label}</span>
                    <span className="detection-score">
                      {formatScore(detection.score)}
                    </span>
                    <span className="detection-confidence" aria-hidden="true">
                      <span style={{ width: `${detection.score * 100}%` }} />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="empty-detections">
              {hasResult ? t("detections.empty") : t("detections.waiting")}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
