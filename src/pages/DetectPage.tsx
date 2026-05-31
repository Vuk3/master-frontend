import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "../api/client";
import { dotnetApi } from "../api/dotnet";
import { gatewayApi } from "../api/gateway";
import { pythonApi } from "../api/python";
import type { DetectResponse, Detection } from "../api/types";
import DetectionResultPanel from "../components/DetectionResultPanel";
import FilePicker from "../components/FilePicker";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useI18n } from "../i18n/use-i18n";

type ServiceKey = "python" | "dotnet";
type HealthKey = "gateway" | ServiceKey;
type RunStatus = "idle" | "loading" | "success" | "error";
type HealthStatus = "idle" | "loading" | "online" | "offline";

type RunState = {
  status: RunStatus;
  data: DetectResponse | null;
  durationMs: number | null;
  error: string | null;
};

type HealthState = {
  status: HealthStatus;
  latencyMs: number | null;
  message: string | null;
};

type ImageInfo = {
  width: number;
  height: number;
};

function createRunState() {
  return {
    status: "idle" as RunStatus,
    data: null,
    durationMs: null,
    error: null,
  };
}

function createRunStates() {
  return {
    python: createRunState(),
    dotnet: createRunState(),
  };
}

function createHealthState() {
  return {
    status: "idle" as HealthStatus,
    latencyMs: null,
    message: null,
  };
}

function createHealthStates() {
  return {
    gateway: createHealthState(),
    python: createHealthState(),
    dotnet: createHealthState(),
  };
}

function formatDuration(durationMs: number | null) {
  if (durationMs === null) return "-";
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`;
  return `${(durationMs / 1000).toFixed(2)} s`;
}

function formatPercent(value: number | null) {
  if (value === null) return "-";
  return `${Math.round(value * 100)}%`;
}

function formatSignedNumber(value: number) {
  if (value === 0) return "0";
  return value > 0 ? `+${value}` : `${value}`;
}

function formatSignedPercent(value: number | null) {
  if (value === null) return "-";
  const rounded = Math.round(value * 100);
  if (rounded === 0) return "0%";
  return rounded > 0 ? `+${rounded}%` : `${rounded}%`;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function getAverageConfidence(detections: Detection[]) {
  if (!detections.length) return null;
  const total = detections.reduce((sum, detection) => sum + detection.score, 0);
  return total / detections.length;
}

function getBestDetection(detections: Detection[]) {
  if (!detections.length) return null;

  return detections.reduce((best, detection) =>
    detection.score > best.score ? detection : best,
  );
}

export default function DetectPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [runs, setRuns] =
    useState<Record<ServiceKey, RunState>>(createRunStates);
  const [healthChecks, setHealthChecks] =
    useState<Record<HealthKey, HealthState>>(createHealthStates);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.25);
  const previewUrlRef = useRef<string | null>(null);

  const isDetecting = Object.values(runs).some(
    (run) => run.status === "loading",
  );
  const isCheckingHealth = Object.values(healthChecks).some(
    (health) => health.status === "loading",
  );
  const canDetect = useMemo(() => !!file && !isDetecting, [file, isDetecting]);
  const hasRunResults = Object.values(runs).some(
    (run) => run.status === "success" || run.status === "error",
  );
  const canClearPredictions = Boolean(file) && hasRunResults && !isDetecting;

  const filteredDetections = useMemo(
    () => ({
      python:
        runs.python.data?.detections.filter(
          (detection) => detection.score >= confidenceThreshold,
        ) ?? [],
      dotnet:
        runs.dotnet.data?.detections.filter(
          (detection) => detection.score >= confidenceThreshold,
        ) ?? [],
    }),
    [confidenceThreshold, runs.dotnet.data, runs.python.data],
  );

  const totalDetections =
    filteredDetections.python.length + filteredDetections.dotnet.length;

  const comparison = useMemo(() => {
    const completed = (["python", "dotnet"] as ServiceKey[])
      .map((service) => ({
        service,
        durationMs: runs[service].durationMs,
      }))
      .filter((item) => item.durationMs !== null);

    if (completed.length < 2) return null;

    const sorted = [...completed].sort(
      (a, b) => Number(a.durationMs) - Number(b.durationMs),
    );
    const fastest = sorted[0];
    const slower = sorted[1];

    return {
      fastestService: fastest.service,
      deltaMs: Number(slower.durationMs) - Number(fastest.durationMs),
    };
  }, [runs]);

  const comparisonSummary = useMemo(() => {
    const pythonAverage = getAverageConfidence(filteredDetections.python);
    const dotnetAverage = getAverageConfidence(filteredDetections.dotnet);
    const confidenceDelta =
      pythonAverage !== null && dotnetAverage !== null
        ? pythonAverage - dotnetAverage
        : null;

    return {
      detectionDelta:
        filteredDetections.python.length - filteredDetections.dotnet.length,
      pythonAverage,
      dotnetAverage,
      confidenceDelta,
      pythonBest: getBestDetection(filteredDetections.python),
      dotnetBest: getBestDetection(filteredDetections.dotnet),
    };
  }, [filteredDetections.dotnet, filteredDetections.python]);

  useEffect(() => {
    setRuns(createRunStates());
    setImageInfo(null);

    if (!file) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreviewUrl(null);
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreviewUrl(url);

    const previewImage = new Image();
    previewImage.onload = () => {
      if (previewUrlRef.current !== url) return;
      setImageInfo({
        width: previewImage.naturalWidth,
        height: previewImage.naturalHeight,
      });
    };
    previewImage.onerror = () => {
      if (previewUrlRef.current !== url) return;
      setImageInfo(null);
    };
    previewImage.src = url;
  }, [file]);

  function getErrorMessage(e: unknown) {
    if (e instanceof ApiError) {
      return `${e.message}${e.bodyText ? `\n${e.bodyText}` : ""}`;
    }

    if (e instanceof Error) {
      return e.message;
    }

    return t("errors.unknown");
  }

  async function runDetection(service: ServiceKey) {
    if (!file) return;

    setRuns((current) => ({
      ...current,
      [service]: {
        ...current[service],
        status: "loading",
        data: null,
        durationMs: null,
        error: null,
      },
    }));

    const startedAt = performance.now();
    const api = service === "python" ? pythonApi : dotnetApi;

    try {
      const data = await api.predict(file);
      const durationMs = performance.now() - startedAt;

      setRuns((current) => ({
        ...current,
        [service]: {
          status: "success",
          data,
          durationMs,
          error: null,
        },
      }));
    } catch (e) {
      const durationMs = performance.now() - startedAt;
      const message = getErrorMessage(e);

      setRuns((current) => ({
        ...current,
        [service]: {
          status: "error",
          data: null,
          durationMs,
          error: message,
        },
      }));
    }
  }

  async function runBoth() {
    if (!file || isDetecting) return;
    await Promise.all([runDetection("python"), runDetection("dotnet")]);
  }

  async function checkHealth(service: HealthKey) {
    setHealthChecks((current) => ({
      ...current,
      [service]: {
        status: "loading",
        latencyMs: null,
        message: null,
      },
    }));

    const startedAt = performance.now();
    const request =
      service === "gateway"
        ? gatewayApi.health
        : service === "python"
          ? pythonApi.health
          : dotnetApi.health;

    try {
      const message = await request();
      const latencyMs = performance.now() - startedAt;

      setHealthChecks((current) => ({
        ...current,
        [service]: {
          status: "online",
          latencyMs,
          message,
        },
      }));
    } catch (e) {
      const latencyMs = performance.now() - startedAt;

      setHealthChecks((current) => ({
        ...current,
        [service]: {
          status: "offline",
          latencyMs,
          message: getErrorMessage(e),
        },
      }));
    }
  }

  function checkAllHealth() {
    (["gateway", "python", "dotnet"] as HealthKey[]).forEach((service) => {
      checkHealth(service);
    });
  }

  function clearPredictions() {
    if (!canClearPredictions) return;
    setRuns(createRunStates());
  }

  const statusLabel = file ? t("dashboard.ready") : t("dashboard.waiting");
  const fastestLabel = comparison
    ? t(`services.${comparison.fastestService}`)
    : "-";
  const detectionCountLabel = `${filteredDetections.python.length} / ${filteredDetections.dotnet.length}`;
  const detectionDeltaLabel = formatSignedNumber(
    comparisonSummary.detectionDelta,
  );
  const averageConfidenceLabel = `${formatPercent(comparisonSummary.pythonAverage)} / ${formatPercent(
    comparisonSummary.dotnetAverage,
  )}`;
  const confidenceDeltaLabel = formatSignedPercent(
    comparisonSummary.confidenceDelta,
  );
  const pythonBestLabel = comparisonSummary.pythonBest
    ? `${comparisonSummary.pythonBest.label} ${formatPercent(comparisonSummary.pythonBest.score)}`
    : "-";
  const dotnetBestLabel = comparisonSummary.dotnetBest
    ? `${comparisonSummary.dotnetBest.label} ${formatPercent(comparisonSummary.dotnetBest.score)}`
    : "-";
  const selectedImageDimensions = imageInfo
    ? `${imageInfo.width} x ${imageInfo.height}`
    : "-";
  const selectedImageType = file?.type || "-";
  const selectedImageSize = file ? formatFileSize(file.size) : "-";

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-mark" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            >
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <rect x="8" y="8" width="8" height="8" rx="1.5" />
            </svg>
          </span>
          <div className="app-header__title">
            <span className="eyebrow">{t("dashboard.subtitle")}</span>
            <h1>{t("dashboard.title")}</h1>
          </div>
        </div>

        <LanguageSwitcher />
      </header>

      <section className="control-panel">
        <button
          aria-label={t("buttons.clearPredictions")}
          className="icon-button clear-predictions-button"
          disabled={!canClearPredictions}
          onClick={clearPredictions}
          title={t("buttons.clearPredictions")}
          type="button"
        >
          <svg
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M21 12a9 9 0 0 1-15.3 6.36" />
            <path d="M3 12A9 9 0 0 1 18.3 5.64" />
            <path d="M18 3v4h-4" />
            <path d="M6 21v-4h4" />
          </svg>
        </button>

        <div className="control-panel__upload">
          <div className="panel__header">
            <div>
              <span className="eyebrow">{t("dashboard.inputPanel")}</span>
              <h2>{t("dashboard.previewPanel")}</h2>
            </div>
            <span className="status-pill" data-ready={Boolean(file)}>
              {statusLabel}
            </span>
          </div>
          <FilePicker file={file} onPick={setFile} />
          <div className="file-inspector">
            <div className="file-inspector__frame" data-empty={!previewUrl}>
              {previewUrl ? (
                <img src={previewUrl} alt={t("imagePreview.alt")} />
              ) : (
                <span>IMG</span>
              )}
            </div>
            <div className="file-inspector__meta">
              <span>{t("fileInspector.title")}</span>
              <div className="file-inspector__stats">
                <div>
                  <span>{t("fileInspector.dimensions")}</span>
                  <strong>{selectedImageDimensions}</strong>
                </div>
                <div>
                  <span>{t("fileInspector.type")}</span>
                  <strong>{selectedImageType}</strong>
                </div>
                <div>
                  <span>{t("fileInspector.size")}</span>
                  <strong>{selectedImageSize}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="control-panel__actions">
          <div className="panel__header">
            <div>
              <span className="eyebrow">{t("dashboard.comparisonPanel")}</span>
              <h2>{t("dashboard.actionsPanel")}</h2>
            </div>
          </div>

          <div className="action-row">
            <button
              className="action-button action-button--primary"
              disabled={!canDetect}
              onClick={() => {
                runBoth();
              }}
              type="button"
            >
              {isDetecting ? t("buttons.comparing") : t("buttons.compareBoth")}
            </button>
            <button
              className="action-button"
              disabled={!canDetect || runs.python.status === "loading"}
              onClick={() => {
                runDetection("python");
              }}
              type="button"
            >
              {runs.python.status === "loading"
                ? t("buttons.sendingPython")
                : t("buttons.detectPython")}
            </button>
            <button
              className="action-button"
              disabled={!canDetect || runs.dotnet.status === "loading"}
              onClick={() => {
                runDetection("dotnet");
              }}
              type="button"
            >
              {runs.dotnet.status === "loading"
                ? t("buttons.sendingDotnet")
                : t("buttons.detectDotnet")}
            </button>
          </div>

          <label className="threshold-control">
            <span>
              {t("filters.minConfidence")}
              <strong>{formatPercent(confidenceThreshold)}</strong>
            </span>
            <input
              max="1"
              min="0"
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              step="0.01"
              type="range"
              value={confidenceThreshold}
            />
          </label>

          <div className="comparison-strip" aria-label={t("metrics.title")}>
            <div className="comparison-stat comparison-stat--total">
              <span>{t("metrics.totalDetections")}</span>
              <strong>{totalDetections}</strong>
            </div>
            <div className="comparison-stat comparison-stat--fastest">
              <span>{t("metrics.fastest")}</span>
              <strong>{fastestLabel}</strong>
            </div>
            <div className="comparison-stat comparison-stat--delta">
              <span>{t("metrics.delta")}</span>
              <strong>{formatDuration(comparison?.deltaMs ?? null)}</strong>
            </div>
            <div className="comparison-stat comparison-stat--best">
              <span>{t("comparison.bestDetection")}</span>
              <strong>{`${pythonBestLabel} | ${dotnetBestLabel}`}</strong>
            </div>
          </div>

          <div className="comparison-summary">
            <div className="summary-card summary-card--count-delta">
              <span>{t("comparison.detectionDelta")}</span>
              <strong>{detectionDeltaLabel}</strong>
            </div>
            <div className="summary-card summary-card--objects">
              <span>{t("comparison.detectionCount")}</span>
              <strong>{detectionCountLabel}</strong>
            </div>
            <div className="summary-card summary-card--confidence-delta">
              <span>{t("comparison.confidenceDelta")}</span>
              <strong>{confidenceDeltaLabel}</strong>
            </div>
            <div className="summary-card summary-card--avg-confidence">
              <span>{t("comparison.avgConfidence")}</span>
              <strong>{averageConfidenceLabel}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="results-grid" aria-label={t("dashboard.resultsPanel")}>
        <DetectionResultPanel
          detections={filteredDetections.python}
          durationMs={runs.python.durationMs}
          error={runs.python.error}
          imageUrl={previewUrl}
          result={runs.python.data}
          service="python"
          status={runs.python.status}
          threshold={confidenceThreshold}
          title={t("responses.python")}
        />
        <DetectionResultPanel
          detections={filteredDetections.dotnet}
          durationMs={runs.dotnet.durationMs}
          error={runs.dotnet.error}
          imageUrl={previewUrl}
          result={runs.dotnet.data}
          service="dotnet"
          status={runs.dotnet.status}
          threshold={confidenceThreshold}
          title={t("responses.dotnet")}
        />
      </section>

      <section className="health-panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">{t("dashboard.servicesPanel")}</span>
            <h2>{t("dashboard.healthPanel")}</h2>
          </div>
          <button
            className="service-button service-button--compact"
            disabled={isCheckingHealth}
            onClick={checkAllHealth}
            type="button"
          >
            {isCheckingHealth ? t("buttons.loading") : t("buttons.checkAll")}
          </button>
        </div>

        <div className="health-grid">
          {(["gateway", "python", "dotnet"] as HealthKey[]).map((service) => {
            const health = healthChecks[service];

            return (
              <button
                className="health-tile"
                data-service={service}
                data-status={health.status}
                disabled={health.status === "loading"}
                key={service}
                onClick={() => {
                  checkHealth(service);
                }}
                title={health.message ?? undefined}
                type="button"
              >
                <span>{t(`services.${service}`)}</span>
                <strong>{t(`health.${health.status}`)}</strong>
                <small>{formatDuration(health.latencyMs)}</small>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
