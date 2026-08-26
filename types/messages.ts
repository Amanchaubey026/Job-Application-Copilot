import type { ApplicationCompleteness, ApplicationStep } from "./application";
import type { CopilotPlan, CopilotTurn } from "./copilot";
import type { FillFieldRequest, FillFieldResult, PageContext, SerializableFormField } from "./form";
import type { ApplicationQuestion, JobContext } from "./job";
import type { UserProfile } from "./profile";

export type ExtensionMessage =
  | { type: "GET_PROFILE" }
  | { type: "SCAN_FORM" }
  | { type: "FILL_FIELDS"; fields: FillFieldRequest[] }
  | { type: "GET_PAGE_CONTEXT" }
  | { type: "GET_JOB_CONTEXT" }
  | { type: "PING" }
  | { type: "OPEN_COPILOT" }
  | { type: "CLOSE_COPILOT" }
  | {
      type: "COPILOT_PLAN";
      fields: SerializableFormField[];
      questions: ApplicationQuestion[];
      job: JobContext | null;
    }
  | {
      type: "COPILOT_QUESTION";
      field: SerializableFormField;
      job: JobContext | null;
      suggested?: string;
    };

export type GetProfileResponse =
  | { ok: true; profile: UserProfile | null }
  | { ok: false; error: string };

export type ScanFormResponse =
  | {
      ok: true;
      fields: SerializableFormField[];
      page: PageContext;
      job: JobContext;
      questions: ApplicationQuestion[];
      steps: ApplicationStep[];
      completeness: ApplicationCompleteness;
      adapterId: string;
    }
  | { ok: false; error: string };

export type FillFieldsResponse =
  | { ok: true; results: FillFieldResult[] }
  | { ok: false; error: string };

export type GetPageContextResponse =
  | { ok: true; page: PageContext }
  | { ok: false; error: string };

export type GetJobContextResponse =
  | { ok: true; job: JobContext; questions: ApplicationQuestion[] }
  | { ok: false; error: string };

export type PingResponse = { ok: true };

export type OpenCopilotResponse = { ok: true } | { ok: false; error: string };

export type CopilotPlanResponse =
  | {
      ok: true;
      plan: CopilotPlan;
      ollamaReady: boolean;
      model: string;
      ollamaStatus: string;
      profileName: string;
    }
  | { ok: false; error: string };

export type CopilotQuestionResponse =
  | { ok: true; ollamaReady: boolean; model: string; turn: CopilotTurn }
  | { ok: false; error: string };

export type ExtensionResponse =
  | GetProfileResponse
  | ScanFormResponse
  | FillFieldsResponse
  | GetPageContextResponse
  | GetJobContextResponse
  | PingResponse
  | OpenCopilotResponse
  | CopilotPlanResponse
  | CopilotQuestionResponse;

const MESSAGE_TYPES = new Set([
  "GET_PROFILE",
  "SCAN_FORM",
  "FILL_FIELDS",
  "GET_PAGE_CONTEXT",
  "GET_JOB_CONTEXT",
  "PING",
  "OPEN_COPILOT",
  "CLOSE_COPILOT",
  "COPILOT_PLAN",
  "COPILOT_QUESTION"
]);

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === "string" && MESSAGE_TYPES.has(type);
}
