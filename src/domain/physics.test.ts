import { describe, expect, it } from "vitest";

import { demoExperiment } from "./demo";
import {
  fitConstantAcceleration,
  fitDampedCart,
  fitMotion,
  inferExperiment,
} from "./physics";
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

  it("recovers the kinetic friction coefficient from a decelerating cart", () => {
    // Cart with v0 = 2 m/s and μ_k = 0.3 sliding to a stop in 0.68 s.
    const v0 = 2;
    const muK = 0.3;
    const g = 9.80665;
    const a = -muK * g;
    const stopTime = -v0 / a;
    const points: MotionPoint[] = Array.from({ length: 30 }, (_, index) => {
      const t = (index / 29) * 0.6; // sample while still moving
      return {
        id: `p-${index}`,
        t,
        xMeters:
          t < stopTime
            ? v0 * t + 0.5 * a * t * t
            : v0 * stopTime + 0.5 * a * stopTime * stopTime,
        yMeters: 0,
        confidence: 0.95,
        issues: [],
      };
    });
    const fit = fitDampedCart(points);
    const friction = fit.parameters.find(
      (parameter) => parameter.name === "frictionCoefficient",
    );
    const acceleration = fit.parameters.find(
      (parameter) => parameter.name === "acceleration",
    );
    expect(friction?.value).toBeCloseTo(muK, 1);
    expect(acceleration?.value).toBeCloseTo(a, 0);
    expect(fit.r2).toBeGreaterThan(0.95);
  });

  it("predicts a stop time consistent with the recovered acceleration", () => {
    const v0 = 1.5;
    const a = -2.5;
    const expectedStop = -v0 / a; // 0.6 s
    const points: MotionPoint[] = Array.from({ length: 20 }, (_, index) => {
      const t = (index / 19) * 0.5; // sample while still moving
      return {
        id: `p-${index}`,
        t,
        xMeters: v0 * t + 0.5 * a * t * t,
        yMeters: 0,
        confidence: 0.95,
        issues: [],
      };
    });
    const fit = fitDampedCart(points);
    const stopTime = fit.parameters.find(
      (parameter) => parameter.name === "stopTime",
    );
    expect(stopTime?.value).toBeCloseTo(expectedStop, 1);
  });

  it("draws a curved fitted line rather than a straight line for a decelerating cart", () => {
    const points: MotionPoint[] = Array.from({ length: 14 }, (_, index) => {
      const t = (index / 13) * 0.5;
      return {
        id: `p-${index}`,
        t,
        xMeters: 1.5 * t - 1.25 * t * t,
        yMeters: 0,
        confidence: 0.95,
        issues: [],
      };
    });
    const fit = fitDampedCart(points);
    // Sample slope at the start and end of the fitted curve: if the cart is
    // decelerating, the end slope must be lower than the start slope.
    const startSlope =
      (fit.fitted[1].value - fit.fitted[0].value) /
      (fit.fitted[1].t - fit.fitted[0].t);
    const endSlope =
      (fit.fitted.at(-1)!.value - fit.fitted.at(-2)!.value) /
      (fit.fitted.at(-1)!.t - fit.fitted.at(-2)!.t);
    expect(endSlope).toBeLessThan(startSlope);
  });
});
