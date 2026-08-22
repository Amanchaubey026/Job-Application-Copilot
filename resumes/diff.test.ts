import { describe, expect, it } from "vitest";
import { applyAcceptedChanges, changesFromTailoring, lineDiff } from "./diff";
import type { ResumeContent } from "~types/resume";

const content: ResumeContent = {
  summary: "Web developer.",
  skills: ["React", "TypeScript", "MongoDB"],
  experience: [{ id: "1", title: "Dev", company: "Fluid AI", bullets: ["Built apps"] }],
  projects: [
    { id: "p1", name: "AI Chatbot Platform", description: "Chat" },
    { id: "p2", name: "Payroll", description: "Finance" }
  ],
  education: []
};

describe("resume diff and apply", () => {
  it("marks added and removed lines", () => {
    const lines = lineDiff("Web developer.", "AI-powered applications.");
    expect(lines.some((line) => line.kind === "removed")).toBe(true);
    expect(lines.some((line) => line.kind === "added")).toBe(true);
  });

  it("applies only accepted changes", () => {
    const changes = changesFromTailoring({
      current: content,
      summaryRecommendation: "Full stack developer focused on AI applications.",
      skillsToEmphasize: ["TypeScript", "React"],
      projectsToEmphasize: ["AI Chatbot Platform"],
      experiencePointsToEmphasize: []
    });
    for (const change of changes) change.accepted = change.section === "summary";
    const next = applyAcceptedChanges(content, changes);
    expect(next.summary).toMatch(/AI applications/);
    expect(next.skills[0]).toBe("React");
  });
});
