import { issue } from "../domain/errors";
import type { FitResult, ModelKind, MotionPoint } from "../domain/types";

type Pyodide = {
  loadPackage: (packages: string[]) => Promise<void>;
  globals: {
    set: (name: string, value: unknown) => void;
  };
  runPythonAsync: (code: string) => Promise<string>;
};

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<Pyodide>;
  }
}

let pyodidePromise: Promise<Pyodide> | null = null;

export async function runPyodideFit(
  points: MotionPoint[],
  modelKind: ModelKind,
): Promise<FitResult> {
  const pyodide = await getPyodide();
  await pyodide.loadPackage(["numpy", "scipy", "matplotlib"]);
  pyodide.globals.set(
    "points_json",
    JSON.stringify(
      points.map((point) => ({
        t: point.t,
        x: point.xMeters,
        y: point.yMeters,
        confidence: point.confidence,
      })),
    ),
  );
  pyodide.globals.set("model_kind", modelKind);
  const raw = await pyodide.runPythonAsync(pythonFitCode);
  const parsed = JSON.parse(raw) as FitResult;
  return {
    ...parsed,
    engine: "pyodide-scipy",
    issues: parsed.issues ?? [],
  };
}

async function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = loadScript(
      "https://cdn.jsdelivr.net/pyodide/v0.29.4/full/pyodide.js",
    ).then(async () => {
      if (!window.loadPyodide) {
        throw new Error("Pyodide loader did not initialize.");
      }
      return window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.4/full/",
      });
    });
  }
  return pyodidePromise;
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.append(script);
  });
}

export function pyodideFailure(errorValue: unknown): FitResult["issues"] {
  return [
    issue(
      "warning",
      "SciPy fit did not finish",
      errorValue instanceof Error
        ? errorValue.message
        : "The Python runtime returned an unknown error.",
      "The app kept the JavaScript fit. Try again when the network is available or reduce the number of samples.",
      "pyodide",
    ),
  ];
}

const pythonFitCode = String.raw`
import base64
import io
import json
import math

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from scipy.optimize import curve_fit

points = json.loads(points_json)
t = np.array([p["t"] for p in points], dtype=float)
x = np.array([p["x"] for p in points], dtype=float)
y = np.array([p["y"] for p in points], dtype=float)
axis = x if np.ptp(x) >= np.ptp(y) else y
axis_name = "x" if np.ptp(x) >= np.ptp(y) else "y"
model = model_kind if model_kind != "auto" else "constant-acceleration"

def constant_acceleration(tt, p0, v0, a):
    return p0 + v0 * tt + 0.5 * a * tt * tt

def pendulum(tt, offset, amplitude, omega, phase, gamma):
    return offset + amplitude * np.cos(omega * tt + phase) * np.exp(-gamma * tt)

def damped_cart(tt, p0, velocity, amplitude, k):
    safe_k = np.maximum(k, 1e-5)
    return p0 + velocity * tt + amplitude * (1 - np.exp(-safe_k * tt))

if model == "pendulum":
    f = pendulum
    guess = [float(np.mean(axis)), float((np.max(axis) - np.min(axis)) / 2 or 0.1), 3.0, 0.0, 0.02]
    names = ["offset", "amplitude", "omega", "phase", "damping"]
    labels = [f"{axis_name} center", "amplitude", "angular frequency", "phase", "damping"]
    units = ["m", "m", "rad/s", "rad", "1/s"]
elif model == "damped-cart":
    f = damped_cart
    slope = float(np.polyfit(t, axis, 1)[0]) if len(t) > 1 else 0.0
    guess = [float(axis[0]), slope, 0.02, 0.2]
    names = ["position0", "velocity", "dragAmplitude", "frictionCoefficient"]
    labels = [f"{axis_name}(0)", f"{axis_name} velocity", "drag amplitude", "friction coefficient proxy"]
    units = ["m", "m/s", "m", "1/s"]
else:
    model = "constant-acceleration"
    f = constant_acceleration
    coeff = np.polyfit(t, axis, 2) if len(t) >= 3 else [0.0, 0.0, float(axis[0])]
    guess = [float(coeff[2]), float(coeff[1]), float(2 * coeff[0])]
    names = ["position0", "velocity0", "acceleration"]
    labels = [f"{axis_name}(0)", f"{axis_name} velocity", f"{axis_name} acceleration"]
    units = ["m", "m/s", "m/s^2"]

try:
    popt, _ = curve_fit(f, t, axis, p0=guess, maxfev=30000)
    fitted = f(t, *popt)
    residual = axis - fitted
    ss_res = float(np.sum(residual ** 2))
    ss_tot = float(np.sum((axis - np.mean(axis)) ** 2) or 1e-12)
    r2 = max(0.0, min(1.0, 1.0 - ss_res / ss_tot))
    rmse = float(np.sqrt(np.mean(residual ** 2)))
    dense_t = np.linspace(float(np.min(t)), float(np.max(t)), min(240, max(32, len(t) * 3)))
    dense_fit = f(dense_t, *popt)

    fig, ax = plt.subplots(figsize=(6, 3.4), dpi=160)
    ax.scatter(t, axis, s=16, label="tracked points", color="#047857")
    ax.plot(dense_t, dense_fit, label="SciPy fit", color="#334155", linewidth=2)
    ax.set_xlabel("time (s)")
    ax.set_ylabel(f"{axis_name} position (m)")
    ax.grid(True, alpha=0.25)
    ax.legend(loc="best")
    fig.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png")
    plt.close(fig)
    plot_png = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")

    result = {
        "modelKind": model,
        "parameters": [
            {
                "name": names[i],
                "label": labels[i],
                "value": float(popt[i]),
                "unit": units[i],
                "confidence": float(max(0.05, min(0.99, 0.45 + r2 * 0.52))),
            }
            for i in range(len(names))
        ],
        "r2": r2,
        "rmse": rmse,
        "fitted": [{"t": float(tt), "value": float(vv)} for tt, vv in zip(dense_t, dense_fit)],
        "engine": "pyodide-scipy",
        "plotPng": plot_png,
        "issues": [] if r2 >= 0.6 else [
            {
                "id": "warning-low-scipy-fit-confidence",
                "severity": "warning",
                "what": "SciPy fit confidence is low",
                "why": f"The selected model explains {r2 * 100:.0f}% of the observed motion.",
                "nextStep": "Try another model or remove outlier samples.",
                "field": "model",
            }
        ],
    }
except Exception as exc:
    result = {
        "modelKind": model,
        "parameters": [],
        "r2": 0,
        "rmse": 0,
        "fitted": [],
        "engine": "pyodide-scipy",
        "issues": [
            {
                "id": "error-scipy-fit-failed",
                "severity": "error",
                "what": "SciPy fit failed",
                "why": str(exc),
                "nextStep": "Use the JavaScript fit or simplify the track.",
                "field": "model",
            }
        ],
    }

json.dumps(result, sort_keys=True)
`;
