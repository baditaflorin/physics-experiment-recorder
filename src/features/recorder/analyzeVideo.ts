import * as Comlink from "comlink";

import { issue } from "../../domain/errors";
import { sha256Hex, stableId } from "../../domain/hash";
import { medianPointSize, pointsFromDetections } from "./trackingMath";
import { inferExperiment } from "../../domain/physics";
import type {
  Calibration,
  ExperimentRecord,
  TrackerDetection,
  VideoAnalysisOptions,
} from "../../domain/types";

type TrackerApi = {
  ready: () => Promise<boolean>;
  detectFrame: (payload: {
    width: number;
    height: number;
    data: ArrayBuffer;
  }) => Promise<TrackerDetection>;
};

type Progress = {
  currentFrame: number;
  totalFrames: number;
  message: string;
};

type AnalyzeArgs = {
  file: File;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  options: VideoAnalysisOptions;
  appVersion: string;
  commit: string;
  signal: AbortSignal;
  onProgress: (progress: Progress) => void;
};

export async function analyzeVideoFile(
  args: AnalyzeArgs,
): Promise<ExperimentRecord> {
  const worker = new Worker(
    new URL("../../workers/tracker.worker.ts", import.meta.url),
    {
      type: "module",
    },
  );
  const tracker = Comlink.wrap<TrackerApi>(worker);
  try {
    args.onProgress({
      currentFrame: 0,
      totalFrames: 1,
      message: "Loading OpenCV worker",
    });
    await tracker.ready();
    throwIfAborted(args.signal);

    const checksum = await sha256Hex(await args.file.arrayBuffer());
    const duration = Number.isFinite(args.video.duration)
      ? args.video.duration
      : 0;
    const totalFrames = Math.min(
      args.options.maxFrames,
      Math.max(1, Math.floor(duration * args.options.sampleRateFps)),
    );
    const detections: Array<{
      t: number;
      frame: number;
      detection: TrackerDetection;
    }> = [];
    const context = prepareCanvas(
      args.video,
      args.canvas,
      args.options.maxDimension,
    );

    for (let frame = 0; frame < totalFrames; frame += 1) {
      throwIfAborted(args.signal);
      const t =
        totalFrames === 1
          ? 0
          : (frame / Math.max(1, totalFrames - 1)) * duration;
      args.onProgress({
        currentFrame: frame + 1,
        totalFrames,
        message: `Tracking frame ${frame + 1} of ${totalFrames}`,
      });
      await seekVideo(args.video, t, args.signal);
      context.drawImage(
        args.video,
        0,
        0,
        args.canvas.width,
        args.canvas.height,
      );
      const imageData = context.getImageData(
        0,
        0,
        args.canvas.width,
        args.canvas.height,
      );
      const detection = await tracker.detectFrame(
        Comlink.transfer(
          {
            width: args.canvas.width,
            height: args.canvas.height,
            data: imageData.data.buffer,
          },
          [imageData.data.buffer],
        ),
      );
      if (detection.found) {
        detections.push({ t, frame, detection });
      }
    }

    const markerSizePx = medianPointSize(
      detections.map((item) => item.detection),
    );
    const metersPerPixel =
      markerSizePx > 0 ? args.options.tagSizeMeters / markerSizePx : 0.001;
    const first = detections[0]?.detection;
    const calibration: Calibration = {
      tagSizeMeters: args.options.tagSizeMeters,
      metersPerPixel,
      originXPx: first?.centerX,
      originYPx: first?.centerY,
      yAxis: args.options.yAxis,
      inferredFrom: markerSizePx > 0 ? "tag-size" : "manual-default",
      confidence: markerSizePx > 0 ? 0.82 : 0.2,
    };
    const points = pointsFromDetections(detections, calibration, checksum);
    const inference = inferExperiment(points);
    const issues = [...inference.anomalies];

    if (points.length < Math.max(3, totalFrames * 0.25)) {
      issues.push(
        issue(
          points.length >= 3 ? "warning" : "error",
          "Marker was not tracked in enough frames",
          `${points.length} of ${totalFrames} sampled frames produced usable marker centers.`,
          "Use a larger printed tag, better lighting, less motion blur, or a lower sample rate.",
          "video",
        ),
      );
    }

    const id = stableId(
      "exp",
      `${checksum}:${args.options.sampleRateFps}:${args.options.tagSizeMeters}`,
    );
    const modified = new Date(args.file.lastModified || 0).toISOString();

    return {
      schemaVersion: "experiment-record/v1",
      id,
      title: args.file.name.replace(/\.[^.]+$/, ""),
      app: { version: args.appVersion, commit: args.commit },
      source: {
        kind: "video",
        name: args.file.name,
        checksum,
        lastModified: modified,
        rows: points.length,
        durationSec: duration,
      },
      calibration,
      points,
      inference: {
        ...inference,
        anomalies: [...inference.anomalies, ...issues],
      },
      issues,
      activity: [
        {
          id: stableId("act", `${id}:video-analysis`),
          at: modified,
          action: "Analyzed video",
          detail: `Tracked ${points.length} marker positions across ${totalFrames} sampled frames.`,
        },
      ],
    };
  } finally {
    worker.terminate();
  }
}

function prepareCanvas(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  maxDimension: number,
) {
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 360;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Canvas context is not available for frame analysis.");
  }
  return context;
}

function seekVideo(video: HTMLVideoElement, time: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("The browser could not seek through this video file."));
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Analysis cancelled", "AbortError"));
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    signal.addEventListener("abort", onAbort, { once: true });
    video.currentTime = Math.min(
      time,
      Math.max(0, (video.duration || time) - 0.001),
    );
  });
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw new DOMException("Analysis cancelled", "AbortError");
  }
}
