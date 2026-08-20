// Regenerates integrity-manifest.json from packs/*.json.
// Deliberate, explicit action: run `pnpm --filter @paymentcalcs/rules-au rules:hash`
// after authoring or amending a pack. CI never runs this; drift fails closed.
// Canonicalisation mirrors @paymentcalcs/calculation-core canonicalStringify;
// the cross-check test in src/integrity.test.ts catches any divergence.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const packsDir = join(pkgRoot, "src", "packs");

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(entries.map(([k, v]) => [k, sortValue(v)]));
  }
  return value;
}

const manifest = {};
for (const file of readdirSync(packsDir).filter((f) => f.endsWith(".json")).sort()) {
  const pack = JSON.parse(readFileSync(join(packsDir, file), "utf8"));
  const canonical = JSON.stringify(sortValue(pack));
  const sha256 = createHash("sha256").update(canonical, "utf8").digest("hex");
  manifest[`${pack.rulePackId}@${pack.rulesVersion}`] = sha256;
  console.log(`${pack.rulePackId}@${pack.rulesVersion} ${sha256}`);
}

writeFileSync(join(pkgRoot, "integrity-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log("integrity-manifest.json written");
