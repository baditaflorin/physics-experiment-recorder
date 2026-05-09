import { describe, expect, it } from "vitest";

import { demoExperiment } from "./demo";
import { fitConstantAcceleration, fitMotion, inferExperiment } from "./physics";
import type { MotionPoint } from "./types";

describe("physics fitting", () => {
  it("infers pendulum-like motion from repeated direction changes", () => {
    const record = demoExperiment("0.1.0", "test");
    const inference = inferExperiment(record.points);
    expect(inference.experimentKind).toBe("pendulum");
    expect(inference.confidence).toBeGreaterThan(0.7);
  });

  it("computes acceleration from quadratic falling motion", () => {
    const points: MotionPoint[] = Array.from({ length: 24 }, (_, index) => {
      const t = index / 20;
      return {
        id: `p-${index}`,
        t,
        xMeters: 0,
        yMeters: 0.5 * 9.8 * t * t,
        confidence: 0.95,
        issues: [],
      };
    });
    const fit = fitConstantAcceleration(points);
    const acceleration = fit.parameters.find(
      (parameter) => parameter.name === "acceleration",
    );
    expect(acceleration?.value).toBeCloseTo(9.8, 1);
    expect(fit.r2).toBeGreaterThan(0.99);
  });

  it("returns a useful first fit in automatic mode", () => {
    const record = demoExperiment("0.1.0", "test");
    const fit = fitMotion({ points: record.points, modelKind: "auto" });
    expect(fit.parameters.length).toBeGreaterThan(0);
    expect(fit.modelKind).toBe("pendulum");
  });
});
