import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "~utils/profile-factory";
import { contentFromProfile } from "./from-profile";

describe("contentFromProfile", () => {
  it("copies truthful profile fields into resume content", () => {
    const profile = createEmptyProfile({
      skills: ["React"],
      experience: [{ id: "e1", company: "Fluid AI", title: "Developer", description: "Built apps" }],
      projects: [{ id: "p1", name: "Copilot", description: "Extension" }]
    });
    const content = contentFromProfile(profile);
    expect(content.skills).toEqual(["React"]);
    expect(content.experience[0]?.company).toBe("Fluid AI");
    expect(content.projects[0]?.name).toBe("Copilot");
  });
});
