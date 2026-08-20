/**
 * Versioned URL-encoded scenario state (Merge Record #5).
 * Format: "1." + base64url(UTF-8 JSON of { calculatorId, input, jurisdiction?, fy? }).
 * Only calculator input state travels in the URL — never results, never
 * identifiers. Decoding an unknown version fails explicitly so future formats
 * can migrate rather than misparse.
 */
export interface UrlScenarioStateV1 {
  calculatorId: string;
  input: unknown;
  subdivision?: string;
  financialYear?: string;
}

const VERSION_PREFIX = "1.";

export function encodeUrlState(state: UrlScenarioStateV1): string {
  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  return VERSION_PREFIX + base64;
}

export type UrlStateDecodeResult =
  | { ok: true; state: UrlScenarioStateV1 }
  | { ok: false; reason: "unsupported_version" | "malformed" };

export function decodeUrlState(param: string): UrlStateDecodeResult {
  if (!param.startsWith(VERSION_PREFIX)) return { ok: false, reason: "unsupported_version" };
  const base64 = param.slice(VERSION_PREFIX.length).replaceAll("-", "+").replaceAll("_", "/");
  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as { calculatorId?: unknown }).calculatorId !== "string"
    ) {
      return { ok: false, reason: "malformed" };
    }
    return { ok: true, state: parsed as UrlScenarioStateV1 };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}
