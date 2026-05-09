import cvModule from "@techstark/opencv-js";
import * as Comlink from "comlink";

import type { TrackerDetection } from "../domain/types";

type FramePayload = {
  width: number;
  height: number;
  data: ArrayBuffer;
};

type CvMat = {
  rows: number;
  data32S: Int32Array;
  delete: () => void;
};

type CvMatVector = {
  size: () => number;
  get: (index: number) => CvMat;
  delete: () => void;
};

type OpenCv = typeof cvModule & {
  Mat: new () => CvMat;
  MatVector: new () => CvMatVector;
  Size: new (width: number, height: number) => unknown;
  COLOR_RGBA2GRAY: number;
  THRESH_BINARY_INV: number;
  THRESH_OTSU: number;
  RETR_EXTERNAL: number;
  CHAIN_APPROX_SIMPLE: number;
  matFromImageData: (imageData: ImageData) => CvMat;
  cvtColor: (source: CvMat, destination: CvMat, code: number) => void;
  GaussianBlur: (
    source: CvMat,
    destination: CvMat,
    size: unknown,
    sigma: number,
  ) => void;
  threshold: (
    source: CvMat,
    destination: CvMat,
    thresh: number,
    max: number,
    type: number,
  ) => void;
  findContours: (
    source: CvMat,
    contours: CvMatVector,
    hierarchy: CvMat,
    mode: number,
    method: number,
  ) => void;
  arcLength: (contour: CvMat, closed: boolean) => number;
  approxPolyDP: (
    curve: CvMat,
    approxCurve: CvMat,
    epsilon: number,
    closed: boolean,
  ) => void;
  contourArea: (contour: CvMat) => number;
  boundingRect: (contour: CvMat) => { width: number; height: number };
  [key: string]: unknown;
};

let cvPromise: Promise<OpenCv> | null = null;

async function getOpenCv(): Promise<OpenCv> {
  if (!cvPromise) {
    cvPromise = Promise.resolve(cvModule as OpenCv | Promise<OpenCv>).then(
      (moduleValue) =>
        new Promise<OpenCv>((resolve) => {
          const maybeRuntime = moduleValue as OpenCv & {
            onRuntimeInitialized?: () => void;
            Mat?: unknown;
          };
          if (typeof maybeRuntime.Mat === "function") {
            resolve(maybeRuntime);
            return;
          }
          maybeRuntime.onRuntimeInitialized = () => resolve(maybeRuntime);
        }),
    );
  }
  return cvPromise;
}

async function ready() {
  await getOpenCv();
  return true;
}

async function detectFrame(payload: FramePayload): Promise<TrackerDetection> {
  const cv = await getOpenCv();
  const imageData = new ImageData(
    new Uint8ClampedArray(payload.data),
    payload.width,
    payload.height,
  );
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const thresholded = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.threshold(
      blurred,
      thresholded,
      0,
      255,
      cv.THRESH_BINARY_INV + cv.THRESH_OTSU,
    );
    cv.findContours(
      thresholded,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE,
    );

    let best: TrackerDetection | null = null;
    const frameArea = payload.width * payload.height;
    for (let index = 0; index < contours.size(); index += 1) {
      const contour = contours.get(index);
      const perimeter = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      try {
        cv.approxPolyDP(contour, approx, 0.035 * perimeter, true);
        const area = Math.abs(cv.contourArea(approx));
        if (
          approx.rows !== 4 ||
          area < frameArea * 0.00045 ||
          area > frameArea * 0.45
        ) {
          continue;
        }
        const rect = cv.boundingRect(approx);
        const aspect = rect.width / Math.max(1, rect.height);
        const squareScore = 1 - Math.min(1, Math.abs(1 - aspect));
        if (squareScore < 0.48) {
          continue;
        }
        const corners = readCorners(approx);
        const centerX =
          corners.reduce((sum, corner) => sum + corner.x, 0) / corners.length;
        const centerY =
          corners.reduce((sum, corner) => sum + corner.y, 0) / corners.length;
        const fillScore = Math.min(
          1,
          area / Math.max(1, rect.width * rect.height),
        );
        const sizeScore = Math.min(
          1,
          Math.sqrt(area) /
            Math.max(18, Math.min(payload.width, payload.height) * 0.12),
        );
        const confidence = clamp(
          0.28 + squareScore * 0.33 + fillScore * 0.2 + sizeScore * 0.19,
          0,
          0.99,
        );
        const detection: TrackerDetection = {
          found: true,
          centerX,
          centerY,
          markerSizePx: Math.sqrt(area),
          confidence,
          corners,
          threshold: 0,
          reason: "Detected the strongest high-contrast square marker contour.",
        };
        if (
          !best ||
          detection.confidence * detection.markerSizePx >
            best.confidence * best.markerSizePx
        ) {
          best = detection;
        }
      } finally {
        approx.delete();
        contour.delete();
      }
    }

    return (
      best ?? {
        found: false,
        centerX: 0,
        centerY: 0,
        markerSizePx: 0,
        confidence: 0,
        corners: [],
        threshold: 0,
        reason: "No high-contrast square marker was visible in this frame.",
      }
    );
  } finally {
    src.delete();
    gray.delete();
    blurred.delete();
    thresholded.delete();
    contours.delete();
    hierarchy.delete();
  }
}

function readCorners(approx: { data32S: Int32Array; rows: number }) {
  const corners: Array<{ x: number; y: number }> = [];
  for (let row = 0; row < approx.rows; row += 1) {
    corners.push({
      x: approx.data32S[row * 2],
      y: approx.data32S[row * 2 + 1],
    });
  }
  return corners;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

Comlink.expose({ ready, detectFrame });
