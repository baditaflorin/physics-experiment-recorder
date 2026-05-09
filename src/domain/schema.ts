import { z } from "zod";

export const domainIssueSchema = z.object({
  id: z.string(),
  severity: z.enum(["info", "warning", "error"]),
  what: z.string().min(1),
  why: z.string().min(1),
  nextStep: z.string().min(1),
  field: z.string().optional(),
});

export const motionPointSchema = z.object({
  id: z.string(),
  t: z.number().finite(),
  xPx: z.number().finite().optional(),
  yPx: z.number().finite().optional(),
  xMeters: z.number().finite(),
  yMeters: z.number().finite(),
  confidence: z.number().min(0).max(1),
  frame: z.number().optional(),
  markerSizePx: z.number().finite().optional(),
  issues: z.array(z.string()),
});

export const experimentRecordSchema = z.object({
  schemaVersion: z.literal("experiment-record/v1"),
  id: z.string(),
  title: z.string(),
  app: z.object({
    version: z.string(),
    commit: z.string(),
  }),
  source: z.object({
    kind: z.enum(["demo", "video", "csv"]),
    name: z.string(),
    checksum: z.string(),
    lastModified: z.string().optional(),
    rows: z.number().optional(),
    durationSec: z.number().optional(),
  }),
  calibration: z.object({
    tagSizeMeters: z.number(),
    metersPerPixel: z.number(),
    originXPx: z.number().optional(),
    originYPx: z.number().optional(),
    yAxis: z.enum(["up", "down"]),
    inferredFrom: z.enum(["tag-size", "csv-meters", "manual-default"]),
    confidence: z.number().min(0).max(1),
  }),
  points: z.array(motionPointSchema),
  inference: z.object({
    experimentKind: z.enum(["pendulum", "cart", "falling"]),
    modelKind: z.enum(["constant-acceleration", "pendulum", "damped-cart"]),
    confidence: z.number().min(0).max(1),
    reasons: z.array(z.string()),
    anomalies: z.array(domainIssueSchema),
  }),
  fit: z
    .object({
      modelKind: z.enum(["constant-acceleration", "pendulum", "damped-cart"]),
      parameters: z.array(
        z.object({
          name: z.string(),
          label: z.string(),
          value: z.number(),
          unit: z.string(),
          confidence: z.number().min(0).max(1),
        }),
      ),
      r2: z.number(),
      rmse: z.number(),
      fitted: z.array(z.object({ t: z.number(), value: z.number() })),
      engine: z.enum(["javascript", "pyodide-scipy"]),
      plotPng: z.string().optional(),
      issues: z.array(domainIssueSchema),
    })
    .optional(),
  issues: z.array(domainIssueSchema),
  activity: z.array(
    z.object({
      id: z.string(),
      at: z.string(),
      action: z.string(),
      detail: z.string(),
    }),
  ),
});

export function validateExperimentRecord(value: unknown) {
  return experimentRecordSchema.parse(value);
}
