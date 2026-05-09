import {
  AlertTriangle,
  BarChart3,
  Bug,
  CheckCircle2,
  Download,
  FileJson,
  HeartHandshake,
  Play,
  RotateCcw,
  Square,
  Star,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { demoExperiment } from "../../domain/demo";
import {
  downloadText,
  serializeExperiment,
  serializeTrackCsv,
} from "../../domain/export";
import { fitMotion } from "../../domain/physics";
import { deriveState, stateCopy } from "../../domain/stateMachine";
import type {
  ExperimentRecord,
  ModelKind,
  VideoAnalysisOptions,
} from "../../domain/types";
import { importTrackCsv } from "../../domain/csv";
import {
  clearRecords,
  loadLastRecord,
  saveRecord,
} from "../../services/storage";
import { pyodideFailure, runPyodideFit } from "../../services/pyodideFit";
import { analyzeVideoFile } from "./analyzeVideo";
import { DebugPanel } from "./DebugPanel";
import { Plot } from "./Plot";

const repositoryUrl =
  "https://github.com/baditaflorin/physics-experiment-recorder";
const paypalUrl = "https://www.paypal.com/paypalme/florinbadita";

type BusyState = "idle" | "loading" | "analyzing" | "fitting";

export function RecorderApp() {
  const [record, setRecord] = useState<ExperimentRecord | null>(null);
  const [busy, setBusy] = useState<BusyState>("loading");
  const [progress, setProgress] = useState("");
  const [progressValue, setProgressValue] = useState(0);
  const [cancelled, setCancelled] = useState(false);
  const [fatalError, setFatalError] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [modelKind, setModelKind] = useState<ModelKind>("auto");
  const [options, setOptions] = useState<VideoAnalysisOptions>({
    sampleRateFps: 12,
    maxFrames: 360,
    maxDimension: 640,
    tagSizeMeters: 0.08,
    yAxis: "up",
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const debugEnabled = useMemo(
    () => new URLSearchParams(window.location.search).get("debug") === "1",
    [],
  );
  const state = deriveState({ record, busy, cancelled, fatalError });
  const stateDetails = stateCopy[state];

  useEffect(() => {
    loadLastRecord()
      .then((stored) => {
        if (stored) {
          setRecord(stored);
        }
      })
      .catch(() => {
        setFatalError(true);
      })
      .finally(() => setBusy("idle"));
  }, []);

  useEffect(() => {
    if (!record) return;
    saveRecord(record).catch(() => {
      setFatalError(true);
    });
  }, [record]);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  async function loadDemo() {
    setCancelled(false);
    const next = demoExperiment(__APP_VERSION__, __GIT_COMMIT__);
    setRecord(next);
    setModelKind("auto");
    setProgress("Demo loaded");
    setProgressValue(100);
  }

  async function importCsvFile(file: File) {
    setBusy("loading");
    setCancelled(false);
    setProgress("Reading CSV track");
    setProgressValue(15);
    try {
      const text = await decodeTextFile(file);
      const next = await importTrackCsv(text, {
        name: file.name,
        appVersion: __APP_VERSION__,
        commit: __GIT_COMMIT__,
        lastModified: new Date(file.lastModified || 0).toISOString(),
        tagSizeMeters: options.tagSizeMeters,
      });
      setRecord(next);
      setProgress(`Imported ${next.points.length} samples`);
      setProgressValue(100);
    } catch (errorValue) {
      setRecord((current) =>
        current
          ? addActivity(
              current,
              "CSV import failed",
              errorValue instanceof Error
                ? errorValue.message
                : "Unknown parse error",
            )
          : current,
      );
      setFatalError(!record);
    } finally {
      setBusy("idle");
    }
  }

  function chooseVideo(file: File) {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setCancelled(false);
    setProgress(`Loaded ${file.name}`);
    setProgressValue(0);
  }

  async function runVideoAnalysis() {
    if (!videoFile || !videoRef.current || !canvasRef.current) {
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy("analyzing");
    setCancelled(false);
    setProgress("Starting analysis");
    setProgressValue(2);
    try {
      const next = await analyzeVideoFile({
        file: videoFile,
        video: videoRef.current,
        canvas: canvasRef.current,
        options,
        appVersion: __APP_VERSION__,
        commit: __GIT_COMMIT__,
        signal: controller.signal,
        onProgress: (item) => {
          setProgress(item.message);
          setProgressValue(
            Math.round(
              (item.currentFrame / Math.max(1, item.totalFrames)) * 100,
            ),
          );
        },
      });
      setRecord(next);
      setProgress(`Tracked ${next.points.length} samples`);
      setProgressValue(100);
    } catch (errorValue) {
      if (
        errorValue instanceof DOMException &&
        errorValue.name === "AbortError"
      ) {
        setCancelled(true);
        setProgress("Analysis cancelled");
      } else {
        setFatalError(false);
        setProgress(
          errorValue instanceof Error
            ? errorValue.message
            : "Video analysis failed",
        );
      }
    } finally {
      setBusy("idle");
      abortRef.current = null;
    }
  }

  function cancelWork() {
    abortRef.current?.abort();
    setCancelled(true);
    setBusy("idle");
  }

  function runJavascriptFit() {
    if (!record || record.points.length < 3) return;
    setBusy("fitting");
    setProgress("Fitting with JavaScript least squares");
    const fit = fitMotion({ modelKind, points: record.points });
    const next = addActivity(
      { ...record, fit },
      "Fit model",
      `${fit.modelKind} using JavaScript`,
    );
    setRecord(next);
    setProgress(`Fit complete: R2 ${(fit.r2 * 100).toFixed(0)}%`);
    setProgressValue(100);
    setBusy("idle");
  }

  async function runScientificFit() {
    if (!record || record.points.length < 3) return;
    setBusy("fitting");
    setProgress("Loading Pyodide, SciPy, and matplotlib");
    setProgressValue(20);
    try {
      const fit = await runPyodideFit(record.points, modelKind);
      setRecord(
        addActivity(
          { ...record, fit },
          "Fit model",
          `${fit.modelKind} using Pyodide/SciPy`,
        ),
      );
      setProgress(`SciPy fit complete: R2 ${(fit.r2 * 100).toFixed(0)}%`);
      setProgressValue(100);
    } catch (errorValue) {
      const fallback = fitMotion({ modelKind, points: record.points });
      setRecord({
        ...addActivity(
          { ...record, fit: fallback },
          "SciPy fit failed",
          "Kept JavaScript fit",
        ),
        issues: [...record.issues, ...pyodideFailure(errorValue)],
      });
      setProgress("SciPy unavailable; JavaScript fit kept");
    } finally {
      setBusy("idle");
    }
  }

  async function resetLocalState() {
    await clearRecords();
    setRecord(null);
    setCancelled(false);
    setFatalError(false);
    setProgress("Local state cleared");
    setProgressValue(0);
  }

  function exportJson() {
    if (!record) return;
    downloadText(
      `${record.id}.json`,
      serializeExperiment(record),
      "application/json",
    );
  }

  function exportCsv() {
    if (!record) return;
    downloadText(
      `${record.id}-track.csv`,
      serializeTrackCsv(record),
      "text/csv",
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Physics Experiment Recorder</p>
          <h1>Phone video to physics data.</h1>
        </div>
        <nav aria-label="Project links" className="top-actions">
          <a
            className="icon-link"
            href={repositoryUrl}
            target="_blank"
            rel="noreferrer"
          >
            <Star size={18} aria-hidden="true" />
            Star on GitHub
          </a>
          <a
            className="icon-link"
            href={paypalUrl}
            target="_blank"
            rel="noreferrer"
          >
            <HeartHandshake size={18} aria-hidden="true" />
            Support
          </a>
        </nav>
      </header>

      <section className="status-strip" aria-live="polite">
        <div>
          <span className={`state-dot ${state}`}></span>
          <strong>{stateDetails.label}</strong>
          <span>{stateDetails.exit}</span>
        </div>
        <div className="version-pill">
          v{__APP_VERSION__} · {__GIT_COMMIT__}
        </div>
      </section>

      <section className="workspace">
        <aside className="control-panel">
          <section className="panel-section">
            <h2>Input</h2>
            <div className="button-grid">
              <button type="button" className="primary" onClick={loadDemo}>
                <Zap size={18} aria-hidden="true" />
                Demo
              </button>
              <label className="file-button">
                <Upload size={18} aria-hidden="true" />
                Track CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) void importCsvFile(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <label className="file-button">
                <Square size={18} aria-hidden="true" />
                Video
                <input
                  type="file"
                  accept="video/*"
                  capture="environment"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) chooseVideo(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            {videoUrl ? (
              <div className="video-box">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  muted
                  playsInline
                  preload="metadata"
                />
                <button
                  type="button"
                  className="primary wide"
                  onClick={() => void runVideoAnalysis()}
                  disabled={busy === "analyzing"}
                >
                  <Play size={18} aria-hidden="true" />
                  Analyze Video
                </button>
              </div>
            ) : null}
          </section>

          <section className="panel-section">
            <h2>Tracking</h2>
            <label>
              Tag size
              <span>
                <input
                  type="number"
                  min="0.01"
                  max="1"
                  step="0.01"
                  value={options.tagSizeMeters}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      tagSizeMeters: Number(event.currentTarget.value),
                    }))
                  }
                />
                m
              </span>
            </label>
            <label>
              Sample rate
              <span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  step="1"
                  value={options.sampleRateFps}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      sampleRateFps: Number(event.currentTarget.value),
                    }))
                  }
                />
                fps
              </span>
            </label>
            <label>
              Y axis
              <select
                value={options.yAxis}
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    yAxis: event.currentTarget.value as "up" | "down",
                  }))
                }
              >
                <option value="up">up</option>
                <option value="down">down</option>
              </select>
            </label>
          </section>

          <section className="panel-section">
            <h2>Fit</h2>
            <label>
              Model
              <select
                value={modelKind}
                onChange={(event) =>
                  setModelKind(event.currentTarget.value as ModelKind)
                }
              >
                <option value="auto">auto</option>
                <option value="constant-acceleration">
                  constant acceleration
                </option>
                <option value="pendulum">pendulum</option>
                <option value="damped-cart">damped cart</option>
              </select>
            </label>
            <div className="button-grid">
              <button
                type="button"
                onClick={runJavascriptFit}
                disabled={!record || record.points.length < 3}
              >
                <BarChart3 size={18} aria-hidden="true" />
                Fit
              </button>
              <button
                type="button"
                onClick={() => void runScientificFit()}
                disabled={!record || record.points.length < 3}
              >
                <Zap size={18} aria-hidden="true" />
                SciPy
              </button>
            </div>
          </section>

          <section className="panel-section">
            <h2>Export</h2>
            <div className="button-grid">
              <button type="button" onClick={exportCsv} disabled={!record}>
                <Download size={18} aria-hidden="true" />
                CSV
              </button>
              <button type="button" onClick={exportJson} disabled={!record}>
                <FileJson size={18} aria-hidden="true" />
                JSON
              </button>
              <button type="button" onClick={() => void resetLocalState()}>
                <RotateCcw size={18} aria-hidden="true" />
                Reset
              </button>
              {busy === "analyzing" ? (
                <button type="button" className="danger" onClick={cancelWork}>
                  <X size={18} aria-hidden="true" />
                  Cancel
                </button>
              ) : null}
            </div>
          </section>
        </aside>

        <section className="results-panel">
          <div className="progress-shell">
            <div className="progress-label">
              <span>{progress || "Ready"}</span>
              <span>{progressValue}%</span>
            </div>
            <progress max="100" value={progressValue}></progress>
          </div>

          {record ? <RecordSummary record={record} /> : <EmptyState />}
          {record ? <Plot points={record.points} fit={record.fit} /> : null}
          {record?.fit ? <FitSummary record={record} /> : null}
          {record?.issues.length ? <Issues record={record} /> : null}
          {record?.activity.length ? <Activity record={record} /> : null}
        </section>
      </section>

      <DebugPanel
        record={record}
        state={state}
        progress={progress}
        enabled={debugEnabled}
      />
      <canvas ref={canvasRef} hidden />
    </main>
  );
}

function EmptyState() {
  return (
    <section className="empty-state">
      <h2>Ready for a real track</h2>
      <p>
        Use a printed high-contrast AprilTag-style square on the moving object.
      </p>
    </section>
  );
}

function RecordSummary({ record }: { record: ExperimentRecord }) {
  const level =
    record.inference.confidence >= 0.78
      ? "high"
      : record.inference.confidence >= 0.48
        ? "medium"
        : "low";
  return (
    <section className="record-summary">
      <div className="record-heading">
        <h2>{record.title}</h2>
        <span>{record.source.kind}</span>
      </div>
      <div className="summary-grid">
        <div className="summary-card">
          <span>Samples</span>
          <strong>{record.points.length}</strong>
        </div>
        <div className="summary-card">
          <span>First guess</span>
          <strong>{record.inference.experimentKind}</strong>
        </div>
        <div className="summary-card">
          <span>Confidence</span>
          <strong>{level}</strong>
        </div>
        <div className="summary-card">
          <span>Scale</span>
          <strong>
            {record.calibration.metersPerPixel.toPrecision(3)} m/px
          </strong>
        </div>
      </div>
    </section>
  );
}

function FitSummary({ record }: { record: ExperimentRecord }) {
  if (!record.fit) return null;
  return (
    <section className="fit-summary">
      <div className="section-title">
        <CheckCircle2 size={18} aria-hidden="true" />
        <h2>{record.fit.modelKind}</h2>
        <span>{record.fit.engine}</span>
      </div>
      <div className="summary-grid">
        <div className="summary-card">
          <span>R2</span>
          <strong>{(record.fit.r2 * 100).toFixed(1)}%</strong>
        </div>
        <div className="summary-card">
          <span>RMSE</span>
          <strong>{record.fit.rmse.toPrecision(3)} m</strong>
        </div>
        {record.fit.parameters.map((parameter) => (
          <div className="summary-card" key={parameter.name}>
            <span>{parameter.label}</span>
            <strong>
              {parameter.value.toPrecision(4)} {parameter.unit}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function Issues({ record }: { record: ExperimentRecord }) {
  return (
    <section className="issue-list">
      <div className="section-title">
        <AlertTriangle size={18} aria-hidden="true" />
        <h2>Warnings</h2>
      </div>
      {record.issues.map((item) => (
        <article key={item.id} className={`issue ${item.severity}`}>
          <strong>{item.what}</strong>
          <p>{item.why}</p>
          <span>{item.nextStep}</span>
        </article>
      ))}
    </section>
  );
}

function Activity({ record }: { record: ExperimentRecord }) {
  return (
    <details className="activity-log">
      <summary>
        <Bug size={18} aria-hidden="true" />
        Activity and provenance
      </summary>
      <ol>
        {record.activity.map((entry) => (
          <li key={entry.id}>
            <strong>{entry.action}</strong>
            <span>{entry.detail}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}

function addActivity(
  record: ExperimentRecord,
  action: string,
  detail: string,
): ExperimentRecord {
  return {
    ...record,
    activity: [
      ...record.activity,
      {
        id: `${record.id}-act-${record.activity.length + 1}`,
        at: new Date().toISOString(),
        action,
        detail,
      },
    ],
  };
}

async function decodeTextFile(file: File) {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (!utf8.includes("\uFFFD")) {
    return utf8;
  }
  return new TextDecoder("windows-1252").decode(buffer);
}
