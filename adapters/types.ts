import type { ApplicationStep } from "~types/application";
import type { JobContext } from "~types/job";
import type { PageContext, SerializableFormField } from "~types/form";

export interface JobSiteAdapter {
  id: string;
  matches(context: PageContext, doc?: Document): boolean;
  detectJob(context: PageContext, doc?: Document): JobContext | null;
  detectApplicationSteps(context: PageContext, doc?: Document): ApplicationStep[];
  detectFields?(context: PageContext, doc?: Document): SerializableFormField[];
}
