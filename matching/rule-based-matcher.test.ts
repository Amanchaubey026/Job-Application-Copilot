import { describe, expect, it } from "vitest";
import type { SerializableFormField } from "~types/form";
import type { UserProfile } from "~types/profile";
import { createEmptyProfile } from "~utils/profile-factory";
import { RuleBasedFieldMatcher, shouldAutoselect } from "./rule-based-matcher";

const matcher = new RuleBasedFieldMatcher();

function field(
  overrides: Partial<SerializableFormField> & Pick<SerializableFormField, "id">
): SerializableFormField {
  return {
    elementType: "input",
    inputType: "text",
    ...overrides
  };
}

function sampleProfile(): UserProfile {
  return createEmptyProfile({
    personal: {
      firstName: "Aman",
      lastName: "Chaubey",
      fullName: "Aman Chaubey",
      email: "aman@example.com",
      phone: "+919876543210",
      address: {
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        country: "India"
      }
    },
    links: {
      linkedin: "https://linkedin.com/in/amanchaubey",
      github: "https://github.com/amanchaubey",
      portfolio: "https://amanchaubey.dev"
    },
    experience: [
      {
        id: "exp-1",
        company: "Fluid AI",
        title: "Full Stack Developer"
      }
    ],
    education: [
      {
        id: "edu-1",
        institution: "Indian Institute of Technology",
        degree: "B.Tech"
      }
    ]
  });
}

describe("RuleBasedFieldMatcher", () => {
  const profile = sampleProfile();

  const cases: Array<{
    name: string;
    overrides: Partial<SerializableFormField>;
    path: string;
    value: string;
    minConfidence: number;
  }> = [
    { name: "Email", overrides: { label: "Email" }, path: "personal.email", value: "aman@example.com", minConfidence: 0.9 },
    { name: "Email Address", overrides: { label: "Email Address" }, path: "personal.email", value: "aman@example.com", minConfidence: 0.9 },
    { name: "e-mail", overrides: { label: "e-mail" }, path: "personal.email", value: "aman@example.com", minConfidence: 0.9 },
    { name: "candidate_email", overrides: { name: "candidate_email" }, path: "personal.email", value: "aman@example.com", minConfidence: 0.9 },
    { name: "Candidate Email Address", overrides: { label: "Candidate Email Address" }, path: "personal.email", value: "aman@example.com", minConfidence: 0.85 },
    { name: "autocomplete email", overrides: { autocomplete: "email" }, path: "personal.email", value: "aman@example.com", minConfidence: 0.99 },
    { name: "Phone", overrides: { label: "Phone" }, path: "personal.phone", value: "+919876543210", minConfidence: 0.9 },
    { name: "Phone Number", overrides: { label: "Phone Number" }, path: "personal.phone", value: "+919876543210", minConfidence: 0.9 },
    { name: "mobile", overrides: { name: "mobile" }, path: "personal.phone", value: "+919876543210", minConfidence: 0.9 },
    { name: "mobile number", overrides: { label: "Mobile Number" }, path: "personal.phone", value: "+919876543210", minConfidence: 0.9 },
    { name: "telephone", overrides: { label: "Telephone" }, path: "personal.phone", value: "+919876543210", minConfidence: 0.9 },
    { name: "contact number", overrides: { label: "Contact Number" }, path: "personal.phone", value: "+919876543210", minConfidence: 0.9 },
    { name: "First Name", overrides: { label: "First Name" }, path: "personal.firstName", value: "Aman", minConfidence: 0.9 },
    { name: "firstname", overrides: { name: "firstname" }, path: "personal.firstName", value: "Aman", minConfidence: 0.9 },
    { name: "given name", overrides: { label: "Given Name" }, path: "personal.firstName", value: "Aman", minConfidence: 0.9 },
    { name: "fname", overrides: { name: "fname" }, path: "personal.firstName", value: "Aman", minConfidence: 0.9 },
    { name: "Last Name", overrides: { label: "Last Name" }, path: "personal.lastName", value: "Chaubey", minConfidence: 0.9 },
    { name: "lastname", overrides: { name: "lastname" }, path: "personal.lastName", value: "Chaubey", minConfidence: 0.9 },
    { name: "surname", overrides: { label: "Surname" }, path: "personal.lastName", value: "Chaubey", minConfidence: 0.9 },
    { name: "family name", overrides: { label: "Family Name" }, path: "personal.lastName", value: "Chaubey", minConfidence: 0.9 },
    { name: "lname", overrides: { name: "lname" }, path: "personal.lastName", value: "Chaubey", minConfidence: 0.9 },
    { name: "Full Name", overrides: { label: "Full Name" }, path: "personal.fullName", value: "Aman Chaubey", minConfidence: 0.9 },
    { name: "candidate name", overrides: { label: "Candidate Name" }, path: "personal.fullName", value: "Aman Chaubey", minConfidence: 0.9 },
    { name: "legal name", overrides: { label: "Legal Name" }, path: "personal.fullName", value: "Aman Chaubey", minConfidence: 0.9 },
    { name: "LinkedIn", overrides: { label: "LinkedIn" }, path: "links.linkedin", value: "https://linkedin.com/in/amanchaubey", minConfidence: 0.9 },
    { name: "linkedin url", overrides: { label: "LinkedIn URL" }, path: "links.linkedin", value: "https://linkedin.com/in/amanchaubey", minConfidence: 0.9 },
    { name: "GitHub", overrides: { label: "GitHub" }, path: "links.github", value: "https://github.com/amanchaubey", minConfidence: 0.9 },
    { name: "github profile", overrides: { label: "GitHub Profile" }, path: "links.github", value: "https://github.com/amanchaubey", minConfidence: 0.9 },
    { name: "Portfolio", overrides: { label: "Portfolio" }, path: "links.portfolio", value: "https://amanchaubey.dev", minConfidence: 0.9 },
    { name: "personal website", overrides: { label: "Personal Website" }, path: "links.portfolio", value: "https://amanchaubey.dev", minConfidence: 0.9 },
    { name: "website url", overrides: { label: "Website URL" }, path: "links.portfolio", value: "https://amanchaubey.dev", minConfidence: 0.9 },
    { name: "Current Company", overrides: { label: "Current Company" }, path: "experience[0].company", value: "Fluid AI", minConfidence: 0.9 },
    { name: "Current Employer", overrides: { label: "Current Employer" }, path: "experience[0].company", value: "Fluid AI", minConfidence: 0.9 },
    { name: "Employer", overrides: { label: "Employer" }, path: "experience[0].company", value: "Fluid AI", minConfidence: 0.9 },
    { name: "Company", overrides: { label: "Company" }, path: "experience[0].company", value: "Fluid AI", minConfidence: 0.9 },
    { name: "Current Job Title", overrides: { label: "Current Job Title" }, path: "experience[0].title", value: "Full Stack Developer", minConfidence: 0.9 },
    { name: "Current Position", overrides: { label: "Current Position" }, path: "experience[0].title", value: "Full Stack Developer", minConfidence: 0.9 },
    { name: "Job Title", overrides: { label: "Job Title" }, path: "experience[0].title", value: "Full Stack Developer", minConfidence: 0.9 },
    { name: "Position", overrides: { label: "Position" }, path: "experience[0].title", value: "Full Stack Developer", minConfidence: 0.9 },
    { name: "Role", overrides: { name: "role" }, path: "experience[0].title", value: "Full Stack Developer", minConfidence: 0.9 },
    { name: "University", overrides: { label: "University" }, path: "education[0].institution", value: "Indian Institute of Technology", minConfidence: 0.9 },
    { name: "College", overrides: { label: "College" }, path: "education[0].institution", value: "Indian Institute of Technology", minConfidence: 0.9 },
    { name: "Institution", overrides: { label: "Institution" }, path: "education[0].institution", value: "Indian Institute of Technology", minConfidence: 0.9 },
    { name: "School", overrides: { label: "School" }, path: "education[0].institution", value: "Indian Institute of Technology", minConfidence: 0.9 },
    { name: "Degree", overrides: { label: "Degree" }, path: "education[0].degree", value: "B.Tech", minConfidence: 0.9 },
    { name: "Highest Degree", overrides: { label: "Highest Degree" }, path: "education[0].degree", value: "B.Tech", minConfidence: 0.9 },
    { name: "Qualification", overrides: { label: "Qualification" }, path: "education[0].degree", value: "B.Tech", minConfidence: 0.9 },
    { name: "City", overrides: { label: "City" }, path: "personal.address.city", value: "Bengaluru", minConfidence: 0.9 },
    { name: "Current City", overrides: { label: "Current City" }, path: "personal.address.city", value: "Bengaluru", minConfidence: 0.9 },
    { name: "State", overrides: { label: "State" }, path: "personal.address.state", value: "Karnataka", minConfidence: 0.9 },
    { name: "Province", overrides: { label: "Province" }, path: "personal.address.state", value: "Karnataka", minConfidence: 0.9 },
    { name: "ZIP", overrides: { label: "ZIP" }, path: "personal.address.postalCode", value: "560001", minConfidence: 0.9 },
    { name: "ZIP Code", overrides: { label: "ZIP Code" }, path: "personal.address.postalCode", value: "560001", minConfidence: 0.9 },
    { name: "Postal Code", overrides: { label: "Postal Code" }, path: "personal.address.postalCode", value: "560001", minConfidence: 0.9 },
    { name: "Postcode", overrides: { label: "Postcode" }, path: "personal.address.postalCode", value: "560001", minConfidence: 0.9 },
    { name: "Country", overrides: { label: "Country" }, path: "personal.address.country", value: "India", minConfidence: 0.9 },
    { name: "Country of Residence", overrides: { label: "Country of Residence" }, path: "personal.address.country", value: "India", minConfidence: 0.9 }
  ];

  it.each(cases)("maps $name", async ({ overrides, path, value, minConfidence }) => {
    const match = await matcher.match(field({ id: path, ...overrides }), profile);
    expect(match).not.toBeNull();
    expect(match?.profilePath).toBe(path);
    expect(match?.value).toBe(value);
    expect(match?.confidence ?? 0).toBeGreaterThanOrEqual(minConfidence);
  });

  it("returns no match for unknown fields", async () => {
    const match = await matcher.match(
      field({ id: "color", label: "Favorite Color", name: "favorite_color" }),
      profile
    );
    expect(match).toBeNull();
  });

  it("does not autoselect low-confidence matches", async () => {
    const match = await matcher.match(
      field({
        id: "maybe-email",
        nearbyText: "Please include an email if you have one",
        name: "other"
      }),
      profile
    );
    expect(match).not.toBeNull();
    expect(match?.confidence ?? 1).toBeLessThan(0.9);
    expect(shouldAutoselect(match)).toBe(false);
  });

  it("does not autoselect missing profile values", async () => {
    const empty = createEmptyProfile();
    const match = await matcher.match(field({ id: "email", label: "Email" }), empty);
    expect(match?.profilePath).toBe("personal.email");
    expect(match?.value).toBe("");
    expect(shouldAutoselect(match)).toBe(false);
  });

  it("distinguishes first and last name fields", async () => {
    const first = await matcher.match(field({ id: "first", label: "First Name" }), profile);
    const last = await matcher.match(field({ id: "last", label: "Last Name" }), profile);
    expect(first?.profilePath).toBe("personal.firstName");
    expect(first?.value).toBe("Aman");
    expect(last?.profilePath).toBe("personal.lastName");
    expect(last?.value).toBe("Chaubey");
  });

  it("demotes generic name when first and last name fields exist", () => {
    const results = matcher.matchAll(
      [
        field({ id: "first", label: "First Name" }),
        field({ id: "last", label: "Last Name" }),
        field({ id: "name", label: "Name" })
      ],
      profile
    );
    const generic = results.find((item) => item.field.id === "name");
    expect(generic?.match?.profilePath).toBe("personal.fullName");
    expect(generic?.match?.confidence ?? 1).toBeLessThan(0.7);
    expect(shouldAutoselect(generic?.match ?? null)).toBe(false);
  });

  it("does not map company website to employer", async () => {
    const match = await matcher.match(
      field({ id: "company-url", label: "Company Website" }),
      profile
    );
    expect(match?.profilePath).not.toBe("experience[0].company");
  });

  it("does not map username to full name", async () => {
    const match = await matcher.match(field({ id: "user", label: "Username" }), profile);
    expect(match?.profilePath).not.toBe("personal.fullName");
  });
});
