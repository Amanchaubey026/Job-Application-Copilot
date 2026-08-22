const fs = require("node:fs");
const path = require("node:path");

const lines = [
  "Aman Chaubey",
  "Full Stack Developer",
  "Bengaluru, Karnataka, India",
  "aman@example.com | +91 98765 43210",
  "https://linkedin.com/in/amanchaubey",
  "https://github.com/amanchaubey",
  "https://amanchaubey.dev",
  "",
  "EXPERIENCE",
  "Fluid AI",
  "Full Stack Developer",
  "Jan 2023 - Present",
  "Built internal tooling and web applications using React, Node.js, and TypeScript.",
  "Acme Corp",
  "Software Engineer",
  "Jun 2021 - Dec 2022",
  "Worked on customer-facing dashboards.",
  "",
  "EDUCATION",
  "Indian Institute of Technology",
  "B.Tech in Computer Science",
  "2017 - 2021",
  "",
  "SKILLS",
  "React, Next.js, TypeScript, Node.js, MongoDB",
  "",
  "PROJECTS",
  "Job Application Copilot",
  "Browser extension that fills job applications from a local resume profile."
];

function escapePdf(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

let y = 740;
const commands = ["BT", "/F1 11 Tf", `50 ${y} Td`];
for (const line of lines) {
  commands.push(`(${escapePdf(line)}) Tj`);
  commands.push("0 -16 Td");
}
commands.push("ET");
const stream = commands.join("\n");

const objects = [
  "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
  "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
  `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj`,
  `4 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`,
  "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj"
];

let pdf = "%PDF-1.4\n";
const offsets = [0];
for (const object of objects) {
  offsets.push(Buffer.byteLength(pdf));
  pdf += `${object}\n`;
}
const xrefStart = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += "0000000000 65535 f \n";
for (let i = 1; i < offsets.length; i += 1) {
  pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

const dest = path.join(__dirname, "..", "test-pages", "sample-resume.pdf");
fs.writeFileSync(dest, pdf);
console.log(`Wrote ${dest}`);
