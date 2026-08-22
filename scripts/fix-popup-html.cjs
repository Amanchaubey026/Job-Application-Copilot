const fs = require("node:fs");
const path = require("node:path");

const FALLBACK = `<div id="jac-fallback" style="padding:16px;width:360px;font-family:system-ui,Segoe UI,sans-serif;color:#171717">
  <strong style="font-size:15px">Job Application Copilot</strong>
  <p style="margin:8px 0 0;font-size:13px;color:#5c5c5c">Starting…</p>
</div>`;

function fixFile(file) {
  if (!fs.existsSync(file)) return false;
  let html = fs.readFileSync(file, "utf8");
  html = html.replace(/(href|src)="\//g, '$1="');
  if (!html.includes("jac-fallback")) {
    html = html.replace(
      /<div id="__plasmo"><\/div>/,
      `<div id="__plasmo">${FALLBACK}</div>`
    );
  }
  fs.writeFileSync(file, html);
  return true;
}

function fixPopupHtml() {
  const root = path.join(__dirname, "..", "build");
  for (const dir of ["chrome-mv3-prod", "chrome-mv3-dev"]) {
    fixFile(path.join(root, dir, "popup.html"));
  }
}

if (require.main === module) fixPopupHtml();
module.exports = { fixPopupHtml };
