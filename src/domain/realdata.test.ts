import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

import { describe, expect, it } from "vitest";

import { importTrackCsv } from "./csv";
import { serializeExperiment } from "./export";
import { fitMotion } from "./physics";
import { validateExperimentRecord } from "./schema";

type ExpectedFixture = {
  expectedKind: string;
  expectedModel: string;
  minPoints: number;
  maxErrors: number;
  requiredWarnings: string[];
};

const fixtureDir = "test/fixtures/realdata";
const csvFixtures = readdirSync(fixtureDir)
  .filter((file) => file.endsWith(".csv"))
  .sort();

describe("real-data fixtures", () => {
  it.each(csvFixtures)(
    "%s imports, infers, fits, and exports deterministically",
    async (file) => {
      const csv = readFileSync(join(fixtureDir, file), "utf8");
      const expected = JSON.parse(
        readFileSync(
          join(fixtureDir, file.replace(".csv", ".expected.json")),
          "utf8",
        ),
      ) as ExpectedFixture;
      const record = await importTrackCsv(csv, {
        name: file,
        appVersion: "0.2.0",
        commit: "fixture",
        lastModified: "2026-05-09T00:00:00.000Z",
        tagSizeMeters: 0.08,
      });
      const fit = fitMotion({ modelKind: "auto", points: record.points });
      const fitted = { ...record, fit };
      const errorCount = fitted.issues.filter(
        (item) => item.severity === "error",
      ).length;
      const issueNames = fitted.issues.map((item) => item.what);

      expect(fitted.points.length, basename(file)).toBeGreaterThanOrEqual(
        expected.minPoints,
      );
      expect(errorCount, basename(file)).toBeLessThanOrEqual(
        expected.maxErrors,
      );
      expect(fitted.inference.experimentKind, basename(file)).toBe(
        expected.expectedKind,
      );
      expect(fit.modelKind, basename(file)).toBe(expected.expectedModel);
      for (const warning of expected.requiredWarnings) {
        expect(issueNames, basename(file)).toContain(warning);
      }
      expect(validateExperimentRecord(fitted).id).toBe(fitted.id);
      expect(serializeExperiment(fitted)).toBe(serializeExperiment(fitted));
    },
  );
});
