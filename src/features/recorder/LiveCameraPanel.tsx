import * as Comlink from "comlink";
import { Camera, CircleStop, Download, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { inferExperiment } from "../../domain/physics";
import { stableId, sha256Hex } from "../../domain/hash";
import type {
  Calibration,
  ExperimentRecord,
  TrackerDetection,
  VideoAnalysisOptions,
} from "../../domain/types";
import { medianPointSize, pointsFromDetections } from "./trackingMath";

type TrackerApi = {
  ready: () => Promise<boolean>;
  detectFrame: (payload: {
    width: number;
    height: number;
    data: ArrayBuffer;
  }) => Promise<TrackerDetection>;
};

type DetectionSample = {
  t: number;
  frame: number;
  detection: TrackerDetection;
};

type Props = {
  options: VideoAnalysisOptions;
  appVersion: string;
  commit: string;
  onRecord: (record: ExperimentRecord) => void;
};

export function LiveCameraPanel({ options, appVersion, commit, onRecord }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const trackerRef = useRef<ReturnType<typeof Comlink.wrap<TrackerApi>> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const samplesRef = useRef<DetectionSample[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameCountRef = useRef(0);
  const startTimeRef = useRef(0);
  const busyRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<"idle" | "preview" | "tracking">("idle");
  const [detectedCount, setDetectedCount] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopEverything();
    };
  }, []);

  function stopEverything() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      trackerRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  }

  async function startPreview() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      // videoRef is always mounted (hidden when idle), so this is always valid
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {/* muted autoplay is allowed */});
      }
      setPhase("preview");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Camera access denied. Allow camera permission and try again.",
      );
    }
  }

  async function startTracking() {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
    setError(null);
    samplesRef.current = [];
    chunksRef.current = [];
    frameCountRef.current = 0;
    busyRef.current = false;
    setDetectedCount(0);
    setFrameCount(0);
    setRecordingBlob(null);

    // Set up canvas size from video
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const maxDim = options.maxDimension;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 360;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));

    // Start tracker worker
    const worker = new Worker(
      new URL("../../workers/tracker.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;
    const tracker = Comlink.wrap<TrackerApi>(worker);
    trackerRef.current = tracker;
    await tracker.ready();

    // Start MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(500);

    startTimeRef.current = performance.now();
    setPhase("tracking");

    // Frame processing interval
    const intervalMs = 1000 / options.sampleRateFps;
    intervalRef.current = setInterval(() => {
      void processFrame();
    }, intervalMs);
  }

  async function processFrame() {
    if (busyRef.current || !videoRef.current || !canvasRef.current || !trackerRef.current) return;
    busyRef.current = true;
    try {
      const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      const t = (performance.now() - startTimeRef.current) / 1000;
      const frame = frameCountRef.current++;
      setFrameCount(frame + 1);

      const detection = await trackerRef.current.detectFrame(
        Comlink.transfer(
          {
            width: canvasRef.current.width,
            height: canvasRef.current.height,
            data: imageData.data.buffer,
          },
          [imageData.data.buffer],
        ),
      );
      if (detection.found) {
        samplesRef.current.push({ t, frame, detection });
        setDetectedCount(samplesRef.current.length);
      }
    } finally {
      busyRef.current = false;
    }
  }

  async function stopTracking() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop MediaRecorder and wait for data
    const blob = await new Promise<Blob>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(new Blob(chunksRef.current));
        return;
      }
      recorder.onstop = () => {
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType }));
      };
      recorder.stop();
    });
    setRecordingBlob(blob);

    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      trackerRef.current = null;
    }

    // Build ExperimentRecord from samples
    const samples = samplesRef.current;
    const checksum = await sha256Hex(new ArrayBuffer(8)); // placeholder
    const markerSizePx = medianPointSize(samples.map((s) => s.detection));
    const metersPerPixel =
      markerSizePx > 0 ? options.tagSizeMeters / markerSizePx : 0.001;
    const first = samples[0]?.detection;
    const calibration: Calibration = {
      tagSizeMeters: options.tagSizeMeters,
      metersPerPixel,
      originXPx: first?.centerX,
      originYPx: first?.centerY,
      yAxis: options.yAxis,
      inferredFrom: markerSizePx > 0 ? "tag-size" : "manual-default",
      confidence: markerSizePx > 0 ? 0.82 : 0.2,
    };
    const points = pointsFromDetections(samples, calibration, checksum);
    const inference = inferExperiment(points);
    const now = new Date().toISOString();
    const id = stableId("live", `${now}:${samples.length}`);

    const record: ExperimentRecord = {
      schemaVersion: "experiment-record/v1",
      id,
      title: `Live recording ${new Date().toLocaleTimeString()}`,
      app: { version: appVersion, commit },
      source: {
        kind: "video",
        name: "live-camera",
        checksum,
        lastModified: now,
        rows: points.length,
        durationSec: samples.length > 0 ? samples[samples.length - 1].t : 0,
      },
      calibration,
      points,
      inference: { ...inference, anomalies: inference.anomalies },
      issues: inference.anomalies,
      activity: [
        {
          id: stableId("act", `${id}:live`),
          at: now,
          action: "Live camera recording",
          detail: `Tracked ${points.length} marker positions across ${frameCountRef.current} sampled frames.`,
        },
      ],
    };

    onRecord(record);
    setPhase("preview");
  }

  function downloadRecording() {
    if (!recordingBlob) return;
    const ext = recordingBlob.type.includes("mp4") ? "mp4" : "webm";
    const url = URL.createObjectURL(recordingBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `live-recording-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function stopCamera() {
    stopEverything();
    setPhase("idle");
    setRecordingBlob(null);
  }

  return (
    <div className="live-camera-panel">
      {error && (
        <p style={{ color: "var(--color-error, #dc2626)", fontSize: "0.85rem" }}>
          {error}
        </p>
      )}

      {phase === "idle" && (
        <button type="button" className="primary wide" onClick={() => void startPreview()}>
          <Camera size={18} aria-hidden="true" />
          Open Camera
        </button>
      )}

      {/* video is always mounted so videoRef.current is always valid */}
      <div className="video-box" style={{ display: phase === "idle" ? "none" : undefined }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", borderRadius: "4px", background: "#000" }}
        />
        <div className="button-grid">
          {phase === "preview" && (
            <button type="button" className="primary" onClick={() => void startTracking()}>
              <Square size={18} aria-hidden="true" />
              Record &amp; Track
            </button>
          )}
          {phase === "tracking" && (
            <button type="button" className="danger" onClick={() => void stopTracking()}>
              <CircleStop size={18} aria-hidden="true" />
              Stop
            </button>
          )}
          {phase !== "idle" && (
            <button type="button" onClick={stopCamera}>
              Close Camera
            </button>
          )}
        </div>
        {phase === "tracking" && (
          <p style={{ fontSize: "0.8rem", color: "var(--color-muted, #666)" }}>
            {detectedCount} detections / {frameCount} frames
          </p>
        )}
      </div>

      {recordingBlob && (
        <button type="button" onClick={downloadRecording}>
          <Download size={18} aria-hidden="true" />
          Download Recording ({(recordingBlob.size / 1024).toFixed(0)} KB)
        </button>
      )}

      <canvas ref={canvasRef} hidden />
    </div>
  );
}
