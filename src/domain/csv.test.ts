import { describe, expect, it } from "vitest";

import { importTrackCsv } from "./csv";

describe("CSV import", () => {
  it("normalizes BOM, CRLF, and decimal comma position data", async () => {
    const record = await importTrackCsv(
      "\uFEFFtime;x_m;y_m\r\n0;0,0;0,0\r\n0,1;0,2;0,05\r\n0,2;0,4;0,1\r\n",
      {
        name: "messy.csv",
        appVersion: "0.1.0",
        commit: "test",
        lastModified: "2026-05-09T00:00:00.000Z",
        tagSizeMeters: 0.08,
      },
    );
    expect(record.points).toHaveLength(3);
    expect(record.points[1].xMeters).toBeCloseTo(0.2);
    expect(record.issues.some((item) => item.severity === "error")).toBe(false);
  });

  it("returns actionable errors when position columns are missing", async () => {
    const record = await importTrackCsv("time,label\n0,A\n1,B\n", {
      name: "broken.csv",
      appVersion: "0.1.0",
      commit: "test",
      lastModified: "2026-05-09T00:00:00.000Z",
      tagSizeMeters: 0.08,
    });
    expect(record.issues.map((item) => item.what)).toContain(
      "No position columns found",
    );
    expect(record.issues[0].nextStep.length).toBeGreaterThan(10);
  });
});
