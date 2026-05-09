import Papa from "papaparse";

import { issue } from "./errors";
import { sha256Hex, stableId } from "./hash";
import { normalizeNumber, normalizeTextInput } from "./normalize";
import { inferExperiment } from "./physics";
import type {
  Calibration,
  ExperimentRecord,
  MotionPoint,
  SourceInfo,
} from "./types";

type CsvImportOptions = {
  name: string;
  appVersion: string;
  commit: string;
  lastModified?: string;
  tagSizeMeters: number;
};

const timeNames = ["t", "time", "seconds", "sec", "timestamp"];
const xMeterNames = ["x", "x_m", "x_meters", "position_m", "position"];
const yMeterNames = ["y", "y_m", "y_meters", "height_m"];
const xPixelNames = ["x_px", "x_pixel", "x_pixels", "center_x", "cx"];
const yPixelNames = ["y_px", "y_pixel", "y_pixels", "center_y", "cy"];
const confidenceNames = ["confidence", "score", "quality"];

export async function importTrackCsv(
  rawInput: string,
  options: CsvImportOptions,
): Promise<ExperimentRecord> {
  const normalized = normalizeTextInput(rawInput);
  const checksum = await sha256Hex(normalized);
  const parsed = Papa.parse<Record<string, string>>(normalized, {
    delimiter: sniffDelimiter(normalized),
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) =>
      header.trim().toLowerCase().replace(/\s+/g, "_"),
  });

  const issues = parsed.errors.map((error) =>
    issue(
      "warning",
      "CSV row could not be read cleanly",
      error.message,
      "Check quoting, embedded commas, and incomplete rows before trusting the export.",
    ),
  );
  const fields = parsed.meta.fields ?? [];
  const timeKey = pickField(fields, timeNames);
  const xMetersKey = pickField(fields, xMeterNames);
  const yMetersKey = pickField(fields, yMeterNames);
  const xPxKey = pickField(fields, xPixelNames);
  const yPxKey = pickField(fields, yPixelNames);
  const confidenceKey = pickField(fields, confidenceNames);

  if (!timeKey) {
    issues.push(
      issue(
        "error",
        "No time column found",
        "The track needs a time, t, seconds, sec, or timestamp column.",
        "Rename the time column or export CSV from the app.",
        "time",
      ),
    );
  }

  if (!xMetersKey && !yMetersKey && !xPxKey && !yPxKey) {
    issues.push(
      issue(
        "error",
        "No position columns found",
        "The CSV does not expose meter or pixel coordinates.",
        "Add x/y position columns or import a video instead.",
        "position",
      ),
    );
  }

  const points: MotionPoint[] = [];
  parsed.data.forEach((row, index) => {
    const t = normalizeNumber(timeKey ? row[timeKey] : index);
    const xMeters = normalizeNumber(xMetersKey ? row[xMetersKey] : undefined);
    const yMeters = normalizeNumber(yMetersKey ? row[yMetersKey] : undefined);
    const xPx = normalizeNumber(xPxKey ? row[xPxKey] : undefined);
    const yPx = normalizeNumber(yPxKey ? row[yPxKey] : undefined);
    const confidence = normalizeNumber(
      confidenceKey ? row[confidenceKey] : undefined,
    );

    if (t === null) {
      issues.push(
        issue(
          "warning",
          `Skipped row ${index + 2}`,
          "The time value is missing or not numeric.",
          "Fix that row or leave it out of the import.",
          "time",
        ),
      );
      return;
    }

    const x = xMeters ?? (xPx === null ? null : xPx * 0.001);
    const y = yMeters ?? (yPx === null ? null : yPx * 0.001);
    if (x === null && y === null) {
      return;
    }

    points.push({
      id: stableId("pt", `${checksum}:${index}:${t}:${x ?? ""}:${y ?? ""}`),
      t,
      xPx: xPx ?? undefined,
      yPx: yPx ?? undefined,
      xMeters: x ?? 0,
      yMeters: y ?? 0,
      confidence: clamp(confidence ?? 0.86, 0, 1),
      frame: index,
      issues: [],
    });
  });

  points.sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));
  if (points.length < 3) {
    issues.push(
      issue(
        "error",
        "Too few usable samples",
        "Curve fitting needs at least three timestamped positions.",
        "Import a longer track or analyze more video frames.",
      ),
    );
  }

  const source: SourceInfo = {
    kind: "csv",
    name: options.name,
    checksum,
    lastModified: options.lastModified,
    rows: parsed.data.length,
  };
  const calibration: Calibration = {
    tagSizeMeters: options.tagSizeMeters,
    metersPerPixel: xMetersKey || yMetersKey ? 1 : 0.001,
    yAxis: "up",
    inferredFrom: xMetersKey || yMetersKey ? "csv-meters" : "manual-default",
    confidence: xMetersKey || yMetersKey ? 0.95 : 0.35,
  };
  const inference = inferExperiment(points);
  const id = stableId("exp", checksum);

  return {
    schemaVersion: "experiment-record/v1",
    id,
    title: titleFromName(options.name),
    app: { version: options.appVersion, commit: options.commit },
    source,
    calibration,
    points,
    inference: {
      ...inference,
      anomalies: [
        ...inference.anomalies,
        ...issues.filter((item) => item.severity !== "info"),
      ],
    },
    issues,
    activity: [
      {
        id: stableId("act", `${id}:import`),
        at: options.lastModified ?? new Date(0).toISOString(),
        action: "Imported CSV track",
        detail: `${points.length} usable samples from ${parsed.data.length} rows.`,
      },
    ],
  };
}

export function toCsv(points: MotionPoint[]) {
  const rows = points.map((point) => ({
    id: point.id,
    t: point.t,
    x_meters: point.xMeters,
    y_meters: point.yMeters,
    x_px: point.xPx ?? "",
    y_px: point.yPx ?? "",
    confidence: point.confidence,
    frame: point.frame ?? "",
    marker_size_px: point.markerSizePx ?? "",
    issues: point.issues.join("|"),
  }));
  return Papa.unparse(rows, { newline: "\n" });
}

function pickField(fields: string[], candidates: string[]) {
  return candidates.find((candidate) => fields.includes(candidate));
}

function sniffDelimiter(input: string) {
  const sample = input.split("\n").slice(0, 5).join("\n");
  const semicolons = (sample.match(/;/g) ?? []).length;
  const tabs = (sample.match(/\t/g) ?? []).length;
  const commas = (sample.match(/,/g) ?? []).length;
  if (tabs > semicolons && tabs > commas) {
    return "\t";
  }
  if (semicolons >= commas) {
    return ";";
  }
  return ",";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function titleFromName(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
