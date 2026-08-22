import type {
  Certification,
  Education,
  ExtractionSummary,
  Language,
  Project,
  UserProfile,
  WorkExperience
} from "~types/profile";
import { createId } from "~utils/id";
import { collapseWhitespace, uniqueStrings } from "~utils/normalize";
import { createEmptyProfile } from "~utils/profile-factory";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE =
  /(?:\+\d{1,3}[\s.-]*)?(?:\(?\d{2,5}\)?[\s.-]*){2,4}\d{2,5}/g;
const URL_RE = /https?:\/\/[^\s)|,]+/gi;
const BARE_URL_RE =
  /\b(?:www\.)?[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(?:\/[^\s)|,]*)?/gi;
const MONTHS =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const DATE_CHUNK = `(?:(?:${MONTHS})\\.?\\s+)?(?:(?:19|20)\\d{2}|'\\d{2})`;
const NUMERIC_DATE = `(?:\\d{1,2}[/-])(?:\\d{1,2}[/-])?(?:(?:19|20)\\d{2}|\\d{2})`;
const PRESENT = "present|current|now|till\\s*date|to\\s*date|ongoing";
const RANGE_SEP = "\\s*(?:-|–|—|−|to)\\s*";
const DATE_RANGE_RE = new RegExp(
  `((?:${DATE_CHUNK}|${NUMERIC_DATE}))${RANGE_SEP}((?:${PRESENT}|${DATE_CHUNK}|${NUMERIC_DATE}))`,
  "i"
);
const YEAR_RANGE_RE = /((?:19|20)\d{2})\s*(?:-|–|—|−|to)\s*((?:19|20)\d{2}|present|current|now|ongoing)/i;
const LOCATION_RE =
  /\b([A-Z][A-Za-z. ]+),\s*([A-Z]{2}|[A-Z][A-Za-z. ]+)(?:,\s*([A-Z][A-Za-z. ]+))?\b/;
const STREET_RE =
  /\b\d{1,6}\s+[A-Za-z0-9. ]+(?:street|st|road|rd|avenue|ave|blvd|lane|ln|drive|dr|way|court|ct)\b/i;

const SECTION_ALIASES: Record<string, string[]> = {
  experience: [
    "experience",
    "work experience",
    "employment",
    "professional experience",
    "work history",
    "employment history",
    "career history",
    "internship",
    "internships",
    "relevant experience",
    "professional background"
  ],
  education: [
    "education",
    "academic background",
    "academics",
    "academic qualifications",
    "educational qualifications",
    "academic history",
    "qualifications"
  ],
  skills: [
    "skills",
    "technical skills",
    "core skills",
    "technologies",
    "tech stack",
    "expertise",
    "competencies",
    "tools",
    "technical proficiencies",
    "skill set",
    "skillset",
    "core competencies"
  ],
  projects: ["projects", "personal projects", "key projects", "selected projects", "academic projects"],
  certifications: [
    "certifications",
    "certificates",
    "licenses",
    "licenses certifications",
    "licenses & certifications"
  ],
  languages: ["languages", "language proficiency", "spoken languages"],
  summary: [
    "summary",
    "profile",
    "about",
    "objective",
    "professional summary",
    "about me",
    "career objective"
  ],
  links: ["links", "profiles", "social", "social links", "online"]
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
  "product manager",
  "product designer",
  "data scientist",
  "data analyst",
  "data engineer",
  "associate",
  "executive",
  "head of",
  "vice president",
  "president",
  "ceo",
  "cto",
  "cfo",
  "coo",
  "sde",
  "swe"
];

const DEGREE_RE =
  /\b(b\.?\s?tech|b\.?\s?e\.?|b\.?\s?s\.?|b\.?\s?sc|b\.?\s?a\.?|bca|mca|m\.?\s?tech|m\.?\s?s\.?|m\.?\s?sc|m\.?\s?eng|mba|ph\.?\s?d\.?|bachelor(?:'s)?(?:\s+of\s+\w+)?|master(?:'s)?(?:\s+of\s+\w+)?|associate(?:'s)?|diploma|btech|mtech|high school|secondary)\b/i;

const INSTITUTION_RE =
  /\b(university|college|institute|school|academy|iit|nit|mit|polytechnic|vidyalaya)\b/i;

const COMPANY_HINT_RE =
  /\b(inc|llc|ltd|limited|corp|corporation|pvt|private|gmbh|labs?|technologies|technology|systems|solutions|studio|group|partners|ventures|ai|software|consulting)\b/i;

const DESCRIPTION_START_RE =
  /^(?:[-•●▪◦*–—]\s*)?(built|developed|worked|designed|implemented|created|led|managed|responsible|collaborated|improved|increased|reduced|wrote|owned|helped|maintained|deployed|delivered|optimized|automated|migrated|supported|partnered|spearheaded|drove|achieved)/i;

type SectionName = keyof typeof SECTION_ALIASES | "header";

interface ParsedSection {
  name: SectionName;
  lines: string[];
}

const ALL_SECTION_ALIASES = Object.entries(SECTION_ALIASES)
  .flatMap(([name, aliases]) => aliases.map((alias) => ({ name: name as SectionName, alias })))
  .sort((a, b) => b.alias.length - a.alias.length);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeHeader(line: string): string {
  return line
    .toLowerCase()
    .replace(/[:\-–—]/g, " ")
    .replace(/[^a-z0-9\s&]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+&\s+/g, " ")
    .trim();
}

function matchSectionAlias(normalized: string): { name: SectionName; alias: string } | null {
  for (const entry of ALL_SECTION_ALIASES) {
    if (normalized === entry.alias) return entry;
    if (normalized.startsWith(`${entry.alias} `)) return entry;
  }
  return null;
}

function detectSectionPeek(line: string): { name: SectionName; rest: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return null;
  const normalized = normalizeHeader(trimmed);
  if (!normalized) return null;
  const hit = matchSectionAlias(normalized);
  if (!hit) return null;
  if (normalized === hit.alias) return { name: hit.name, rest: "" };
  const rest = trimmed.replace(new RegExp(`^[^:]{1,40}:\\s*`, "i"), "").trim();
  if (normalizeHeader(rest) === hit.alias) return { name: hit.name, rest: "" };
  if (rest && normalizeHeader(rest) !== hit.alias && !matchSectionAlias(normalizeHeader(rest))) {
    const stripped = trimmed.replace(
      new RegExp(`^${escapeRegExp(hit.alias)}\\s*[:\\-–—]?\\s*`, "i"),
      ""
    );
    return { name: hit.name, rest: stripped.trim() };
  }
  return { name: hit.name, rest: "" };
}

function insertSectionBreaks(text: string): string {
  const header =
    "WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|TECHNICAL SKILLS|EXPERIENCE|EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS|LANGUAGES|SUMMARY|OBJECTIVE";
  let next = text.replace(new RegExp(`\\b(${header})(?=[A-Z])`, "g"), "$1\n");
  next = next.replace(new RegExp(`([a-z.])(${header})\\b`, "g"), "$1\n$2");
  next = next.replace(new RegExp(`(${header})\\b`, "g"), (match, _g: string, offset: number, source: string) => {
    if (offset === 0 || source[offset - 1] === "\n") return match;
    return `\n${match}`;
  });
  return next;
}

function splitLines(text: string): string[] {
  const exploded = insertSectionBreaks(text.replace(/\r\n/g, "\n").replace(/\u00a0/g, " "));
  const raw = exploded.split("\n").map((line) => collapseWhitespace(line));

  const lines: string[] = [];
  for (const line of raw) {
    if (!line) {
      lines.push("");
      continue;
    }
    const peek = detectSectionPeek(line);
    if (peek && peek.rest) {
      lines.push(line.slice(0, line.length - peek.rest.length).replace(/[:\-–—]\s*$/, "").trim());
      lines.push(peek.rest);
      continue;
    }
    const parts = line.split(/\s*[|•·]\s*/).map((part) => collapseWhitespace(part)).filter(Boolean);
    if (parts.length > 1 && parts.some((part) => EMAIL_RE.test(part) || /linkedin|github|http|\+\d/i.test(part))) {
      EMAIL_RE.lastIndex = 0;
      lines.push(...parts);
      continue;
    }
    lines.push(line);
  }
  return lines;
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
    const peek = detectSectionPeek(line);
    if (peek && !peek.rest) {
      sections.push({ name: peek.name, lines: [] });
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
  EMAIL_RE.lastIndex = 0;
  return uniqueStrings(Array.from(text.matchAll(EMAIL_RE), (match) => match[0]));
}

function isYearCluster(digits: string): boolean {
  return /^(?:19|20)\d{2}(?:(?:19|20)\d{2})+$/.test(digits);
}

function extractPhones(headerLines: string[]): string[] {
  const lineRe = /(?:\+\d{1,3}[\s.-]*)?(?:\d[\s().-]*){9,14}\d/g;
  const matches: string[] = [];
  for (const line of headerLines.slice(0, 16)) {
    lineRe.lastIndex = 0;
    for (const match of line.matchAll(lineRe)) {
      matches.push(match[0].trim());
    }
  }
  return uniqueStrings(
    matches.filter((value) => {
      const digits = value.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) return false;
      if (isYearCluster(digits)) return false;
      return true;
    })
  );
}

function extractUrls(text: string): string[] {
  const withoutEmails = text.replace(EMAIL_RE, " ");
  const fromProtocol = Array.from(withoutEmails.matchAll(URL_RE), (match) => match[0].replace(/[.,;]+$/, ""));
  const linkedin = Array.from(
    withoutEmails.matchAll(/\b(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?/gi),
    (match) => match[0]
  );
  const github = Array.from(
    withoutEmails.matchAll(/\b(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+\/?/gi),
    (match) => match[0]
  );
  const bare = Array.from(withoutEmails.matchAll(BARE_URL_RE), (match) => match[0].replace(/[.,;]+$/, "")).filter(
    (value) =>
      /\.(com|dev|io|me|co|org|net|in|ai)\b/i.test(value) &&
      (/www\.|\//.test(value) || /linkedin|github/i.test(value))
  );
  return uniqueStrings([...fromProtocol, ...linkedin, ...github, ...bare]);
}

function withProtocol(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function classifyLinks(urls: string[]): UserProfile["links"] {
  const links: UserProfile["links"] = { other: [] };
  for (const raw of urls) {
    const url = withProtocol(raw.replace(/^www\./i, "www."));
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

function stripContactTokens(line: string): string {
  EMAIL_RE.lastIndex = 0;
  PHONE_RE.lastIndex = 0;
  return collapseWhitespace(
    line
      .replace(EMAIL_RE, " ")
      .replace(PHONE_RE, " ")
      .replace(URL_RE, " ")
      .replace(/\b(?:https?:\/\/)?(?:www\.)?(?:linkedin|github)\.com\/\S+/gi, " ")
      .replace(/\b(?:email|phone|mobile|tel|linkedin|github)\s*:\s*/gi, " ")
      .replace(/[|•·,]/g, " ")
  );
}

function looksLikeName(line: string): boolean {
  const cleaned = stripContactTokens(line);
  if (!cleaned || cleaned.length > 60) return false;
  if (/@|http|www\./i.test(cleaned)) return false;
  if (detectSectionPeek(cleaned)) return false;
  const blocked = [
    "developer",
    "engineer",
    "resume",
    "curriculum",
    "phone",
    "email",
    "address",
    "profile",
    "manager",
    "analyst",
    "intern",
    "consultant"
  ];
  if (blocked.some((word) => cleaned.toLowerCase().includes(word))) return false;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;
  const nameWord = /^(?:[A-Z][A-Za-z'’.-]*|[A-Z]{2,}|[A-Z]\.)$/;
  return words.every((word) => nameWord.test(word.replace(/,$/, "")));
}

function toNameCase(fullName: string): string {
  if (fullName !== fullName.toUpperCase() || !/[A-Z]/.test(fullName)) return fullName;
  return fullName
    .split(/\s+/)
    .map((word) => {
      if (/^[A-Z]\.$/.test(word)) return word;
      return word
        .split("-")
        .map((part) =>
          part
            .split("'")
            .map((chunk) => (chunk ? chunk[0] + chunk.slice(1).toLowerCase() : chunk))
            .join("'")
        )
        .join("-");
    })
    .join(" ");
}

function splitName(fullName: string): {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullName: string;
} {
  const normalized = toNameCase(fullName.replace(/,$/, "").trim());
  if (/,/.test(normalized)) {
    const [last, first] = normalized.split(",").map((part) => part.trim());
    if (first && last) {
      const firstParts = first.split(/\s+/);
      return {
        firstName: firstParts[0],
        middleName: firstParts.slice(1).join(" ") || undefined,
        lastName: last,
        fullName: `${first} ${last}`
      };
    }
  }
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], fullName: normalized };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1], fullName: normalized };
  }
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
    fullName: normalized
  };
}

function peelNameFromHeadline(line: string): string | undefined {
  const words = stripContactTokens(line).split(/\s+/).filter(Boolean);
  if (words.length < 2) return undefined;
  const two = words.slice(0, 2).join(" ");
  const rest = words.slice(2).join(" ");
  if (looksLikeName(two) && rest && looksLikeTitle(rest)) return toNameCase(two);
  for (let count = Math.min(4, words.length); count >= 2; count -= 1) {
    const candidate = words.slice(0, count).join(" ");
    if (looksLikeName(candidate)) return toNameCase(candidate);
  }
  return undefined;
}

function extractName(header: string[]): string | undefined {
  for (const line of header.slice(0, 10)) {
    const cleaned = stripContactTokens(line);
    if (looksLikeName(cleaned)) return toNameCase(cleaned);
    const peeled = peelNameFromHeadline(line);
    if (peeled) return peeled;
  }
  const first = stripContactTokens(header[0] ?? "");
  if (
    first &&
    first.split(/\s+/).length >= 2 &&
    first.split(/\s+/).length <= 5 &&
    !looksLikeTitle(first) &&
    !detectSectionPeek(first) &&
    first.length <= 60
  ) {
    return toNameCase(first);
  }
  return undefined;
}

function extractLocation(lines: string[]): {
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  street?: string;
  postalCode?: string;
} {
  for (const line of lines.slice(0, 14)) {
    if (/@|linkedin|github|http/i.test(line)) continue;
    const street = line.match(STREET_RE)?.[0];
    const postal =
      line.match(/\b\d{5}(?:-\d{4})?\b/)?.[0] ??
      line.match(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i)?.[0] ??
      line.match(/\b[1-9]\d{5}\b/)?.[0];
    const loc = line.match(LOCATION_RE);
    if (loc) {
      return {
        location: collapseWhitespace(loc[0]),
        city: loc[1]?.trim(),
        state: loc[2]?.trim(),
        country: loc[3]?.trim(),
        street,
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
  const current = /present|current|now|ongoing|till\s*date|to\s*date/i.test(endRaw);
  return {
    startDate: startDate || undefined,
    endDate: current ? "Present" : endRaw || undefined,
    current
  };
}

function hasDate(line: string): boolean {
  return DATE_RANGE_RE.test(line) || YEAR_RANGE_RE.test(line);
}

function looksLikeTitle(line: string): boolean {
  const lower = line.toLowerCase();
  if (isDescription(line)) return false;
  return TITLE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function isDescription(line: string): boolean {
  if (/^[-•●▪◦*]/.test(line)) return true;
  if (DESCRIPTION_START_RE.test(line)) return true;
  if (line.length > 110) return true;
  return false;
}

function looksLikeCompany(line: string): boolean {
  if (!line || isDescription(line) || hasDate(line) || looksLikeTitle(line)) return false;
  if (line.length > 80) return false;
  if (COMPANY_HINT_RE.test(line)) return true;
  if (line.split(/\s+/).length <= 6 && !DEGREE_RE.test(line)) return true;
  return false;
}

function stripDates(line: string): string {
  return collapseWhitespace(line.replace(DATE_RANGE_RE, " ").replace(YEAR_RANGE_RE, " ")).replace(/[|•·,/-]\s*$/, "");
}

function shouldStartNewExperience(line: string, current: string[]): boolean {
  if (!current.length) return false;
  if (isDescription(line)) return false;
  const currentText = current.join("\n");
  const currentHasDate = hasDate(currentText);
  const currentHasDesc = current.some(isDescription);
  const lineHasDate = hasDate(line);

  if (lineHasDate && currentHasDate && !isDescription(line) && line.length < 90) return true;
  if (currentHasDate && currentHasDesc && !lineHasDate && line.length <= 80) return true;
  if (currentHasDate && looksLikeTitle(line) && current.some(looksLikeTitle)) return true;
  if (currentHasDate && looksLikeCompany(line) && current.some((row) => looksLikeCompany(row) || looksLikeTitle(row))) {
    return true;
  }
  return false;
}

function assignTitleCompany(lines: string[]): { title?: string; company?: string; leftover: string[] } {
  const leftover: string[] = [];
  let title: string | undefined;
  let company: string | undefined;

  const first = lines[0] ? stripDates(lines[0]) : "";
  const atMatch = first.match(/^(.*?)\s+at\s+(.+)$/i);
  const atTitle = atMatch?.[1];
  const atCompany = atMatch?.[2];
  if (atTitle && atCompany && looksLikeTitle(atTitle)) {
    title = collapseWhitespace(atTitle);
    company = collapseWhitespace(atCompany.split(",")[0] ?? atCompany);
    leftover.push(...lines.slice(1));
    return { title, company, leftover };
  }

  const pipeParts = first.split(/\s*[|•·]\s*/).map(collapseWhitespace).filter(Boolean);
  if (pipeParts.length >= 2) {
    const titlePart = pipeParts.find(looksLikeTitle);
    const companyPart = pipeParts.find((part) => part !== titlePart && !hasDate(part));
    title = titlePart;
    company = companyPart;
    leftover.push(...lines.slice(1));
    return { title, company, leftover };
  }

  const candidates = lines.map(stripDates).filter(Boolean);
  const titleLine = candidates.find(looksLikeTitle);
  const companyLine = candidates.find((line) => line !== titleLine && looksLikeCompany(line));

  if (titleLine && companyLine) {
    title = titleLine;
    company = companyLine;
  } else if (titleLine) {
    title = titleLine;
    company = candidates.find((line) => line !== titleLine && !isDescription(line) && !hasDate(line));
  } else if (candidates[0] && !isDescription(candidates[0])) {
    company = candidates[0];
    title = candidates.find((line, index) => index > 0 && looksLikeTitle(line));
  }

  leftover.push(
    ...lines.filter((line) => {
      const stripped = stripDates(line);
      if (!stripped) return false;
      return stripped !== title && stripped !== company && stripped !== first;
    })
  );

  return { title, company, leftover };
}

function parseExperience(lines: string[]): WorkExperience[] {
  const entries: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (current.length) {
        entries.push(current);
        current = [];
      }
      continue;
    }
    if (shouldStartNewExperience(line, current)) {
      entries.push(current);
      current = [line];
      continue;
    }
    current.push(line);
  }
  if (current.length) entries.push(current);

  const items: WorkExperience[] = [];
  for (const block of entries) {
    if (block.length === 0) continue;
    const dateLine = block.find(hasDate);
    const dates = dateLine ? parseDateRange(dateLine) : parseDateRange(block.join(" "));
    const assigned = assignTitleCompany(block);
    const locationLine = assigned.leftover.find((line) => LOCATION_RE.test(line) && !isDescription(line));
    const description = assigned.leftover
      .filter((line) => line !== locationLine)
      .join("\n")
      .trim();

    if (!assigned.title && !assigned.company && !description) continue;

    items.push({
      id: createId(),
      title: assigned.title || undefined,
      company: assigned.company && assigned.company !== assigned.title ? assigned.company : undefined,
      location: locationLine ? collapseWhitespace(locationLine) : undefined,
      startDate: dates.startDate,
      endDate: dates.endDate,
      current: dates.current,
      description: description || undefined
    });
  }

  return items;
}

function shouldStartNewEducation(line: string, current: string[]): boolean {
  if (!current.length) return false;
  if (isDescription(line)) return false;
  const currentHasDate = hasDate(current.join("\n"));
  if (hasDate(line) && currentHasDate) return true;
  if (currentHasDate && (INSTITUTION_RE.test(line) || DEGREE_RE.test(line))) return true;
  if (INSTITUTION_RE.test(line) && current.some((row) => INSTITUTION_RE.test(row))) return true;
  return false;
}

function parseEducation(lines: string[]): Education[] {
  const entries: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (current.length) {
        entries.push(current);
        current = [];
      }
      continue;
    }
    if (shouldStartNewEducation(line, current)) {
      entries.push(current);
      current = [line];
      continue;
    }
    current.push(line);
  }
  if (current.length) entries.push(current);

  const items: Education[] = [];
  for (const block of entries.length ? entries : splitBlocks(lines)) {
    if (block.length === 0) continue;
    const dateLine = block.find(hasDate);
    const dates = dateLine ? parseDateRange(dateLine) : parseDateRange(block.join(" "));
    const source = block.map(stripDates).filter(Boolean);
    const joined = source.join(", ");
    const parts = joined.split(",").map((part) => collapseWhitespace(part)).filter(Boolean);
    const degreeLine =
      source.find((line) => DEGREE_RE.test(line)) ?? (DEGREE_RE.test(joined) ? joined : undefined);
    let institutionLine =
      source.find((line) => INSTITUTION_RE.test(line) && line !== degreeLine) ??
      parts.find((part) => INSTITUTION_RE.test(part)) ??
      source.find((line) => line !== degreeLine && !isDescription(line) && !/gpa|grade|cgpa/i.test(line));

    let degree = degreeLine;
    let field: string | undefined;
    if (degreeLine) {
      const inMatch = degreeLine.match(/\bin\s+(.+)$/i);
      if (inMatch?.[1]) {
        const fieldRaw = collapseWhitespace(inMatch[1].replace(/[,|].*$/, ""));
        if (fieldRaw && !/^(arts|science|engineering|technology|business)$/i.test(fieldRaw)) {
          field = fieldRaw;
          degree = collapseWhitespace(degreeLine.slice(0, inMatch.index).trim());
        }
      }
      if (!field && /,\s+/.test(degreeLine)) {
        const degreeParts = degreeLine.split(",").map((part) => collapseWhitespace(part));
        degree = degreeParts.find((part) => DEGREE_RE.test(part)) ?? degree;
        field =
          field ??
          degreeParts.find(
            (part) => part !== degree && !INSTITUTION_RE.test(part) && !hasDate(part)
          );
        institutionLine =
          institutionLine ?? degreeParts.find((part) => INSTITUTION_RE.test(part));
      }
    }

    if (degree && INSTITUTION_RE.test(degree) && degree.includes(",")) {
      const degreeParts = degree.split(",").map((part) => collapseWhitespace(part));
      institutionLine = institutionLine ?? degreeParts.find((part) => INSTITUTION_RE.test(part));
      degree = degreeParts.find((part) => DEGREE_RE.test(part)) ?? degree;
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

function isSkillToken(item: string): boolean {
  if (!item || item.length > 40) return false;
  if (detectSectionPeek(item)) return false;
  if (item.split(/\s+/).length > 5) return false;
  if (/^(and|or|including|with|using|the|a|an)$/i.test(item)) return false;
  if (hasDate(item) || EMAIL_RE.test(item)) return false;
  return /[A-Za-z]/.test(item);
}

function parseSkills(lines: string[]): string[] {
  const raw: string[] = [];
  for (const line of lines) {
    const withoutCategory = line.replace(/^[^:]{1,32}:\s*/, "");
    const parts = withoutCategory.split(/[,|;•●·/]+|\s{2,}/);
    for (const part of parts) {
      const skill = collapseWhitespace(part);
      if (isSkillToken(skill)) raw.push(skill);
    }
  }
  return uniqueStrings(raw);
}

function parseProjects(lines: string[]): Project[] {
  const blocks = splitBlocks(lines);
  const fromBreaks = blocks.filter((block) => block.length > 0);
  const entries = fromBreaks.length > 1 ? fromBreaks : splitProjectEntries(lines);
  return entries.map((block) => {
    const [name, ...rest] = block;
    const url = extractUrls(block.join(" "))[0];
    return {
      id: createId(),
      name,
      url: url ? withProtocol(url) : undefined,
      description: rest.filter((line) => !extractUrls(line).length).join(" ").trim() || undefined
    };
  });
}

function splitProjectEntries(lines: string[]): string[][] {
  const entries: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (current.length) {
        entries.push(current);
        current = [];
      }
      continue;
    }
    if (current.length && !isDescription(line) && line.length <= 60 && current.some(isDescription)) {
      entries.push(current);
      current = [line];
      continue;
    }
    current.push(line);
  }
  if (current.length) entries.push(current);
  return entries;
}

function parseCertifications(lines: string[]): Certification[] {
  return lines
    .filter((line) => line && !detectSectionPeek(line))
    .map((line) => ({
      id: createId(),
      name: stripDates(line) || line,
      date: parseDateRange(line).startDate ?? parseDateRange(line).endDate
    }));
}

function parseLanguages(lines: string[]): Language[] {
  const tokens = parseSkills(lines);
  return tokens.map((name) => ({ id: createId(), name }));
}

function linesOf(sections: ParsedSection[], name: SectionName): string[] {
  return sections.filter((section) => section.name === name).flatMap((section) => section.lines);
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
  const phones = extractPhones(header);
  const urls = extractUrls(cleaned);
  const nameLine = extractName(header);
  const names = nameLine
    ? splitName(nameLine)
    : { firstName: undefined, middleName: undefined, lastName: undefined, fullName: undefined };
  const location = extractLocation(header);
  const links = classifyLinks(urls);

  const experience = parseExperience(linesOf(sections, "experience"));
  const education = parseEducation(linesOf(sections, "education"));
  const skills = parseSkills(linesOf(sections, "skills"));
  const projects = parseProjects(linesOf(sections, "projects"));
  const certifications = parseCertifications(linesOf(sections, "certifications"));
  const languages = parseLanguages(linesOf(sections, "languages"));

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
    certifications: certifications.length ? certifications : undefined,
    languages: languages.length ? languages : undefined,
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
