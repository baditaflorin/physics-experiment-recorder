import Papa from "papaparse";

import { dedupeIssues, issue } from "./errors";
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

type CsvField = {
  field: string;
  scale: number;
  unit: "seconds" | "meters" | "pixels";
};

type ParsedCsv = {
  data: Array<Record<string, string>>;
  fields: string[];
  rowCount: number;
  headerless: boolean;
  parseErrors: Papa.ParseError[];
};

const timeFields = [
  { names: ["t", "time", "seconds", "sec", "timestamp"], scale: 1 },
  { names: ["time_s", "timestamp_s"], scale: 1 },
  { names: ["time_ms", "timestamp_ms", "ms", "milliseconds"], scale: 0.001 },
];
const xPositionFields = [
  {
    names: ["x", "x_m", "x_meters", "position_m", "position"],
    scale: 1,
    unit: "meters",
  },
  {
    names: ["x_cm", "x_centimeters", "position_cm"],
    scale: 0.01,
    unit: "meters",
  },
  {
    names: ["x_mm", "x_millimeters", "position_mm"],
    scale: 0.001,
    unit: "meters",
  },
  {
    names: ["x_px", "x_pixel", "x_pixels", "center_x", "cx"],
    scale: 1,
    unit: "pixels",
  },
] as const;
const yPositionFields = [
  { names: ["y", "y_m", "y_meters", "height_m"], scale: 1, unit: "meters" },
  {
    names: ["y_cm", "y_centimeters", "height_cm"],
    scale: 0.01,
    unit: "meters",
  },
  {
    names: ["y_mm", "y_millimeters", "height_mm"],
    scale: 0.001,
    unit: "meters",
  },
  {
    names: ["y_px", "y_pixel", "y_pixels", "center_y", "cy"],
    scale: 1,
    unit: "pixels",
  },
] as const;
const confidenceNames = ["confidence", "score", "quality"];

export async function importTrackCsv(
  rawInput: string,
  options: CsvImportOptions,
): Promise<ExperimentRecord> {
  const normalized = normalizeTextInput(rawInput);
  const checksum = await sha256Hex(normalized);
  const parsed = parseCsv(normalized);

  const issues = parsed.parseErrors.map((error) =>
    issue(
      "warning",
      "CSV row could not be read cleanly",
      error.message,
      "Check quoting, embedded commas, and incomplete rows before trusting the export.",
    ),
  );
  if (parsed.headerless) {
    issues.push(
      issue(
        "warning",
        "Headerless CSV inferred",
        "The first row was numeric, so the app treated columns as time, x, y, and optional confidence.",
        "Add headers if the column order is different.",
        "header",
      ),
    );
  }

  const fields = parsed.fields;
  const timeField = pickTimeField(fields);
  const xField = pickPositionField(fields, xPositionFields);
  const yField = pickPositionField(fields, yPositionFields);
  const confidenceKey = pickField(fields, confidenceNames);

  if (!timeField) {
    issues.push(
      issue(
        "error",
        "No time column found",
        "The track needs a time, t, seconds, time_ms, sec, or timestamp column.",
        "Rename the time column or export CSV from the app.",
        "time",
      ),
    );
  }

  if (!xField && !yField) {
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
    const rawTime = normalizeNumber(timeField ? row[timeField.field] : index);
    const t =
      rawTime === null || !timeField ? rawTime : rawTime * timeField.scale;
    const xRaw = normalizeNumber(xField ? row[xField.field] : undefined);
    const yRaw = normalizeNumber(yField ? row[yField.field] : undefined);
    const xMeters =
      xField && xRaw !== null && xField.unit === "meters"
        ? xRaw * xField.scale
        : null;
    const yMeters =
      yField && yRaw !== null && yField.unit === "meters"
        ? yRaw * yField.scale
        : null;
    const xPx =
      xField && xRaw !== null && xField.unit === "pixels" ? xRaw : null;
    const yPx =
      yField && yRaw !== null && yField.unit === "pixels" ? yRaw : null;
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
      issues.push(
        issue(
          "warning",
          "Incomplete position row",
          `Row ${index + 2} does not contain a usable x or y position.`,
          "Keep the row out of the fit or fill in the missing coordinate.",
          "position",
        ),
      );
      return;
    }
    const rowIssues: string[] = [];
    if (x === null || y === null) {
      rowIssues.push("incomplete-position-row");
      issues.push(
        issue(
          "warning",
          "Incomplete position row",
          `Row ${index + 2} has only one usable coordinate.`,
          "The app kept the row with the missing coordinate set to zero; verify the plot before exporting.",
          "position",
        ),
      );
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
      issues: rowIssues,
    });
  });

  points.sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));
  annotateOutlierSamples(points);
  if (parsed.rowCount === 0) {
    issues.push(
      issue(
        "error",
        "CSV has no data rows",
        "Only headers or blank lines were found.",
        "Export a track with timestamped positions or load a video.",
      ),
    );
  }
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
    rows: parsed.rowCount,
  };
  const hasMeterUnits = xField?.unit === "meters" || yField?.unit === "meters";
  const calibration: Calibration = {
    tagSizeMeters: options.tagSizeMeters,
    metersPerPixel: hasMeterUnits ? 1 : 0.001,
    yAxis: "up",
    inferredFrom: hasMeterUnits ? "csv-meters" : "manual-default",
    confidence: hasMeterUnits ? 0.95 : 0.35,
  };
  const inference = inferExperiment(points);
  const id = stableId("exp", checksum);
  const allIssues = dedupeIssues([...issues, ...inference.anomalies]);

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
    issues: allIssues,
    activity: [
      {
        id: stableId("act", `${id}:import`),
        at: options.lastModified ?? new Date(0).toISOString(),
        action: "Imported CSV track",
        detail: `${points.length} usable samples from ${parsed.rowCount} rows.`,
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

function pickField(fields: string[], candidates: readonly string[]) {
  return candidates.find((candidate) => fields.includes(candidate));
}

function pickTimeField(fields: string[]): CsvField | null {
  for (const candidate of timeFields) {
    const field = pickField(fields, candidate.names);
    if (field) {
      return { field, scale: candidate.scale, unit: "seconds" };
    }
  }
  return null;
}

function pickPositionField(
  fields: string[],
  candidates: typeof xPositionFields | typeof yPositionFields,
): CsvField | null {
  for (const candidate of candidates) {
    const field = pickField(fields, candidate.names);
    if (field) {
      return { field, scale: candidate.scale, unit: candidate.unit };
    }
  }
  return null;
}

function parseCsv(input: string): ParsedCsv {
  const delimiter = sniffDelimiter(input);
  if (looksHeaderless(input, delimiter)) {
    const parsed = Papa.parse<string[]>(input, {
      delimiter,
      header: false,
      skipEmptyLines: "greedy",
    });
    const rows = parsed.data.filter((row) =>
      row.some((cell) => String(cell).trim()),
    );
    return {
      data: rows.map((row) => ({
        t: row[0] ?? "",
        x_m: row[1] ?? "",
        y_m: row[2] ?? "",
        confidence: row[3] ?? "",
      })),
      fields: ["t", "x_m", "y_m", "confidence"],
      rowCount: rows.length,
      headerless: true,
      parseErrors: parsed.errors,
    };
  }
  const parsed = Papa.parse<Record<string, string>>(input, {
    delimiter,
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) =>
      header.trim().toLowerCase().replace(/\s+/g, "_"),
  });
  return {
    data: parsed.data,
    fields: parsed.meta.fields ?? [],
    rowCount: parsed.data.length,
    headerless: false,
    parseErrors: parsed.errors,
  };
}

function looksHeaderless(input: string, delimiter: string) {
  const first = input
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  if (!first) {
    return false;
  }
  const cells = first.split(delimiter);
  return (
    cells.length >= 3 &&
    cells.slice(0, 3).every((cell) => normalizeNumber(cell) !== null)
  );
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

function annotateOutlierSamples(points: MotionPoint[]) {
  if (points.length < 5) {
    return;
  }
  const stepDistances = points.slice(1).map((point, index) => {
    const previous = points[index];
    return Math.hypot(
      point.xMeters - previous.xMeters,
      point.yMeters - previous.yMeters,
    );
  });
  const sorted = [...stepDistances].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  if (median === 0) {
    return;
  }
  stepDistances.forEach((distance, index) => {
    if (distance > median * 4 && distance > 0.05) {
      points[index + 1].issues.push("position-outlier");
    }
  });
}

function titleFromName(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
