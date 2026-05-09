import type { ExperimentRecord, ReachableState } from "../../domain/types";

type DebugPanelProps = {
  record: ExperimentRecord | null;
  state: ReachableState;
  progress: string;
  enabled: boolean;
};

export function DebugPanel({
  record,
  state,
  progress,
  enabled,
}: DebugPanelProps) {
  if (!enabled) {
    return null;
  }
  return (
    <aside className="debug-panel" aria-label="Debug information">
      <h2>Debug</h2>
      <dl>
        <dt>State</dt>
        <dd>{state}</dd>
        <dt>Progress</dt>
        <dd>{progress || "idle"}</dd>
        <dt>Samples</dt>
        <dd>{record?.points.length ?? 0}</dd>
        <dt>Inference</dt>
        <dd>
          {record
            ? `${record.inference.modelKind} (${Math.round(record.inference.confidence * 100)}%)`
            : "none"}
        </dd>
        <dt>Issues</dt>
        <dd>{record?.issues.length ?? 0}</dd>
      </dl>
      <pre>{JSON.stringify(record?.inference ?? {}, null, 2)}</pre>
    </aside>
  );
}
