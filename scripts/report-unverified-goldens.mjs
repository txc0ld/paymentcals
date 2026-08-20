// Reports golden-fixture cases whose `expected` is still null (awaiting human
// verification against official calculators). Report-only: never fails CI.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "packages", "test-fixtures");

function walk(dir) {
  let files = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files = files.concat(walk(full));
    else if (entry.endsWith(".fixture.json")) files.push(full);
  }
  return files;
}

let verified = 0;
let unverified = 0;
const pending = [];

for (const file of walk(root)) {
  const doc = JSON.parse(readFileSync(file, "utf8"));
  for (const c of doc.cases ?? []) {
    if (c.expected === null) {
      unverified += 1;
      pending.push(`${doc.fixtureId ?? file}: ${c.caseId}`);
    } else {
      verified += 1;
    }
  }
}

console.log(`Golden fixtures — verified: ${verified}, unverified (skipped): ${unverified}`);
for (const line of pending) console.log(`  awaiting verification: ${line}`);
