const fs = require("node:fs");
const path = require("node:path");

const candidates = [
  "pdfjs-dist/build/pdf.worker.min.mjs",
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  "pdfjs-dist/build/pdf.worker.mjs"
];

const destDir = path.join(__dirname, "..", "assets");
const dest = path.join(destDir, "pdf.worker.min.mjs");

fs.mkdirSync(destDir, { recursive: true });

let copied = false;
for (const rel of candidates) {
  const src = path.join(__dirname, "..", "node_modules", rel);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    copied = true;
    break;
  }
}

if (!copied) {
  console.warn(
    "pdfjs-dist worker not found. PDF parsing will try a bundled fallback at runtime."
  );
}
