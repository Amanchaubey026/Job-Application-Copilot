import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "~utils/profile-factory";
import { buildRelevantProfileContext } from "./profile-context";

describe("buildRelevantProfileContext", () => {
  it("prefers experience that overlaps the job/question", () => {
    const profile = createEmptyProfile({
      skills: ["React", "TypeScript", "MongoDB"],
      experience: [
        { id: "1", company: "Acme Corp", title: "Support", description: "Answered tickets" },
        { id: "2", company: "Fluid AI", title: "Full Stack Developer", description: "React and TypeScript apps" }
      ],
      projects: [
        { id: "p1", name: "Job Application Copilot", description: "Browser extension for applications" }
      ]
    });
    const context = buildRelevantProfileContext({
      question: "Tell us about your experience with React",
      job: {
        title: "Full Stack Developer",
        company: "Example AI",
        url: "http://localhost",
        description: "React TypeScript Node.js",
        confidence: 0.8
      },
      profile
    });
    expect(context.experience.join(" ")).toMatch(/Fluid AI/);
    expect(context.skills).toEqual(expect.arrayContaining(["React", "TypeScript"]));
  });
});
