/**
 * Deterministic serialisation and hashing for §14.3 integrity fields.
 * Key order is normalised recursively so semantically identical documents
 * always produce the same hash. Uses Web Crypto (Node ≥20 and all supported
 * browsers) — callers are async; engines themselves never hash.
 */
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(entries.map(([k, v]) => [k, sortValue(v)]));
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("non-finite number is not canonically serialisable");
  }
  return value;
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function canonicalHash(value: unknown): Promise<string> {
  return sha256Hex(canonicalStringify(value));
}
