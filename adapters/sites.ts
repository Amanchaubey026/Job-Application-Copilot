import { extractJobDescription } from "~lib/job-extractor";
import { detectFormFields, toSerializable } from "~lib/form-detector";
import type { PageContext } from "~types/form";
import type { JobSiteAdapter } from "./types";
import { detectApplicationSteps } from "./steps";
import { genericAdapter } from "./generic";

function hostIncludes(context: PageContext, parts: string[]): boolean {
  const host = (context.hostname || context.url).toLowerCase();
  return parts.some((part) => host.includes(part));
}

function siteAdapter(id: string, hosts: string[]): JobSiteAdapter {
  return {
    id,
    matches(context) {
      return hostIncludes(context, hosts);
    },
    detectJob(context, doc) {
      const generic = doc ? extractJobDescription(doc) : null;
      return {
        url: context.url,
        title: generic?.title || context.title,
        company: generic?.company,
        location: generic?.location,
        description: generic?.description,
        confidence: Math.max(generic?.confidence ?? 0.4, 0.7)
      };
    },
    detectApplicationSteps(_context, doc) {
      return doc ? detectApplicationSteps(doc) : [];
    },
    detectFields(_context, doc) {
      if (!doc) return [];
      const scoped =
        doc.querySelector("#application_form, .application-form, [data-qa='application'], form");
      return detectFormFields(scoped ?? doc).map(toSerializable);
    }
  };
}

export const greenhouseAdapter = siteAdapter("greenhouse", ["greenhouse.io", "boards.greenhouse.io"]);
export const leverAdapter = siteAdapter("lever", ["jobs.lever.co", "lever.co"]);
export const workdayAdapter = siteAdapter("workday", ["myworkdayjobs.com", "workday.com"]);
export const ashbyAdapter = siteAdapter("ashby", ["ashbyhq.com", "jobs.ashbyhq.com"]);

export const zohoAdapter: JobSiteAdapter = {
  ...siteAdapter("zoho", ["zohorecruit.com", "recruit.zoho.", "zohorecruit.eu"]),
  detectFields(_context, doc) {
    return doc ? detectFormFields(doc).map(toSerializable) : [];
  }
};

const ADAPTERS: JobSiteAdapter[] = [
  greenhouseAdapter,
  leverAdapter,
  workdayAdapter,
  ashbyAdapter,
  zohoAdapter
];

export function pickAdapter(context: PageContext): JobSiteAdapter {
  return ADAPTERS.find((adapter) => adapter.matches(context)) ?? genericAdapter;
}
