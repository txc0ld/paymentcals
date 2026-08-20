import tseslint from "typescript-eslint";
import noBannedResultVerbs from "./rules/no-banned-result-verbs.mjs";

export const paymentcalcsPlugin = {
  rules: {
    "no-banned-result-verbs": noBannedResultVerbs,
  },
};

/** Base config for every TypeScript package. */
export const base = tseslint.config(
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    ignores: ["dist/**", ".next/**", "node_modules/**"],
  },
);

/**
 * Engine purity overlay (non-negotiable #2): no UI imports, no network, no
 * system clock or randomness, and no `number` where money belongs.
 */
export const enginePurity = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          { group: ["react", "react-*", "next", "next/*", "@paymentcalcs/calculation-ui"], message: "Engines must not import UI (§11.2)." },
        ],
      },
    ],
    "no-restricted-globals": [
      "error",
      { name: "fetch", message: "Engines must not use the network during calculation (§11.2)." },
      { name: "XMLHttpRequest", message: "Engines must not use the network (§11.2)." },
    ],
    "no-restricted-properties": [
      "error",
      { object: "Date", property: "now", message: "Engines are deterministic — inject the clock (§11.2)." },
      { object: "Math", property: "random", message: "Engines are deterministic — use deterministicSeed (§11.2)." },
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector: "NewExpression[callee.name='Date'][arguments.length=0]",
        message: "Engines are deterministic — inject the clock (§11.2).",
      },
      {
        selector:
          "TSPropertySignature[key.name=/^(amount|price|balance|salary|income|cost|fee|total|principal|deposit|repayment|minorUnits|cents|gst|tax)([A-Z].*)?$/] TSNumberKeyword",
        message:
          "Currency must never be `number` — use the branded Money type with minor-unit strings (§14.1).",
      },
      {
        selector:
          "PropertyDefinition[key.name=/^(amount|price|balance|salary|income|cost|fee|total|principal|deposit|repayment|minorUnits|cents|gst|tax)([A-Z].*)?$/] TSNumberKeyword",
        message:
          "Currency must never be `number` — use the branded Money type with minor-unit strings (§14.1).",
      },
    ],
  },
};

/** Result-surface overlay for UI packages. */
export const resultSurface = {
  plugins: {
    paymentcalcs: paymentcalcsPlugin,
  },
  rules: {
    "paymentcalcs/no-banned-result-verbs": "error",
  },
};
