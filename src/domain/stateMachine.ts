import type { ExperimentRecord, ReachableState } from "./types";

export function deriveState(args: {
  record: ExperimentRecord | null;
  busy: "idle" | "loading" | "analyzing" | "fitting";
  cancelled: boolean;
  fatalError: boolean;
}): ReachableState {
  if (args.fatalError) {
    return "error-fatal";
  }
  if (args.cancelled) {
    return "cancelled";
  }
  if (args.busy === "loading") {
    return "loading-source";
  }
  if (args.busy === "analyzing") {
    return "analyzing";
  }
  if (args.busy === "fitting") {
    return "fitting";
  }
  if (!args.record) {
    return "idle";
  }
  if (args.record.points.length === 0) {
    return "loaded-empty";
  }
  if (args.record.issues.some((issue) => issue.severity === "error")) {
    return "error-recoverable";
  }
  if (args.record.points.length > 600) {
    return "loaded-many";
  }
  return "loaded-some";
}

export const stateCopy: Record<
  ReachableState,
  { label: string; exit: string }
> = {
  idle: {
    label: "Waiting for a video or track",
    exit: "Load demo data, import CSV, or choose a video.",
  },
  "loading-source": {
    label: "Reading source",
    exit: "Wait for parsing to finish.",
  },
  "loaded-empty": {
    label: "Loaded with no usable samples",
    exit: "Import a different file or analyze video.",
  },
  "loaded-some": {
    label: "Ready to fit",
    exit: "Run a fit, export, or replace the input.",
  },
  "loaded-many": {
    label: "Large track loaded",
    exit: "Fit, export, or reduce the sample rate.",
  },
  analyzing: {
    label: "Analyzing video",
    exit: "Cancel analysis or wait for it to finish.",
  },
  fitting: { label: "Fitting model", exit: "Wait for the fit to finish." },
  cancelled: {
    label: "Operation cancelled",
    exit: "Run analysis again or load another input.",
  },
  "error-recoverable": {
    label: "Needs attention",
    exit: "Follow the suggested fix or load another input.",
  },
  "error-fatal": {
    label: "Could not recover",
    exit: "Export what is available and reload the app.",
  },
};
