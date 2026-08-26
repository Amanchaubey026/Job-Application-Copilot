import type { SerializableFormField } from "~types/form";
import type { JobContext } from "~types/job";
import { SYSTEM_ROLE, wrapTrusted, wrapUntrusted } from "./system";

export const COPILOT_TURN_PROMPT_VERSION = "1.0.0";

export function buildCopilotTurnPrompt(input: {
  field: SerializableFormField;
  job?: JobContext | null;
  profileSummary: string;
  suggested?: string;
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `${SYSTEM_ROLE}

You are filling a job application with the candidate. Ask them a short, specific question when you need their involvement. Do not invent facts that are not in the profile summary.

Return JSON:
{
  "question": "one question to ask the human",
  "why": "one sentence why you cannot fill this yourself",
  "suggestion": "optional suggested answer from the profile, or empty string",
  "suggestionConfidence": 0.0,
  "inputKind": "text" | "choice" | "yesno" | "longtext",
  "choices": ["optional", "choice", "labels"]
}

If the field has options, copy them into choices. Prefer yes/no for authorization and sponsorship questions. Never recommend submitting the application.`;

  const userPrompt = [
    wrapTrusted("PROFILE SUMMARY", input.profileSummary),
    wrapUntrusted(
      "JOB INFORMATION",
      JSON.stringify(
        {
          title: input.job?.title ?? "",
          company: input.job?.company ?? "",
          location: input.job?.location ?? ""
        },
        null,
        2
      )
    ),
    wrapUntrusted(
      "FORM FIELD",
      JSON.stringify(
        {
          label: input.field.label ?? "",
          name: input.field.name ?? "",
          type: input.field.inputType ?? input.field.elementType,
          required: Boolean(input.field.required),
          placeholder: input.field.placeholder ?? "",
          options: (input.field.options ?? []).slice(0, 40).map((option) => option.label),
          currentValue: input.field.currentValue ?? "",
          suggestedFromProfile: input.suggested ?? ""
        },
        null,
        2
      )
    ),
    wrapTrusted("TASK", "Ask the candidate what to enter. JSON only.")
  ].join("\n\n");

  return { systemPrompt, userPrompt };
}

void COPILOT_TURN_PROMPT_VERSION;
