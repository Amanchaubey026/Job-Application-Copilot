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

  it("parses compact one-line jobs and missing blank lines", () => {
    const text = `AMAN CHAUBEY
aman@example.com | +91 98765 43210
linkedin.com/in/amanchaubey | github.com/amanchaubey

EXPERIENCE
Full Stack Developer | Fluid AI | Jan 2023 – Present
Built internal tooling with React.
Software Engineer | Acme Corp | Jun 2021 – Dec 2022
Worked on dashboards.

EDUCATION
B.Tech in Computer Science, Indian Institute of Technology, 2017 – 2021

SKILLS
Frontend: React, Next.js, TypeScript
Backend: Node.js, MongoDB`;

    const { profile } = extractProfileFromText(text);
    expect(profile.personal.fullName).toBe("Aman Chaubey");
    expect(profile.personal.email).toBe("aman@example.com");
    expect(profile.links.linkedin).toMatch(/linkedin\.com\/in\/amanchaubey/i);
    expect(profile.experience).toHaveLength(2);
    expect(profile.experience[0]?.title).toBe("Full Stack Developer");
    expect(profile.experience[0]?.company).toBe("Fluid AI");
    expect(profile.experience[1]?.company).toBe("Acme Corp");
    expect(profile.education[0]?.degree).toMatch(/B\.?Tech/i);
    expect(profile.skills).toEqual(
      expect.arrayContaining(["React", "Next.js", "TypeScript", "Node.js", "MongoDB"])
    );
  });

  it("peels a name off a headline that also contains a job title", () => {
    const { profile } = extractProfileFromText(
      `Aman Chaubey Full Stack Developer
Bengaluru, Karnataka, India
aman@example.com
EXPERIENCE
Fluid AI
Full Stack Developer
Jan 2023 – Present
Built apps.
`
    );
    expect(profile.personal.fullName).toBe("Aman Chaubey");
    expect(profile.experience[0]?.company).toBe("Fluid AI");
  });

  it("parses title-at-company experience and glued section headers", () => {
    const { profile } = extractProfileFromText(
      `Priya Shah
priya@example.com
+1 (415) 555-2671
EXPERIENCEFull Stack Developer at Fluid AI
Jan 2023 – Present
Built internal tooling.
EDUCATIONIndian Institute of Technology
B.Tech in Computer Science
2017 – 2021
SKILLSReact, TypeScript, Node.js`
    );
    expect(profile.personal.fullName).toBe("Priya Shah");
    expect(profile.personal.phone?.replace(/\D/g, "")).toContain("4155552671");
    expect(profile.experience[0]?.title).toMatch(/Full Stack Developer/i);
    expect(profile.experience[0]?.company).toBe("Fluid AI");
    expect(profile.education[0]?.institution).toMatch(/Indian Institute of Technology/);
    expect(profile.skills).toEqual(expect.arrayContaining(["React", "TypeScript", "Node.js"]));
  });

  it("keeps contact tokens on the same line from polluting the name", () => {
    const { profile } = extractProfileFromText(
      `Aman Chaubey aman@example.com +91 98765 43210
https://linkedin.com/in/amanchaubey
`
    );
    expect(profile.personal.fullName).toBe("Aman Chaubey");
    expect(profile.personal.email).toBe("aman@example.com");
  });
});
