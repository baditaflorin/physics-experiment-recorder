import { issue } from "./errors";
import type {
  DomainIssue,
  FitParameter,
  FitResult,
  InferenceSummary,
  ModelKind,
  MotionPoint,
} from "./types";

type FitInput = {
  modelKind: ModelKind;
  points: MotionPoint[];
};

export function inferExperiment(points: MotionPoint[]): InferenceSummary {
  const anomalies = findAnomalies(points);
  if (points.length < 3) {
    return {
      experimentKind: "falling",
      modelKind: "constant-acceleration",
      confidence: 0.2,
      reasons: [
        "Fewer than three points were available, so the safest model is constant acceleration.",
      ],
      anomalies,
    };
  }

  const xs = points.map((point) => point.xMeters);
  const ys = points.map((point) => point.yMeters);
  const xRange = range(xs);
  const yRange = range(ys);
  const signChanges = countVelocitySignChanges(
    points,
    xRange >= yRange ? "xMeters" : "yMeters",
  );
  const monotonicY = monotonicScore(ys);
  const monotonicX = monotonicScore(xs);

  if (signChanges >= 2) {
    return {
      experimentKind: "pendulum",
      modelKind: "pendulum",
      confidence: Math.min(0.96, 0.55 + signChanges * 0.1),
      reasons: [
        `The dominant coordinate reverses direction ${signChanges} times.`,
        "Oscillating tracks usually fit a pendulum model first.",
      ],
      anomalies,
    };
  }

  if (yRange > xRange * 1.35 && monotonicY > 0.72) {
    return {
      experimentKind: "falling",
      modelKind: "constant-acceleration",
      confidence: Math.min(0.94, 0.52 + monotonicY * 0.36),
      reasons: [
        "Vertical displacement dominates the track.",
        "The vertical coordinate changes mostly in one direction.",
      ],
      anomalies,
    };
  }

  return {
    experimentKind: "cart",
    modelKind: "damped-cart",
    confidence: Math.min(0.9, 0.44 + Math.max(monotonicX, monotonicY) * 0.38),
    reasons: [
      "The track is mostly one-directional without strong vertical dominance.",
      "A damped cart model is the most useful first guess.",
    ],
    anomalies,
  };
}

export function fitMotion(input: FitInput): FitResult {
  const inferred = inferExperiment(input.points);
  const modelKind =
    input.modelKind === "auto"
      ? inferred.modelKind
      : (input.modelKind as FitResult["modelKind"]);

  if (input.points.length < 3) {
    return failedFit(modelKind, "Curve fit needs at least three points.");
  }

  if (modelKind === "pendulum") {
    return fitPendulum(input.points);
  }
  if (modelKind === "damped-cart") {
    return fitDampedCart(input.points);
  }
  return fitConstantAcceleration(input.points);
}

export function fitConstantAcceleration(points: MotionPoint[]): FitResult {
  const axis = chooseAxis(points);
  const values = points.map((point) =>
    axis === "x" ? point.xMeters : point.yMeters,
  );
  const coefficients = polynomialFit(
    points.map((point) => point.t),
    values,
    2,
  );
  const [p0, p1, p2] = coefficients;
  const fitted = points.map((point) => ({
    t: point.t,
    value: p0 + p1 * point.t + p2 * point.t * point.t,
  }));
  const stats = fitStats(
    values,
    fitted.map((point) => point.value),
  );
  return {
    modelKind: "constant-acceleration",
    parameters: [
      parameter("position0", `${axis}(0)`, p0, "m", stats.r2),
      parameter("velocity0", `${axis} velocity`, p1, "m/s", stats.r2),
      parameter(
        "acceleration",
        `${axis} acceleration`,
        2 * p2,
        "m/s^2",
        stats.r2,
      ),
    ],
    ...stats,
    fitted,
    engine: "javascript",
    issues:
      stats.r2 < 0.72 ? [lowFitIssue("constant acceleration", stats.r2)] : [],
  };
}

export function fitDampedCart(points: MotionPoint[]): FitResult {
  const axis = chooseAxis(points);
  const values = points.map((point) =>
    axis === "x" ? point.xMeters : point.yMeters,
  );
  const times = points.map((point) => point.t);
  const linear = polynomialFit(times, values, 1);
  const velocity = linear[1];
  const residuals = values.map(
    (value, index) => value - (linear[0] + linear[1] * times[index]),
  );
  const residualSlope = polynomialFit(
    times,
    residuals.map((value) => Math.abs(value) + 1e-6),
    1,
  )[1];
  const friction = Math.max(
    0,
    Math.min(5, Math.abs(residualSlope / (Math.abs(velocity) + 1e-6))),
  );
  const fitted = times.map((time) => ({
    t: time,
    value: linear[0] + velocity * time,
  }));
  const stats = fitStats(
    values,
    fitted.map((point) => point.value),
  );
  return {
    modelKind: "damped-cart",
    parameters: [
      parameter("position0", `${axis}(0)`, linear[0], "m", stats.r2),
      parameter("velocity", `${axis} velocity`, velocity, "m/s", stats.r2),
      parameter(
        "frictionCoefficient",
        "friction coefficient proxy",
        friction,
        "1/s",
        0.52 + stats.r2 / 2,
      ),
    ],
    ...stats,
    fitted,
    engine: "javascript",
    issues: stats.r2 < 0.62 ? [lowFitIssue("damped cart", stats.r2)] : [],
  };
}

export function fitPendulum(points: MotionPoint[]): FitResult {
  const axis = chooseAxis(points);
  const values = points.map((point) =>
    axis === "x" ? point.xMeters : point.yMeters,
  );
  const times = points.map((point) => point.t);
  const offset = mean(values);
  const centered = values.map((value) => value - offset);
  const amplitude = Math.max(...centered.map((value) => Math.abs(value)));
  const zeroCrossings = estimateZeroCrossings(times, centered);
  const period =
    zeroCrossings.length >= 3
      ? 2 * mean(differences(zeroCrossings))
      : Math.max(0.2, (times.at(-1) ?? 1) - times[0]);
  const omega = (2 * Math.PI) / period;
  const phase = centered[0] >= 0 ? 0 : Math.PI;
  const fitted = times.map((time) => ({
    t: time,
    value: offset + amplitude * Math.cos(omega * (time - times[0]) + phase),
  }));
  const stats = fitStats(
    values,
    fitted.map((point) => point.value),
  );
  const length = 9.80665 / (omega * omega);
  return {
    modelKind: "pendulum",
    parameters: [
      parameter("offset", `${axis} center`, offset, "m", stats.r2),
      parameter("amplitude", "amplitude", amplitude, "m", stats.r2),
      parameter(
        "period",
        "period",
        period,
        "s",
        Math.min(0.96, 0.45 + zeroCrossings.length * 0.11),
      ),
      parameter(
        "length",
        "inferred pendulum length",
        length,
        "m",
        stats.r2 * 0.9,
      ),
    ],
    ...stats,
    fitted,
    engine: "javascript",
    issues: stats.r2 < 0.58 ? [lowFitIssue("pendulum", stats.r2)] : [],
  };
}

export function findAnomalies(points: MotionPoint[]): DomainIssue[] {
  const issues: DomainIssue[] = [];
  if (points.length === 0) {
    issues.push(
      issue(
        "warning",
        "No track samples yet",
        "The app has no positions to fit.",
        "Import CSV data or analyze a video.",
      ),
    );
    return issues;
  }
  const times = points.map((point) => point.t);
  if (new Set(times).size !== times.length) {
    issues.push(
      issue(
        "warning",
        "Duplicate timestamps detected",
        "Multiple samples share the same time value.",
        "Keep the highest-confidence sample or re-run analysis with a lower frame rate.",
        "t",
      ),
    );
  }
  const gaps = differences(times);
  const medianGap = median(gaps);
  if (gaps.some((gap) => gap > medianGap * 3 && gap > 0.08)) {
    issues.push(
      issue(
        "warning",
        "Large time gap detected",
        "The object was not tracked consistently between nearby samples.",
        "Check for tag occlusion, motion blur, or a sample rate that is too high.",
        "t",
      ),
    );
  }
  const lowConfidence = points.filter(
    (point) => point.confidence < 0.45,
  ).length;
  if (lowConfidence > Math.max(2, points.length * 0.2)) {
    issues.push(
      issue(
        "warning",
        "Several low-confidence samples",
        "The marker was weak, blurred, or partly hidden in many frames.",
        "Use a larger tag, improve lighting, or crop to the experiment area.",
        "confidence",
      ),
    );
  }
  return issues;
}

function chooseAxis(points: MotionPoint[]) {
  return range(points.map((point) => point.xMeters)) >=
    range(points.map((point) => point.yMeters))
    ? "x"
    : "y";
}

function polynomialFit(xs: number[], ys: number[], degree: 1 | 2) {
  if (degree === 1) {
    const xMean = mean(xs);
    const yMean = mean(ys);
    const numerator = xs.reduce(
      (sum, x, index) => sum + (x - xMean) * (ys[index] - yMean),
      0,
    );
    const denominator = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0) || 1;
    const slope = numerator / denominator;
    return [yMean - slope * xMean, slope];
  }
  const sums = xs.reduce(
    (acc, x, index) => {
      const y = ys[index];
      acc.x0 += 1;
      acc.x1 += x;
      acc.x2 += x ** 2;
      acc.x3 += x ** 3;
      acc.x4 += x ** 4;
      acc.y += y;
      acc.xy += x * y;
      acc.x2y += x * x * y;
      return acc;
    },
    { x0: 0, x1: 0, x2: 0, x3: 0, x4: 0, y: 0, xy: 0, x2y: 0 },
  );
  return solve3(
    [
      [sums.x0, sums.x1, sums.x2],
      [sums.x1, sums.x2, sums.x3],
      [sums.x2, sums.x3, sums.x4],
    ],
    [sums.y, sums.xy, sums.x2y],
  );
}

function solve3(matrix: number[][], vector: number[]) {
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let col = 0; col < 3; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < 3; row += 1) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[pivot][col])) {
        pivot = row;
      }
    }
    [augmented[col], augmented[pivot]] = [augmented[pivot], augmented[col]];
    const divisor = augmented[col][col] || 1e-12;
    for (let item = col; item < 4; item += 1) {
      augmented[col][item] /= divisor;
    }
    for (let row = 0; row < 3; row += 1) {
      if (row === col) continue;
      const factor = augmented[row][col];
      for (let item = col; item < 4; item += 1) {
        augmented[row][item] -= factor * augmented[col][item];
      }
    }
  }
  return augmented.map((row) => row[3]);
}

function fitStats(actual: number[], fitted: number[]) {
  const actualMean = mean(actual);
  const ssTotal =
    actual.reduce((sum, value) => sum + (value - actualMean) ** 2, 0) || 1e-12;
  const ssResidual = actual.reduce(
    (sum, value, index) => sum + (value - fitted[index]) ** 2,
    0,
  );
  const rmse = Math.sqrt(ssResidual / actual.length);
  return {
    r2: Math.max(0, Math.min(1, 1 - ssResidual / ssTotal)),
    rmse,
  };
}

function countVelocitySignChanges(
  points: MotionPoint[],
  key: "xMeters" | "yMeters",
) {
  const velocities = points
    .slice(1)
    .map((point, index) => point[key] - points[index][key]);
  return velocities
    .slice(1)
    .filter(
      (velocity, index) => Math.sign(velocity) !== Math.sign(velocities[index]),
    ).length;
}

function monotonicScore(values: number[]) {
  const diffs = differences(values);
  if (diffs.length === 0) return 0;
  const positives = diffs.filter((value) => value >= 0).length;
  const negatives = diffs.length - positives;
  return Math.max(positives, negatives) / diffs.length;
}

function estimateZeroCrossings(times: number[], values: number[]) {
  const crossings: number[] = [];
  for (let index = 1; index < values.length; index += 1) {
    if (Math.sign(values[index - 1]) !== Math.sign(values[index])) {
      crossings.push((times[index - 1] + times[index]) / 2);
    }
  }
  return crossings;
}

function differences(values: number[]) {
  return values.slice(1).map((value, index) => value - values[index]);
}

function range(values: number[]) {
  return Math.max(...values) - Math.min(...values);
}

function mean(values: number[]) {
  return (
    values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
  );
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function parameter(
  name: string,
  label: string,
  value: number,
  unit: string,
  confidence: number,
): FitParameter {
  return {
    name,
    label,
    value,
    unit,
    confidence: Math.max(0.05, Math.min(0.99, confidence)),
  };
}

function lowFitIssue(model: string, r2: number) {
  return issue(
    "warning",
    "Fit confidence is low",
    `The ${model} model explains ${(r2 * 100).toFixed(0)}% of the observed motion.`,
    "Try a different model, remove outlier samples, or re-run tracking with a clearer marker.",
    "model",
  );
}

function failedFit(
  modelKind: FitResult["modelKind"],
  message: string,
): FitResult {
  return {
    modelKind,
    parameters: [],
    r2: 0,
    rmse: 0,
    fitted: [],
    engine: "javascript",
    issues: [
      issue(
        "error",
        "Fit could not run",
        message,
        "Add more valid position samples.",
      ),
    ],
  };
}
