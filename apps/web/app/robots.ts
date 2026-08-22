import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/site";

/** §24.9 indexation + AI-crawler allowances (§24.10). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // /agent-markdown/ is the internal rewrite target for markdown content
      // negotiation; its canonical addresses are the page URLs themselves.
      { userAgent: "*", allow: "/", disallow: ["/s/", "/agent-markdown/"] },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
