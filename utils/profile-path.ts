import type { UserProfile } from "~types/profile";

export function getProfileValue(
  profile: UserProfile,
  path: string
): string | undefined {
  const tokens = path.match(/[^.\[\]]+/g) ?? [];
  let current: unknown = profile;

  for (const token of tokens) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[token];
  }

  if (typeof current === "string") {
    const trimmed = current.trim();
    return trimmed ? trimmed : undefined;
  }

  if (Array.isArray(current)) {
    const joined = current
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");
    return joined || undefined;
  }

  return undefined;
}

export function displayNameFromPath(path: string): string {
  const labels: Record<string, string> = {
    "personal.firstName": "First Name",
    "personal.middleName": "Middle Name",
    "personal.lastName": "Last Name",
    "personal.fullName": "Full Name",
    "personal.email": "Email",
    "personal.phone": "Phone",
    "personal.location": "Location",
    "personal.address.street": "Street",
    "personal.address.city": "City",
    "personal.address.state": "State",
    "personal.address.postalCode": "Postal Code",
    "personal.address.country": "Country",
    "personal.address.fullAddress": "Address",
    "links.linkedin": "LinkedIn",
    "links.github": "GitHub",
    "links.portfolio": "Portfolio",
    "links.website": "Website",
    "experience[0].company": "Current Company",
    "experience[0].title": "Current Job Title",
    "education[0].institution": "University",
    "education[0].degree": "Degree",
    skills: "Skills"
  };
  return labels[path] ?? path;
}
