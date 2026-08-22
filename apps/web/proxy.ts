import { NextResponse, type NextRequest } from "next/server";
import { negotiateFormat } from "./lib/accept";

/**
 * Content negotiation for page routes (acceptmarkdown.com): a client whose
 * Accept header prefers text/markdown is rewritten to the markdown
 * representation of the same URL; clients accepting neither HTML nor
 * markdown get 406. Every negotiated response carries Vary: Accept so CDN
 * caches never serve one representation to a client that asked for the
 * other.
 */
export function proxy(request: NextRequest): NextResponse | Response {
  const format = negotiateFormat(request.headers.get("accept"));

  if (format === "none") {
    return new Response(
      "406 Not Acceptable. This URL is served as text/html or text/markdown (Accept: text/markdown). Machine-readable map: /llms.txt\n",
      {
        status: 406,
        headers: { "Content-Type": "text/plain; charset=utf-8", Vary: "Accept" },
      },
    );
  }

  if (format === "markdown") {
    const url = request.nextUrl.clone();
    url.pathname = url.pathname === "/" ? "/agent-markdown" : `/agent-markdown${url.pathname}`;
    const response = NextResponse.rewrite(url);
    response.headers.set("Vary", "Accept");
    return response;
  }

  // Note: Next overwrites Vary on prerendered HTML at the server layer, so
  // this header is advisory locally; the markdown and 406 responses carry
  // Vary: Accept themselves, and next.config sets it at the edge.
  const response = NextResponse.next();
  response.headers.set("Vary", "Accept");
  return response;
}

export const config = {
  // Page routes only: skip Next internals, the rewrite target itself, and
  // every extensioned file (llms.txt, sitemap.xml, robots.txt, assets).
  matcher: ["/((?!_next|agent-markdown|icon|opengraph-image|.*\\.).*)"],
};
