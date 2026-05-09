export function normalizeTextInput(input: string) {
  return input
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

export function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function confidenceLevel(confidence: number) {
  if (confidence >= 0.78) {
    return "high";
  }
  if (confidence >= 0.48) {
    return "medium";
  }
  return "low";
}
