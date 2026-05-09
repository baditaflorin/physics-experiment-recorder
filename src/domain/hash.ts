export async function sha256Hex(input: string | ArrayBuffer): Promise<string> {
  const buffer =
    typeof input === "string" ? new TextEncoder().encode(input).buffer : input;
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function stableId(prefix: string, content: string) {
  let hash = 2166136261;
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

export function roundForExport(value: number, digits = 8) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return Number(value.toFixed(digits));
}
