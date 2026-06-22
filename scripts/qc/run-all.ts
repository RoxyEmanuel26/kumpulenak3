import { execSync } from "child_process";
import path from "path";

const scripts = [
  "validate-links.ts",
  "validate-sitemap.ts",
  "validate-seo.ts",
];

console.log("=======================================");
console.log("🛡️  LustHub Quality Control Suite 🛡️");
console.log("=======================================\n");

let hasErrors = false;

for (const script of scripts) {
  const scriptPath = path.join(process.cwd(), "scripts", "qc", script);
  console.log(`\n▶️ Running ${script}...`);
  try {
    execSync(`npx ts-node --project scripts/qc/tsconfig.json "${scriptPath}"`, { stdio: "inherit" });
  } catch (err) {
    console.error(`\n❌ Script ${script} failed.`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error("\n💥 Quality Control Suite FAILED. Please fix the errors above before deploying.");
  process.exit(1);
} else {
  console.log("\n✅ Quality Control Suite PASSED.");
  process.exit(0);
}
