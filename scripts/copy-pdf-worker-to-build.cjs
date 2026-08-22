const fs = require("node:fs");
const path = require("node:path");

const src = path.join(__dirname, "..", "assets", "pdf.worker.min.mjs");

function copyWorker() {
  if (!fs.existsSync(src)) return false;
  let copied = false;
  for (const dir of ["chrome-mv3-dev", "chrome-mv3-prod"]) {
    const destDir = path.join(__dirname, "..", "build", dir);
    if (!fs.existsSync(destDir)) continue;
    fs.copyFileSync(src, path.join(destDir, "pdf.worker.min.mjs"));
    copied = true;
  }
  return copied;
}

if (require.main === module) {
  copyWorker();
}

module.exports = { copyWorker };
