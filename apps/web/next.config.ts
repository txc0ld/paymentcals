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
    "@paymentcalcs/engine-business",
    "@paymentcalcs/rule-schema",
    "@paymentcalcs/rules-au",
    "@paymentcalcs/scenario-schema",
  ],
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
