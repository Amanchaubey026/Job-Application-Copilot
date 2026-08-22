import { describe, expect, it } from "vitest";
import { parseClassification, parseGeneratedAnswer, parseJobAnalysis } from "./schemas";

describe("AI schema validation", () => {
  it("accepts a valid classification and strips illegal sources", () => {
    const parsed = parseClassification({
      intent: "professional_background",
      profileSources: ["experience", "skills", "window.alert", "projects"],
      confidence: 0.94
    });
    expect(parsed.profileSources).toEqual(["experience", "skills", "projects"]);
  });

  it("rejects an invalid classification", () => {
    expect(() =>
      parseClassification({ intent: "", profileSources: [], confidence: 2 })
    ).toThrow();
  });

  it("rejects invalid confidence", () => {
    expect(() =>
      parseClassification({
        intent: "skills",
        profileSources: ["skills"],
        confidence: 1.5
      })
    ).toThrow();
  });

  it("accepts a valid generated answer", () => {
    const parsed = parseGeneratedAnswer({
      answer: "At Fluid AI I built internal tooling.",
      confidence: 0.9,
      sources: ["experience[0]"],
      needsUserInput: false
    });
    expect(parsed.sources).toEqual(["experience[0]"]);
  });

  it("rejects invalid generated output", () => {
    expect(() =>
      parseGeneratedAnswer({ answer: 12, confidence: 0.2, sources: [], needsUserInput: false })
    ).toThrow();
  });
});

describe("job analysis schema", () => {
  it("parses a valid analysis", () => {
    const parsed = parseJobAnalysis({
      matchScore: 0.87,
      matchingSkills: ["React"],
      matchingExperience: ["Fluid AI"],
      relevantProjects: ["Job Application Copilot"],
      missingSkills: ["AWS"],
      summary: "Strong overlap with frontend work."
    });
    expect(parsed.matchScore).toBe(0.87);
  });
});
