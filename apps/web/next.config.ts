import type { NextConfig } from "next";

console.log(
  `[pc-build-env] VERCEL_ENV=${process.env.VERCEL_ENV} NEXT_PUBLIC_VERCEL_ENV=${process.env.NEXT_PUBLIC_VERCEL_ENV} NEXT_PUBLIC_PC_ALLOW_DRAFT_RULES=${process.env.NEXT_PUBLIC_PC_ALLOW_DRAFT_RULES}`,
);

const nextConfig: NextConfig = {
  transpilePackages: [
    "@paymentcalcs/analytics-safe",
    "@paymentcalcs/calculation-core",
    "@paymentcalcs/calculation-ui",
    "@paymentcalcs/calculator-registry",
    "@paymentcalcs/design-tokens",
    "@paymentcalcs/engine-au-tax",
    "@paymentcalcs/engine-au-withholding",
    "@paymentcalcs/engine-business",
    "@paymentcalcs/engine-compensation",
    "@paymentcalcs/engine-debt",
    "@paymentcalcs/engine-loans",
    "@paymentcalcs/engine-mortgage-ledger",
    "@paymentcalcs/engine-savings",
    "@paymentcalcs/financial-solvers",
    "@paymentcalcs/rule-schema",
    "@paymentcalcs/rules-au",
    "@paymentcalcs/scenario-schema",
  ],
  // Canonical-host consolidation: every non-canonical production host
  // permanently redirects to www.paymentcalcs.com.au, path preserved.
  redirects: async () => {
    const canonical = "https://www.paymentcalcs.com.au";
    const hosts = ["paymentcalcs.com", "www.paymentcalcs.com", "paymentcalcs.com.au", "paymentcals.vercel.app"];
    return hosts.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: `${canonical}/:path*`,
      permanent: true,
    }));
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
        },
      ],
    },
  ],
};

export default nextConfig;
