import { inferExperiment } from "./physics";
import type { Calibration, ExperimentRecord, MotionPoint } from "./types";

const appTimestamp = "2026-05-09T00:00:00.000Z";

export function demoExperiment(
  appVersion: string,
  commit: string,
): ExperimentRecord {
  const points = makePendulumPoints();
  const calibration: Calibration = {
    tagSizeMeters: 0.08,
    metersPerPixel: 0.0016,
    originXPx: 320,
    originYPx: 220,
    yAxis: "up",
    inferredFrom: "tag-size",
    confidence: 0.92,
  };
  const inference = inferExperiment(points);
  return {
    schemaVersion: "experiment-record/v1",
    id: "exp-demo-pendulum",
    title: "Demo Pendulum Track",
    app: { version: appVersion, commit },
    source: {
      kind: "demo",
      name: "Demo pendulum with AprilTag marker",
      checksum: "demo-pendulum-v1",
      lastModified: appTimestamp,
      rows: points.length,
      durationSec: points.at(-1)?.t ?? 0,
    },
    calibration,
    points,
    inference,
    issues: inference.anomalies,
    activity: [
      {
        id: "act-demo-loaded",
        at: appTimestamp,
        action: "Loaded demo track",
        detail:
          "Generated a damped pendulum trace with realistic tracking noise.",
      },
    ],
  };
}

function makePendulumPoints(): MotionPoint[] {
  const points: MotionPoint[] = [];
  const dt = 1 / 24;
  for (let index = 0; index < 150; index += 1) {
    const t = index * dt;
    const decay = Math.exp(-0.055 * t);
    const x = 0.32 * decay * Math.cos(2.82 * t + 0.12);
    const y = -0.07 * decay * Math.cos(5.64 * t + 0.08);
    const confidence = index % 37 === 0 ? 0.52 : 0.9 - (index % 5) * 0.015;
    points.push({
      id: `demo-pt-${index.toString().padStart(3, "0")}`,
      t,
      xPx: 320 + x / 0.0016,
      yPx: 220 - y / 0.0016,
      xMeters: x,
      yMeters: y,
      confidence,
      frame: index,
      markerSizePx: 50 + Math.sin(t) * 2,
      issues: confidence < 0.6 ? ["motion-blur"] : [],
    });
  }
  return points;
}
