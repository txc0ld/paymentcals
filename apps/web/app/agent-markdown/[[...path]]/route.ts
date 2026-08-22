import { notFoundMarkdown, renderMarkdownForPath } from "../../../lib/agent-markdown";

/**
 * Internal target of the Accept-negotiation rewrite in proxy.ts: serves the
 * markdown representation of any page path (acceptmarkdown.com). Direct
 * requests work too but are noindexed — the canonical address of each
 * markdown document is the page URL itself, requested with
 * `Accept: text/markdown`.
 */

// No X-Robots-Tag here: negotiated responses share the canonical page URL,
// which must stay indexable. Direct /agent-markdown/ addresses are excluded
// via robots.txt instead.
const MARKDOWN_HEADERS = {
  "Content-Type": "text/markdown; charset=utf-8",
  Vary: "Accept",
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const { path } = await params;
  const pagePath = `/${(path ?? []).join("/")}`;
  const markdown = renderMarkdownForPath(pagePath);
  if (markdown === null) {
    return new Response(notFoundMarkdown(pagePath), { status: 404, headers: MARKDOWN_HEADERS });
  }
  return new Response(markdown, { status: 200, headers: MARKDOWN_HEADERS });
}
