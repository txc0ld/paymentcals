/**
 * RFC 9110 §12.5.1 Accept-header negotiation between the two representations
 * every page route serves: HTML for people and Markdown for agents
 * (acceptmarkdown.com). Pure and dependency-free so the proxy (edge) and
 * tests share it.
 */

export type NegotiatedFormat = "html" | "markdown" | "none";

type AcceptEntry = {
  type: string;
  subtype: string;
  quality: number;
  /** Specificity rank: exact = 2, type wildcard = 1, full wildcard = 0. */
  specificity: number;
};

function parseAccept(header: string): AcceptEntry[] {
  return header
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const [range = "", ...params] = part.split(";").map((piece) => piece.trim());
      const media = range.toLowerCase();
      const slash = media.indexOf("/");
      if (slash <= 0) return [];
      const type = media.slice(0, slash);
      const subtype = media.slice(slash + 1);
      let quality = 1;
      for (const param of params) {
        const [key = "", value = ""] = param.split("=").map((piece) => piece.trim());
        if (key.toLowerCase() === "q") {
          const parsed = Number.parseFloat(value);
          // A malformed q-value is ignored (q stays 1) rather than treated
          // as q=0, so a sloppy client is never bounced with 406.
          if (Number.isFinite(parsed)) quality = Math.min(Math.max(parsed, 0), 1);
        }
      }
      const specificity = type === "*" ? 0 : subtype === "*" ? 1 : 2;
      return [{ type, subtype, quality, specificity }];
    });
}

/** Highest-specificity matching entry's q-value for a concrete media type. */
function qualityFor(entries: AcceptEntry[], type: string, subtype: string): number {
  let best: AcceptEntry | null = null;
  for (const entry of entries) {
    const typeMatches = entry.type === "*" || entry.type === type;
    const subtypeMatches = entry.subtype === "*" || entry.subtype === subtype;
    if (!typeMatches || !subtypeMatches) continue;
    if (!best || entry.specificity > best.specificity) best = entry;
  }
  return best ? best.quality : 0;
}

/**
 * Pick the representation for a page route. Absent/empty Accept means "no
 * preference" (RFC 9110): serve HTML. Markdown wins only when the client
 * gives text/markdown a strictly higher q than every HTML form, so browsers
 * (text/html) and generic crawlers (* / *) keep getting HTML. When nothing
 * we serve is acceptable the caller must answer 406.
 */
export function negotiateFormat(acceptHeader: string | null): NegotiatedFormat {
  if (acceptHeader === null || acceptHeader.trim() === "") return "html";
  const entries = parseAccept(acceptHeader);
  if (entries.length === 0) return "html";

  const html = Math.max(
    qualityFor(entries, "text", "html"),
    qualityFor(entries, "application", "xhtml+xml"),
  );
  const markdown = qualityFor(entries, "text", "markdown");

  if (markdown > html && markdown > 0) return "markdown";
  if (html > 0) return "html";
  if (markdown > 0) return "markdown";
  return "none";
}
