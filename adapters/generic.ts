import { extractJobDescription } from "~lib/job-extractor";
import { detectFormFields, toSerializable } from "~lib/form-detector";
import type { PageContext } from "~types/form";
import type { JobSiteAdapter } from "./types";
import { detectApplicationSteps } from "./steps";

export const genericAdapter: JobSiteAdapter = {
  id: "generic",
  matches() {
    return true;
  },
  detectJob(context, doc) {
    if (!doc) {
      return { url: context.url, title: context.title, confidence: 0.3 };
    }
    return extractJobDescription(doc);
  },
  detectApplicationSteps(_context, doc) {
    return doc ? detectApplicationSteps(doc) : [];
  },
  detectFields(_context, doc) {
    return doc ? detectFormFields(doc).map(toSerializable) : [];
  }
};
