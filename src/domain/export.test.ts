import { describe, expect, it } from "vitest";

import { demoExperiment } from "./demo";
import { serializeExperiment } from "./export";

describe("experiment export", () => {
  it("is deterministic for the same record", () => {
    const record = demoExperiment("0.1.0", "test");
    expect(serializeExperiment(record)).toBe(serializeExperiment(record));
  });

  it("carries provenance fields", () => {
    const parsed = JSON.parse(
      serializeExperiment(demoExperiment("0.1.0", "abc123")),
    );
    expect(parsed.schemaVersion).toBe("experiment-record/v1");
    expect(parsed.app.commit).toBe("abc123");
    expect(parsed.source.checksum).toBe("demo-pendulum-v1");
  });
});
