import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sourceDir = join(root, "node_modules", "stockfish", "bin");
const targetDir = join(root, "public", "engine");

const files = [
  "stockfish-18-lite-single.js",
  "stockfish-18-lite-single.wasm",
];

if (!existsSync(sourceDir)) {
  console.warn(
    "[copy-stockfish] stockfish package not installed; skipping asset copy.",
  );
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });

for (const file of files) {
  const source = join(sourceDir, file);
  const target = join(targetDir, file);
  if (!existsSync(source)) {
    console.error(`[copy-stockfish] Missing source file: ${source}`);
    process.exit(1);
  }
  copyFileSync(source, target);
  console.log(`[copy-stockfish] Copied ${file} -> public/engine/`);
}
