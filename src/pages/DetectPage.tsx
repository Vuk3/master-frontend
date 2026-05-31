/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import FilePicker from "../components/FilePicker";
import JsonBlock from "../components/JsonBlock";
import { ApiError } from "../api/client";
import ImageWithDetections from "../components/ImageWithDetection";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { dotnetApi } from "../api/dotnet";
import { gatewayApi } from "../api/gateway";
import { pythonApi } from "../api/python";
import { useI18n } from "../i18n/use-i18n";

type LoadingState =
  | "idle"
  | "nestHealth"
  | "pythonHealth"
  | "dotnetHealth"
  | "pythonDetect"
  | "dotnetDetect";

export default function DetectPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState<LoadingState>("idle");
  const isBusy = loading !== "idle";

  const [error, setError] = useState<string | null>(null);

  const [responseNest, setResponseNest] = useState<any>(null);
  const [responsePython, setResponsePython] = useState<any>(null);
  const [responseDotnet, setResponseDotnet] = useState<any>(null);

  const imageWidth =
    responsePython?.imageWidth ?? responseDotnet?.imageWidth ?? 0;
  const imageHeight =
    responsePython?.imageHeight ?? responseDotnet?.imageHeight ?? 0;

  type Engine = "python" | "dotnet";
  const [activeEngine, setActiveEngine] = useState<Engine>("python");

  const detections =
    activeEngine === "dotnet"
      ? responseDotnet?.detections ?? []
      : responsePython?.detections ?? [];

  const canDetect = useMemo(() => !!file && !isBusy, [file, isBusy]);

  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!file) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreviewUrl(null);
      return;
    }

    // revoke stari tek kad praviš novi
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreviewUrl(url);

    // nema revoke u cleanup, jer StrictMode u dev-u ume da ga okine prerano
    return () => {};
  }, [file]);

  function handleErr(e: unknown) {
    if (e instanceof ApiError) {
      setError(`${e.message}${e.bodyText ? `\n${e.bodyText}` : ""}`);
      return;
    }
    if (e instanceof Error) {
      setError(e.message);
      return;
    }
    setError(t("errors.unknown"));
  }

  async function getNestHealth() {
    setError(null);
    setLoading("nestHealth");
    try {
      const res = await gatewayApi.health();
      setResponseNest(res);
    } catch (e) {
      handleErr(e);
    } finally {
      setLoading("idle");
    }
  }

  async function getPythonHealth() {
    setError(null);
    setLoading("pythonHealth");
    try {
      const res = await pythonApi.health();
      setResponsePython(res);
    } catch (e) {
      handleErr(e);
    } finally {
      setLoading("idle");
    }
  }

  async function getDotnetHealth() {
    setError(null);
    setLoading("dotnetHealth");
    try {
      const res = await dotnetApi.health();
      setResponseDotnet(res);
    } catch (e) {
      handleErr(e);
    } finally {
      setLoading("idle");
    }
  }

  async function sendToPython() {
    if (!file) return;
    setError(null);
    setLoading("pythonDetect");
    setResponseDotnet(null); // bitno
    try {
      const res = await pythonApi.predict(file);
      setResponsePython(res);
    } catch (e) {
      handleErr(e);
    } finally {
      setLoading("idle");
    }
  }

  async function sendToDotnet() {
    if (!file) return;
    setError(null);
    setLoading("dotnetDetect");
    setResponsePython(null); // bitno
    try {
      const res = await dotnetApi.predict(file);
      setResponseDotnet(res);
    } catch (e) {
      handleErr(e);
    } finally {
      setLoading("idle");
    }
  }

  const statusLabel = file ? t("dashboard.ready") : t("dashboard.waiting");
  const selectedFileLabel = file?.name ?? t("filePicker.empty");

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-mark" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
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

      <div className="node-strip" aria-label="Service nodes">
        <span className="node-chip" data-kind="gateway">
          gateway
        </span>
        <span className="node-chip" data-kind="python">
          python-api
        </span>
        <span className="node-chip" data-kind="dotnet">
          dotnet-api
        </span>
      </div>

      {error && (
        <pre className="error-banner">{error}</pre>
      )}

      <section className="dashboard-grid">
        <div className="panel workspace-panel">
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

          {previewUrl ? (
            <ImageWithDetections
              imageUrl={previewUrl}
              imageWidth={imageWidth || 1}
              imageHeight={imageHeight || 1}
              detections={detections}
            />
          ) : (
            <div className="empty-preview">
              <div className="empty-preview__mark">IMG</div>
              <strong>{t("dashboard.emptyImage")}</strong>
              <span>{selectedFileLabel}</span>
            </div>
          )}

          <div className="action-row">
            <button
              className="action-button action-button--primary"
              data-active={activeEngine === "python"}
              onClick={async () => {
                setActiveEngine("python");
                await sendToPython();
              }}
              disabled={!canDetect}
            >
              {loading === "pythonDetect"
                ? t("buttons.sendingPython")
                : t("buttons.detectPython")}
            </button>

            <button
              className="action-button"
              data-active={activeEngine === "dotnet"}
              onClick={async () => {
                setActiveEngine("dotnet");
                await sendToDotnet();
              }}
              disabled={!canDetect}
            >
              {loading === "dotnetDetect"
                ? t("buttons.sendingDotnet")
                : t("buttons.detectDotnet")}
            </button>
          </div>
        </div>

        <aside className="side-stack">
          <div className="panel services-panel">
            <div className="panel__header">
              <div>
                <span className="eyebrow">{t("dashboard.servicesPanel")}</span>
                <h2>{t("dashboard.responsesPanel")}</h2>
              </div>
            </div>

            <div className="service-actions">
              <button
                className="service-button"
                data-kind="gateway"
                onClick={getNestHealth}
                disabled={isBusy}
              >
                {loading === "nestHealth"
                  ? t("buttons.loading")
                  : t("buttons.nestHealth")}
              </button>
              <button
                className="service-button"
                data-kind="python"
                onClick={getPythonHealth}
                disabled={isBusy}
              >
                {loading === "pythonHealth"
                  ? t("buttons.loading")
                  : t("buttons.pythonHealth")}
              </button>
              <button
                className="service-button"
                data-kind="dotnet"
                onClick={getDotnetHealth}
                disabled={isBusy}
              >
                {loading === "dotnetHealth"
                  ? t("buttons.loading")
                  : t("buttons.dotnetHealth")}
              </button>
            </div>
          </div>

          <JsonBlock title={t("responses.nest")} data={responseNest} />
          <JsonBlock title={t("responses.python")} data={responsePython} />
          <JsonBlock title={t("responses.dotnet")} data={responseDotnet} />
        </aside>
      </section>
    </main>
  );
}
