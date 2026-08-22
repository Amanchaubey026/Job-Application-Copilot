import { describe, expect, it } from "vitest";
import { SAMPLE_RESUME_TEXT } from "~tests/fixtures/sample-resume";
import { extractProfileFromText } from "./profile-extractor";

describe("extractProfileFromText", () => {
  it("extracts personal information, experience, education, skills, and links", () => {
    const { profile, summary } = extractProfileFromText(SAMPLE_RESUME_TEXT, "resume.pdf");

    expect(profile.personal.fullName).toBe("Aman Chaubey");
    expect(profile.personal.firstName).toBe("Aman");
    expect(profile.personal.lastName).toBe("Chaubey");
    expect(profile.personal.email).toBe("aman@example.com");
    expect(profile.personal.phone?.replace(/\s+/g, "")).toContain("9876543210");
    expect(profile.links.linkedin).toMatch(/linkedin\.com\/in\/amanchaubey/i);
    expect(profile.links.github).toMatch(/github\.com\/amanchaubey/i);
    expect(profile.links.portfolio).toMatch(/amanchaubey\.dev/i);

    expect(profile.experience[0]?.company).toBe("Fluid AI");
    expect(profile.experience[0]?.title).toBe("Full Stack Developer");
    expect(profile.education[0]?.institution).toMatch(/Indian Institute of Technology/);
    expect(profile.education[0]?.degree).toMatch(/B\.?Tech/i);
    expect(profile.education[0]?.field).toMatch(/Computer Science/i);

    expect(profile.skills).toEqual(
      expect.arrayContaining(["React", "Next.js", "TypeScript", "Node.js", "MongoDB"])
    );
    expect(profile.skills).not.toContain("Python");
    expect(profile.skills).not.toContain("AWS");
    expect(profile.skills).not.toContain("Docker");

    expect(summary.hasPersonal).toBe(true);
    expect(summary.hasExperience).toBe(true);
    expect(summary.hasEducation).toBe(true);
    expect(summary.hasSkills).toBe(true);
    expect(summary.hasLinks).toBe(true);
    expect(profile.rawResumeText).toContain("Fluid AI");
  });

  it("does not invent missing contact fields", () => {
    const { profile } = extractProfileFromText("Jane Example\nSoftware Engineer\n");
    expect(profile.personal.email).toBeUndefined();
    expect(profile.personal.phone).toBeUndefined();
    expect(profile.experience).toHaveLength(0);
    expect(profile.skills).toHaveLength(0);
  });
});
