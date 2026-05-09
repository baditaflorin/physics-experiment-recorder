export type ExperimentKind = "auto" | "pendulum" | "cart" | "falling";

export type ModelKind =
  | "auto"
  | "constant-acceleration"
  | "pendulum"
  | "damped-cart";

export type SourceKind = "demo" | "video" | "csv";

export type ConfidenceLevel = "high" | "medium" | "low";

export type DomainSeverity = "info" | "warning" | "error";

export type ReachableState =
  | "idle"
  | "loading-source"
  | "loaded-empty"
  | "loaded-some"
  | "loaded-many"
  | "analyzing"
  | "fitting"
  | "cancelled"
  | "error-recoverable"
  | "error-fatal";

export type DomainIssue = {
  id: string;
  severity: DomainSeverity;
  what: string;
  why: string;
  nextStep: string;
  field?: string;
};

export type MotionPoint = {
  id: string;
  t: number;
  xPx?: number;
  yPx?: number;
  xMeters: number;
  yMeters: number;
  confidence: number;
  frame?: number;
  markerSizePx?: number;
  issues: string[];
};

export type Calibration = {
  tagSizeMeters: number;
  metersPerPixel: number;
  originXPx?: number;
  originYPx?: number;
  yAxis: "up" | "down";
  inferredFrom: "tag-size" | "csv-meters" | "manual-default";
  confidence: number;
};

export type SourceInfo = {
  kind: SourceKind;
  name: string;
  checksum: string;
  lastModified?: string;
  rows?: number;
  durationSec?: number;
};

export type InferenceSummary = {
  experimentKind: Exclude<ExperimentKind, "auto">;
  modelKind: Exclude<ModelKind, "auto">;
  confidence: number;
  reasons: string[];
  anomalies: DomainIssue[];
};

export type FitParameter = {
  name: string;
  label: string;
  value: number;
  unit: string;
  confidence: number;
};

export type FitResult = {
  modelKind: Exclude<ModelKind, "auto">;
  parameters: FitParameter[];
  r2: number;
  rmse: number;
  fitted: Array<{ t: number; value: number }>;
  engine: "javascript" | "pyodide-scipy";
  plotPng?: string;
  issues: DomainIssue[];
};

export type ActivityEntry = {
  id: string;
  at: string;
  action: string;
  detail: string;
};

export type ExperimentRecord = {
  schemaVersion: "experiment-record/v1";
  id: string;
  title: string;
  app: {
    version: string;
    commit: string;
  };
  source: SourceInfo;
  calibration: Calibration;
  points: MotionPoint[];
  inference: InferenceSummary;
  fit?: FitResult;
  issues: DomainIssue[];
  activity: ActivityEntry[];
};

export type VideoAnalysisOptions = {
  sampleRateFps: number;
  maxFrames: number;
  maxDimension: number;
  tagSizeMeters: number;
  yAxis: "up" | "down";
};

export type TrackerDetection = {
  found: boolean;
  centerX: number;
  centerY: number;
  markerSizePx: number;
  confidence: number;
  corners: Array<{ x: number; y: number }>;
  threshold: number;
  reason: string;
};
