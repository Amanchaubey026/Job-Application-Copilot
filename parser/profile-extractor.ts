import type {
  Education,
  ExtractionSummary,
  Project,
  UserProfile,
  WorkExperience
} from "~types/profile";
import { createId } from "~utils/id";
import { collapseWhitespace, uniqueStrings } from "~utils/normalize";
import { createEmptyProfile } from "~utils/profile-factory";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+\d{1,3}[\s.-]*)?(?:\d[\s().-]*){9,14}\d/g;
const URL_RE = /https?:\/\/[^\s)]+/gi;
const DATE_RANGE_RE =
  /((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2}\/)?\s*(?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:present|current|now|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2}\/)?\s*(?:(?:19|20)\d{2})?)/i;
const YEAR_RANGE_RE = /((?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:19|20)\d{2}|present|current|now)/i;
const LOCATION_RE =
  /\b([A-Z][A-Za-z. ]+),\s*([A-Z]{2}|[A-Z][A-Za-z. ]+)(?:,\s*([A-Z][A-Za-z. ]+))?\b/;
const STREET_RE = /\b\d{1,6}\s+[A-Za-z0-9. ]+(?:street|st|road|rd|avenue|ave|blvd|lane|ln|drive|dr|way|court|ct)\b/i;

const SECTION_ALIASES: Record<string, string[]> = {
  experience: [
    "experience",
    "work experience",
    "employment",
    "professional experience",
    "work history",
    "employment history",
    "career history"
  ],
  education: ["education", "academic background", "academics", "academic qualifications"],
  skills: [
    "skills",
    "technical skills",
    "core skills",
    "technologies",
    "tech stack",
    "expertise",
    "competencies",
    "tools"
  ],
  projects: ["projects", "personal projects", "key projects", "selected projects"],
  certifications: ["certifications", "certificates", "licenses", "licenses certifications"],
  languages: ["languages", "language proficiency"],
  summary: ["summary", "profile", "about", "objective", "professional summary", "about me"],
  links: ["links", "profiles", "social", "social links"]
};

const TITLE_KEYWORDS = [
  "engineer",
  "developer",
  "designer",
  "manager",
  "analyst",
  "intern",
  "consultant",
  "lead",
  "architect",
  "scientist",
  "director",
  "officer",
  "specialist",
  "founder",
  "researcher",
  "administrator",
  "coordinator",
  "programmer",
  "product",
  "data"
];

const DEGREE_RE =
  /\b(b\.?tech|b\.?e\.?|b\.?s\.?|b\.?sc|m\.?tech|m\.?s\.?|m\.?sc|mba|ph\.?d\.?|bachelor(?:'s)?|master(?:'s)?|associate|diploma|btech|mtech)\b/i;

const INSTITUTION_RE = /\b(university|college|institute|school|iit|nit|mit|polytechnic)\b/i;

type SectionName = keyof typeof SECTION_ALIASES | "header";

interface ParsedSection {
  name: SectionName;
  lines: string[];
}

function normalizeHeader(line: string): string {
  return line
    .toLowerCase()
    .replace(/[:\-–—]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectSectionName(line: string): SectionName | null {
  const normalized = normalizeHeader(line);
  if (!normalized || normalized.length > 40) return null;
  for (const [name, aliases] of Object.entries(SECTION_ALIASES)) {
    if (aliases.includes(normalized)) {
      return name as SectionName;
    }
  }
  return null;
}

function splitLines(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => collapseWhitespace(line))
    .map((line) => line.replace(/^[-•●▪◦*]\s*/, ""));
}

function parseSections(lines: string[]): ParsedSection[] {
  const sections: ParsedSection[] = [{ name: "header", lines: [] }];
  for (const line of lines) {
    if (!line) {
      const current = sections[sections.length - 1];
      if (current && current.lines.length > 0 && current.lines[current.lines.length - 1] !== "") {
        current.lines.push("");
      }
      continue;
    }
    const sectionName = detectSectionName(line);
    if (sectionName) {
      sections.push({ name: sectionName, lines: [] });
      continue;
    }
    sections[sections.length - 1]?.lines.push(line);
  }
  return sections.map((section) => ({
    ...section,
    lines: trimBlank(section.lines)
  }));
}

function trimBlank(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && !lines[start]) start += 1;
  while (end > start && !lines[end - 1]) end -= 1;
  return lines.slice(start, end);
}

function extractEmails(text: string): string[] {
  return uniqueStrings(Array.from(text.matchAll(EMAIL_RE), (match) => match[0]));
}

function extractPhones(text: string): string[] {
  const matches = Array.from(text.matchAll(PHONE_RE), (match) => match[0].trim());
  return uniqueStrings(
    matches.filter((value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    })
  );
}

function extractUrls(text: string): string[] {
  const fromProtocol = Array.from(text.matchAll(URL_RE), (match) =>
    match[0].replace(/[.,;]+$/, "")
  );
  const linkedin = Array.from(
    text.matchAll(/\b(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?/gi),
    (match) => match[0]
  );
  const github = Array.from(
    text.matchAll(/\b(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+\/?/gi),
    (match) => match[0]
  );
  return uniqueStrings([...fromProtocol, ...linkedin, ...github]);
}

function withProtocol(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function classifyLinks(urls: string[]): UserProfile["links"] {
  const links: UserProfile["links"] = { other: [] };
  for (const raw of urls) {
    const url = withProtocol(raw);
    const lower = url.toLowerCase();
    if (lower.includes("linkedin.com")) {
      links.linkedin ??= url;
    } else if (lower.includes("github.com")) {
      const path = lower.split("github.com/")[1] ?? "";
      const slug = path.split("/")[0] ?? "";
      if (slug && !["features", "topics", "about", "login", "pricing"].includes(slug)) {
        links.github ??= url;
      }
    } else if (!links.portfolio) {
      links.portfolio = url;
    } else if (!links.website && url !== links.portfolio) {
      links.website = url;
    } else if (url !== links.portfolio && url !== links.website) {
      links.other?.push(url);
    }
  }
  if (links.other?.length === 0) delete links.other;
  return links;
}

function looksLikeName(line: string): boolean {
  if (!line || line.length > 48) return false;
  if (/@|http|www\./i.test(line)) return false;
  if (detectSectionName(line)) return false;
  const blocked = [
    "developer",
    "engineer",
    "resume",
    "curriculum",
    "phone",
    "email",
    "address",
    "profile"
  ];
  if (blocked.some((word) => line.toLowerCase().includes(word))) return false;
  const words = line.split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  return words.every((word) => /^[A-Z][A-Za-z'’-]*$/.test(word) || /^[A-Z]\.$/.test(word));
}

function splitName(fullName: string): {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullName: string;
} {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], fullName };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1], fullName };
  }
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
    fullName
  };
}

function extractLocation(lines: string[]): {
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  street?: string;
  postalCode?: string;
} {
  for (const line of lines.slice(0, 12)) {
    if (/@|linkedin|github|http/i.test(line)) continue;
    const street = line.match(STREET_RE)?.[0];
    const postal =
      line.match(/\b\d{5}(?:-\d{4})?\b/)?.[0] ??
      line.match(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i)?.[0];
    const loc = line.match(LOCATION_RE);
    if (loc) {
      return {
        location: collapseWhitespace(loc[0]),
        city: loc[1]?.trim(),
        state: loc[2]?.trim(),
        country: loc[3]?.trim(),
        street: street,
        postalCode: postal
      };
    }
    if (street || postal) {
      return { street, postalCode: postal, location: line };
    }
  }
  return {};
}

function splitBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (current.length) {
        blocks.push(current);
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length) blocks.push(current);
  return blocks;
}

function parseDateRange(text: string): { startDate?: string; endDate?: string; current?: boolean } {
  const match = text.match(DATE_RANGE_RE) ?? text.match(YEAR_RANGE_RE);
  if (!match) return {};
  const startDate = collapseWhitespace(match[1] ?? "");
  const endRaw = collapseWhitespace(match[2] ?? "");
  const current = /present|current|now/i.test(endRaw);
  return {
    startDate: startDate || undefined,
    endDate: current ? "Present" : endRaw || undefined,
    current
  };
}

function looksLikeTitle(line: string): boolean {
  const lower = line.toLowerCase();
  return TITLE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function parseExperience(lines: string[]): WorkExperience[] {
  const blocks = splitBlocks(lines);
  const items: WorkExperience[] = [];

  for (const block of blocks) {
    if (block.length === 0) continue;
    const dateLine = block.find((line) => DATE_RANGE_RE.test(line) || YEAR_RANGE_RE.test(line));
    const dates = dateLine ? parseDateRange(dateLine) : {};
    const remaining = block.filter((line) => line !== dateLine);
    const titleLine = remaining.find(looksLikeTitle);
    const companyLine = remaining.find(
      (line) => line !== titleLine && !line.startsWith("Built") && line.length <= 80
    );
    const description = remaining
      .filter((line) => line !== titleLine && line !== companyLine)
      .join("\n")
      .trim();

    if (!titleLine && !companyLine && !description) continue;

    items.push({
      id: createId(),
      title: titleLine,
      company: companyLine !== titleLine ? companyLine : undefined,
      startDate: dates.startDate,
      endDate: dates.endDate,
      current: dates.current,
      description: description || undefined
    });
  }

  return items;
}

function parseEducation(lines: string[]): Education[] {
  const blocks = splitBlocks(lines);
  const items: Education[] = [];

  for (const block of blocks) {
    if (block.length === 0) continue;
    const dateLine = block.find((line) => DATE_RANGE_RE.test(line) || YEAR_RANGE_RE.test(line));
    const dates = dateLine ? parseDateRange(dateLine) : {};
    const remaining = block.filter((line) => line !== dateLine);
    const degreeLine = remaining.find((line) => DEGREE_RE.test(line));
    const institutionLine =
      remaining.find((line) => INSTITUTION_RE.test(line) && line !== degreeLine) ??
      remaining.find((line) => line !== degreeLine);

    let degree = degreeLine;
    let field: string | undefined;
    if (degreeLine) {
      const inMatch = degreeLine.match(/\b(?:in|of)\s+(.+)$/i);
      if (inMatch?.[1]) {
        field = collapseWhitespace(inMatch[1]);
        degree = collapseWhitespace(degreeLine.slice(0, inMatch.index).trim());
      }
    }

    if (!institutionLine && !degree) continue;

    items.push({
      id: createId(),
      institution: institutionLine,
      degree: degree || undefined,
      field,
      startDate: dates.startDate,
      endDate: dates.endDate
    });
  }

  return items;
}

function parseSkills(lines: string[]): string[] {
  const raw = lines.join(", ");
  return uniqueStrings(
    raw
      .split(/[,|/•●;]+/)
      .map((item) => collapseWhitespace(item))
      .filter((item) => item.length >= 1 && item.length <= 40)
      .filter((item) => !detectSectionName(item))
  );
}

function parseProjects(lines: string[]): Project[] {
  const blocks = splitBlocks(lines);
  return blocks
    .filter((block) => block.length > 0)
    .map((block) => {
      const [name, ...rest] = block;
      return {
        id: createId(),
        name,
        description: rest.join(" ").trim() || undefined
      };
    });
}

export function extractProfileFromText(
  text: string,
  sourceFileName?: string
): { profile: UserProfile; summary: ExtractionSummary } {
  const cleaned = text.replace(/\u0000/g, "").trim();
  const lines = splitLines(cleaned).filter((line, index, arr) => {
    if (line) return true;
    return Boolean(arr[index - 1]);
  });
  const sections = parseSections(lines);
  const header = sections.find((section) => section.name === "header")?.lines ?? lines.slice(0, 12);
  const emails = extractEmails(cleaned);
  const phones = extractPhones(cleaned);
  const urls = extractUrls(cleaned);
  const nameLine = header.find(looksLikeName);
  const names = nameLine
    ? splitName(nameLine)
    : { firstName: undefined, middleName: undefined, lastName: undefined, fullName: undefined };
  const location = extractLocation(header);
  const links = classifyLinks(urls);

  const experience =
    parseExperience(sections.find((section) => section.name === "experience")?.lines ?? []) ?? [];
  const education =
    parseEducation(sections.find((section) => section.name === "education")?.lines ?? []) ?? [];
  const skills = parseSkills(sections.find((section) => section.name === "skills")?.lines ?? []);
  const projects = parseProjects(sections.find((section) => section.name === "projects")?.lines ?? []);

  const warnings: string[] = [];
  if (!names.fullName) warnings.push("Could not confidently detect a name.");
  if (!emails[0]) warnings.push("No email address found.");
  if (experience.length === 0) warnings.push("No work experience section found.");
  if (education.length === 0) warnings.push("No education section found.");
  if (skills.length === 0) warnings.push("No skills section found.");

  const fullAddress = [location.street, location.city, location.state, location.postalCode, location.country]
    .filter(Boolean)
    .join(", ");

  const profile = createEmptyProfile({
    personal: {
      firstName: names.firstName,
      middleName: names.middleName,
      lastName: names.lastName,
      fullName: names.fullName,
      email: emails[0],
      phone: phones[0],
      location: location.location,
      address: {
        street: location.street,
        city: location.city,
        state: location.state,
        postalCode: location.postalCode,
        country: location.country,
        fullAddress: fullAddress || undefined
      }
    },
    links,
    experience,
    education,
    skills,
    projects,
    rawResumeText: cleaned,
    metadata: {
      sourceFileName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });

  const summary: ExtractionSummary = {
    hasPersonal: Boolean(profile.personal.fullName || profile.personal.email || profile.personal.phone),
    hasExperience: experience.length > 0,
    hasEducation: education.length > 0,
    hasSkills: skills.length > 0,
    hasLinks: Boolean(links.linkedin || links.github || links.portfolio || links.website),
    hasProjects: projects.length > 0,
    warnings
  };

  return { profile, summary };
}
