import type { JobContext } from "~types/job";

const DESCRIPTION_LIMIT = 8000;
const NAV_RE = /nav|footer|header|menu|cookie|subscribe|social|breadcrumb|sidebar/i;
const JOB_HINT_RE =
  /job|role|position|opening|career|description|responsibilit|requirement|qualification|about the job|what you.ll do/i;

function collapse(value?: string | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function uniqueLines(text: string): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const line of text.split(/\n+/)) {
    const trimmed = collapse(line);
    if (!trimmed || trimmed.length < 3) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(trimmed);
  }
  return lines.join("\n");
}

function textOf(el: Element | null | undefined): string {
  if (!el) return "";
  const clone = el.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll("script,style,noscript,svg,nav,footer,header,form,iframe")
    .forEach((node) => node.remove());
  return collapse(clone.innerText || clone.textContent);
}

function jsonLdJobs(doc: Document): Partial<JobContext> {
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  for (const script of scripts) {
    try {
      const parsed: unknown = JSON.parse(script.textContent ?? "");
      const items = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && "@graph" in parsed
          ? (parsed as { "@graph": unknown })["@graph"]
          : [parsed];
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        const type = String(record["@type"] ?? "");
        if (!/JobPosting/i.test(type)) continue;
        const org = record.hiringOrganization;
        const company =
          typeof org === "string"
            ? org
            : org && typeof org === "object" && "name" in org
              ? String((org as { name: unknown }).name)
              : undefined;
        const loc = record.jobLocation;
        let location: string | undefined;
        if (loc && typeof loc === "object") {
          const address = (loc as { address?: { addressLocality?: string; addressRegion?: string } })
            .address;
          location = [address?.addressLocality, address?.addressRegion].filter(Boolean).join(", ");
        }
        return {
          title: typeof record.title === "string" ? record.title : undefined,
          company,
          location: location || (typeof record.jobLocationType === "string" ? record.jobLocationType : undefined),
          description:
            typeof record.description === "string"
              ? collapse(record.description.replace(/<[^>]+>/g, " "))
              : undefined
        };
      }
    } catch {
      continue;
    }
  }
  return {};
}

function metaContent(doc: Document, selector: string): string | undefined {
  const el = doc.querySelector(selector);
  const value = el?.getAttribute("content") || undefined;
  return value ? collapse(value) : undefined;
}

function headingTitle(doc: Document): string | undefined {
  const h1 = collapse(doc.querySelector("h1")?.textContent);
  if (h1 && h1.length < 140) return h1;
  const og = metaContent(doc, 'meta[property="og:title"]');
  if (og) return og.replace(/\s*[|\-–].*$/, "").trim();
  const title = collapse(doc.title).replace(/\s*[|\-–].*$/, "").trim();
  return title || undefined;
}

function guessCompany(doc: Document, jsonLd: Partial<JobContext>): string | undefined {
  if (jsonLd.company) return jsonLd.company;
  const site = metaContent(doc, 'meta[property="og:site_name"]');
  if (site && !/linkedin|indeed|greenhouse|lever|ashby|workday/i.test(site)) return site;
  const labeled = Array.from(doc.querySelectorAll("body *")).find((el) => {
    const text = collapse(el.textContent);
    return /^company$/i.test(text) && text.length < 20;
  });
  const next = labeled?.parentElement?.textContent;
  return next ? collapse(next).replace(/^company/i, "").trim() || undefined : undefined;
}

function descriptionFromContainers(doc: Document): string {
  const selectors = [
    "article",
    "main",
    "[role='main']",
    ".job-description",
    "#job-description",
    ".jobDescription",
    ".description",
    "[data-testid*='job']",
    "[class*='job-desc']",
    "[class*='JobDescription']"
  ];
  const chunks: string[] = [];
  for (const selector of selectors) {
    const el = doc.querySelector(selector);
    if (!el) continue;
    if (NAV_RE.test(el.className) || NAV_RE.test(el.id)) continue;
    const text = uniqueLines(textOf(el));
    if (text.length > 120) chunks.push(text);
  }
  if (chunks.length) {
    return chunks.sort((a, b) => b.length - a.length)[0] ?? "";
  }

  const blocks = Array.from(doc.querySelectorAll("p, li, h2, h3, section, div")).filter((el) => {
    if (el.closest("nav, footer, header, form")) return false;
    const text = collapse(el.textContent);
    return text.length > 80 && JOB_HINT_RE.test(text);
  });
  return uniqueLines(blocks.map((el) => textOf(el)).join("\n"));
}

export function jobIdentity(job: JobContext): string {
  const url = job.url.split("#")[0]?.replace(/\/+$/, "") ?? "";
  const desc = (job.description ?? "").slice(0, 240);
  return [url, job.title ?? "", job.company ?? "", desc].join("|").toLowerCase();
}

export function extractJobDescription(doc: Document = document): JobContext {
  const jsonLd = jsonLdJobs(doc);
  const title = jsonLd.title || headingTitle(doc);
  const company = guessCompany(doc, jsonLd);
  const location =
    jsonLd.location ||
    metaContent(doc, 'meta[name="geo.placename"]') ||
    undefined;
  const description = uniqueLines(
    (jsonLd.description || descriptionFromContainers(doc)).slice(0, DESCRIPTION_LIMIT)
  );

  const signals = [title, company, description].filter((value) => Boolean(value && value.length > 2));
  let confidence = 0.2;
  if (jsonLd.title) confidence = 0.92;
  else if (title && description.length > 200) confidence = 0.75;
  else if (title) confidence = 0.55;
  else if (signals.length) confidence = 0.35;

  return {
    title,
    company,
    location,
    description: description || undefined,
    url: doc.URL || "",
    confidence
  };
}
