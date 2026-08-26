import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "~utils/profile-factory";
import { buildCopilotPlan } from "./plan";
import { resolveFillValue } from "./fill-value";
import type { MatchedField } from "~types/matching";

function profile() {
  return createEmptyProfile({
    personal: {
      firstName: "Aman",
      lastName: "Chaubey",
      email: "aman@example.com",
      phone: "+91 88815 03310",
      address: { country: "India" }
    },
    links: { linkedin: "https://03310linkedin.com/in/amanchaubeyin" },
    skills: ["React", "TypeScript", "Node.js"]
  });
}

describe("copilot plan", () => {
  it("autofills identity fields and asks about salary and work authorization", () => {
    const matches: MatchedField[] = [
      {
        field: { id: "fn", elementType: "input", label: "First Name" },
        match: { profilePath: "personal.firstName", value: "Aman", confidence: 0.95, reason: "label", source: "deterministic" }
      },
      {
        field: { id: "salary", elementType: "input", label: "Desired Salary", required: true },
        match: null
      },
      {
        field: {
          id: "auth",
          elementType: "select",
          label: "Are you legally authorized to work in the United States?",
          required: true,
          options: [
            { value: "1", label: "Yes" },
            { value: "0", label: "No" }
          ]
        },
        match: null
      }
    ];
    const plan = buildCopilotPlan({ matches, profile: profile() });
    expect(plan.autofill.map((item) => item.label)).toContain("First Name");
    expect(plan.ask.map((item) => item.label)).toEqual(
      expect.arrayContaining(["Desired Salary", "Are you legally authorized to work in the United States?"])
    );
  });

  it("autofills a skill-set combobox instead of skipping it", () => {
    const matches: MatchedField[] = [
      {
        field: {
          id: "skills",
          elementType: "combobox",
          label: "Skill Set",
          placeholder: "Search and add skills"
        },
        match: {
          profilePath: "skills",
          value: "React, TypeScript, Node.js",
          confidence: 0.95,
          reason: "label",
          source: "deterministic"
        }
      }
    ];
    const plan = buildCopilotPlan({ matches, profile: profile() });
    expect(plan.autofill.map((item) => item.label)).toContain("Skill Set");
    expect(plan.skipped).toHaveLength(0);
  });

  it("asks before filling a country combobox that has no option list", () => {
    const matches: MatchedField[] = [
      {
        field: { id: "country", elementType: "combobox", label: "Country", required: true },
        match: {
          profilePath: "personal.address.country",
          value: "India",
          confidence: 0.95,
          reason: "label",
          source: "deterministic"
        }
      }
    ];
    const plan = buildCopilotPlan({ matches, profile: profile() });
    expect(plan.autofill).toHaveLength(0);
    expect(plan.ask[0]?.suggested).toBe("India");
    expect(plan.ask[0]?.label).toBe("Country");
  });

  it("will not fill a country field with TypeScript", () => {
    const field = {
      id: "country",
      elementType: "combobox" as const,
      label: "Country",
      options: [
        { value: "IN", label: "India" },
        { value: "US", label: "United States" }
      ]
    };
    const skillsMatch = {
      profilePath: "skills",
      value: "React, TypeScript, Node.js",
      confidence: 0.8,
      reason: "AI",
      source: "ai" as const
    };
    expect(resolveFillValue(field, skillsMatch, profile())).toBeNull();
    expect(
      resolveFillValue(
        field,
        { profilePath: "personal.address.country", value: "India", confidence: 0.95, reason: "label", source: "deterministic" },
        profile()
      )
    ).toBe("India");
  });

  it("sanitizes a glued LinkedIn URL before fill", () => {
    const value = resolveFillValue(
      { id: "li", elementType: "input", label: "LinkedIn Profile" },
      {
        profilePath: "links.linkedin",
        value: "https://03310linkedin.com/in/amanchaubeyin",
        confidence: 0.95,
        reason: "label",
        source: "deterministic"
      },
      profile()
    );
    expect(value).toBe("https://www.linkedin.com/in/amanchaubeyin");
  });
});
