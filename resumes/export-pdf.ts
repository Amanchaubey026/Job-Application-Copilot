import type { ResumeContent, ResumeVersion } from "~types/resume";
import type { UserProfile } from "~types/profile";

function escapePdf(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function contentLines(profile: UserProfile, resume: ResumeVersion): string[] {
  const content = resume.content;
  const lines: string[] = [
    profile.personal.fullName || "Resume",
    [profile.personal.email, profile.personal.phone, profile.personal.location]
      .filter(Boolean)
      .join("  |  ")
  ];
  if (content.summary) {
    lines.push("", "SUMMARY", content.summary);
  }
  if (content.skills.length) {
    lines.push("", "SKILLS", content.skills.join(", "));
  }
  if (content.experience.length) {
    lines.push("", "EXPERIENCE");
    for (const item of content.experience) {
      lines.push("", [item.title, item.company].filter(Boolean).join("  ·  "));
      if (item.dates) lines.push(item.dates);
      for (const bullet of item.bullets) lines.push(`- ${bullet}`);
    }
  }
  if (content.projects.length) {
    lines.push("", "PROJECTS");
    for (const item of content.projects) {
      lines.push("", item.name ?? "Project");
      if (item.description) lines.push(item.description);
    }
  }
  if (content.education.length) {
    lines.push("", "EDUCATION");
    for (const item of content.education) {
      lines.push([item.degree, item.field, item.institution].filter(Boolean).join("  ·  "));
    }
  }
  return lines.filter((line, index, arr) => line || arr[index - 1]);
}

export function resumeToPlainText(profile: UserProfile, resume: ResumeVersion): string {
  return contentLines(profile, resume).join("\n");
}

export function resumeToPdfBytes(profile: UserProfile, resume: ResumeVersion): Uint8Array {
  const lines = contentLines(profile, resume);
  let y = 740;
  const commands = ["BT", "/F1 11 Tf", `50 ${y} Td`];
  for (const line of lines) {
    commands.push(`(${escapePdf(line.slice(0, 110))}) Tj`);
    commands.push("0 -16 Td");
  }
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${new TextEncoder().encode(stream).length} >> stream\n${stream}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj"
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${object}\n`;
  }
  const xrefStart = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

export function resumeToHtml(profile: UserProfile, resume: ResumeVersion): string {
  const content: ResumeContent = resume.content;
  const exp = content.experience
    .map(
      (item) =>
        `<h3>${item.title ?? ""} — ${item.company ?? ""}</h3><p>${item.dates ?? ""}</p><ul>${item.bullets
          .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
          .join("")}</ul>`
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(
    resume.name
  )}</title>
  <style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#111}h1,h2{letter-spacing:-.02em}h2{border-bottom:1px solid #ddd;padding-bottom:4px}</style>
  </head><body>
  <h1>${escapeHtml(profile.personal.fullName || resume.name)}</h1>
  <p>${escapeHtml([profile.personal.email, profile.personal.phone, profile.personal.location].filter(Boolean).join(" · "))}</p>
  ${content.summary ? `<h2>Summary</h2><p>${escapeHtml(content.summary)}</p>` : ""}
  ${content.skills.length ? `<h2>Skills</h2><p>${escapeHtml(content.skills.join(", "))}</p>` : ""}
  <h2>Experience</h2>${exp}
  </body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
