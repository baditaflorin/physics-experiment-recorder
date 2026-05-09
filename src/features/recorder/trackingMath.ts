import { stableId } from "../../domain/hash";
import type {
  Calibration,
  MotionPoint,
  TrackerDetection,
} from "../../domain/types";

type DetectionSample = {
  t: number;
  frame: number;
  detection: TrackerDetection;
};

export function medianPointSize(detections: TrackerDetection[]) {
  const sizes = detections
    .filter((detection) => detection.found && detection.markerSizePx > 0)
    .map((detection) => detection.markerSizePx)
    .sort((a, b) => a - b);
  return sizes[Math.floor(sizes.length / 2)] ?? 0;
}

export function pointsFromDetections(
  samples: DetectionSample[],
  calibration: Calibration,
  checksum: string,
): MotionPoint[] {
  const originX = calibration.originXPx ?? samples[0]?.detection.centerX ?? 0;
  const originY = calibration.originYPx ?? samples[0]?.detection.centerY ?? 0;
  return samples
    .filter((sample) => sample.detection.found)
    .map((sample) => {
      const xMeters =
        (sample.detection.centerX - originX) * calibration.metersPerPixel;
      const rawY =
        (sample.detection.centerY - originY) * calibration.metersPerPixel;
      const yMeters = calibration.yAxis === "up" ? -rawY : rawY;
      return {
        id: stableId(
          "pt",
          `${checksum}:${sample.frame}:${sample.t}:${sample.detection.centerX}:${sample.detection.centerY}`,
        ),
        t: sample.t,
        xPx: sample.detection.centerX,
        yPx: sample.detection.centerY,
        xMeters,
        yMeters,
        confidence: sample.detection.confidence,
        frame: sample.frame,
        markerSizePx: sample.detection.markerSizePx,
        issues:
          sample.detection.confidence < 0.45 ? ["low-confidence-marker"] : [],
      };
    });
}
