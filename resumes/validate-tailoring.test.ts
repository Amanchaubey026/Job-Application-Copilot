import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "~utils/profile-factory";
import { validateTailoring } from "./validate-tailoring";

describe("validateTailoring", () => {
  it("drops skills that are not in the profile", () => {
    const profile = createEmptyProfile({
      skills: ["React", "TypeScript"],
      projects: [{ id: "p1", name: "AI Chatbot Platform" }]
    });
    const result = validateTailoring(
      {
        skillsToEmphasize: ["React", "AWS", "Kubernetes"],
        projectsToEmphasize: ["AI Chatbot Platform", "Secret Project"],
        experiencePointsToEmphasize: [],
        skillsNotFoundInProfile: ["AWS"],
        changes: []
      },
      profile
    );
    expect(result.skillsToEmphasize).toEqual(["React"]);
    expect(result.projectsToEmphasize).toEqual(["AI Chatbot Platform"]);
    expect(result.skillsNotFoundInProfile).toEqual(["AWS"]);
  });
});
