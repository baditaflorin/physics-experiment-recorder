import { toCsv } from "./csv";
import { roundForExport } from "./hash";
import { validateExperimentRecord } from "./schema";
import type { ExperimentRecord } from "./types";

export function serializeExperiment(record: ExperimentRecord) {
  const normalized = {
    ...record,
    calibration: {
      ...record.calibration,
      tagSizeMeters: roundForExport(record.calibration.tagSizeMeters),
      metersPerPixel: roundForExport(record.calibration.metersPerPixel, 10),
      confidence: roundForExport(record.calibration.confidence, 4),
    },
    points: record.points.map((point) => ({
      ...point,
      t: roundForExport(point.t, 6),
      xPx: point.xPx === undefined ? undefined : roundForExport(point.xPx, 4),
      yPx: point.yPx === undefined ? undefined : roundForExport(point.yPx, 4),
      xMeters: roundForExport(point.xMeters, 8),
      yMeters: roundForExport(point.yMeters, 8),
      confidence: roundForExport(point.confidence, 4),
      markerSizePx:
        point.markerSizePx === undefined
          ? undefined
          : roundForExport(point.markerSizePx, 4),
    })),
    fit: record.fit
      ? {
          ...record.fit,
          r2: roundForExport(record.fit.r2, 5),
          rmse: roundForExport(record.fit.rmse, 8),
          parameters: record.fit.parameters.map((parameter) => ({
            ...parameter,
            value: roundForExport(parameter.value, 8),
            confidence: roundForExport(parameter.confidence, 4),
          })),
          fitted: record.fit.fitted.map((point) => ({
            t: roundForExport(point.t, 6),
            value: roundForExport(point.value, 8),
          })),
        }
      : undefined,
  };
  validateExperimentRecord(normalized);
  return `${JSON.stringify(normalized, null, 2)}\n`;
}

export function serializeTrackCsv(record: ExperimentRecord) {
  return `${toCsv(record.points)}\n`;
}

export function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
