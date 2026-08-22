import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "~utils/profile-factory";
import { extractKnowledgeFromProfile } from "./extract";

describe("extractKnowledgeFromProfile", () => {
  it("creates evidence items from experience, skills, and projects", () => {
    const profile = createEmptyProfile({
      skills: ["React", "TypeScript"],
      experience: [
        {
          id: "e1",
          company: "Fluid AI",
          title: "Full Stack Developer",
          description: "Built a multi-tenant AI chatbot platform using React.\nImproved response times by 40%."
        }
      ],
      projects: [
        { id: "p1", name: "Job Application Copilot", description: "Browser extension with TypeScript" }
      ]
    });
    const items = extractKnowledgeFromProfile(profile);
    expect(items.some((item) => item.type === "experience" && item.metadata.company === "Fluid AI")).toBe(true);
    expect(items.some((item) => item.type === "metric")).toBe(true);
    expect(items.some((item) => item.type === "skill" && item.title === "React")).toBe(true);
    expect(items.some((item) => item.type === "project" && item.title === "Job Application Copilot")).toBe(true);
    expect(items.every((item) => item.origin === "profile")).toBe(true);
  });
});
