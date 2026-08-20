import { base, enginePurity, resultSurface } from "@paymentcalcs/eslint-config";

export default [
  ...base,
  {
    files: [
      "packages/calculation-core/**/*.ts",
      "packages/engine-*/**/*.ts",
      "packages/financial-solvers/**/*.ts",
    ],
    ...enginePurity,
  },
  {
    files: ["packages/calculation-ui/**/*.{ts,tsx}", "apps/web/**/*.{ts,tsx}"],
    ...resultSurface,
  },
];
