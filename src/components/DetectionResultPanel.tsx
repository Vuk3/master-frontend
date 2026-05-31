import { useI18n } from "../i18n/use-i18n";
import type { DetectResponse } from "../api/types";
import ImageWithDetections from "./ImageWithDetection";

type ServiceKey = "python" | "dotnet";
type RunStatus = "idle" | "loading" | "success" | "error";

type Props = {
  service: ServiceKey;
  title: string;
  imageUrl: string | null;
  result: DetectResponse | null;
  status: RunStatus;
  durationMs: number | null;
  error: string | null;
};

const accents = {
  python: "#0891b2",
  dotnet: "#059669",
};

const modelInputFallbackSize = 640;

function formatDuration(durationMs: number | null) {
  if (durationMs === null) return "-";
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`;
  return `${(durationMs / 1000).toFixed(2)} s`;
}

function formatScore(score: number) {
  return `${Math.round(score * 100)}%`;
}

export default function DetectionResultPanel({
  service,
  title,
  imageUrl,
  result,
  status,
  durationMs,
  error,
}: Props) {
  const { t } = useI18n();
  const detections = result?.detections ?? [];
  const hasResult = status === "success" && Boolean(result);
  const imageWidth = result?.imageWidth ?? modelInputFallbackSize;
  const imageHeight = result?.imageHeight ?? modelInputFallbackSize;

  return (
    <article className="result-card" data-service={service}>
      <div className="result-card__header">
        <div>
          <span className="eyebrow">{t(`services.${service}`)}</span>
          <h2>{title}</h2>
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
          <strong>{detections.length}</strong>
        </div>
        <div className="metric">
          <span>{t("metrics.model")}</span>
          <strong>{result?.model ?? "-"}</strong>
        </div>
        <div className="metric">
          <span>{t("metrics.inputSize")}</span>
          <strong>{`${imageWidth}x${imageHeight}`}</strong>
        </div>
      </div>

      <div className="result-card__content">
        <div className="result-image">
          {imageUrl ? (
            <ImageWithDetections
              accent={accents[service]}
              detections={detections}
              imageHeight={imageHeight}
              imageUrl={imageUrl}
              imageWidth={imageWidth}
            />
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
                <li
                  className="detection-item"
                  key={`${detection.label}-${index}`}
                >
                  <span className="detection-index">{index + 1}</span>
                  <span className="detection-label">{detection.label}</span>
                  <span className="detection-score">
                    {formatScore(detection.score)}
                  </span>
                  <span className="detection-confidence" aria-hidden="true">
                    <span style={{ width: `${detection.score * 100}%` }} />
                  </span>
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
