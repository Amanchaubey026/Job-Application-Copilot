import type { SerializableFormField } from "~types/form";
import { SYSTEM_ROLE, wrapTrusted, wrapUntrusted } from "./system";
import { PROFILE_SOURCE_ALLOWLIST } from "~ai/allowlist";

export function buildFieldClassificationPrompt(field: SerializableFormField): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `${SYSTEM_ROLE}

Classify a job-application form field. Choose zero or more profile sources from this allowlist only:
${PROFILE_SOURCE_ALLOWLIST.join("\n")}

Return JSON:
{
  "intent": "short_snake_case_intent",
  "profileSources": ["skills"],
  "confidence": 0.0
}

If the field is unrelated to the candidate profile, return an empty profileSources array and low confidence.
Do not invent sources outside the allowlist.`;

  const userPrompt = [
    wrapUntrusted(
      "FORM FIELD",
      JSON.stringify(
        {
          label: field.label ?? "",
          name: field.name ?? "",
          id: field.elementId ?? "",
          placeholder: field.placeholder ?? "",
          autocomplete: field.autocomplete ?? "",
          type: field.inputType ?? field.elementType,
          nearbyText: field.nearbyText ?? "",
          helperText: field.helperText ?? ""
        },
        null,
        2
      )
    ),
    wrapTrusted("TASK", "Classify the field. JSON only.")
  ].join("\n\n");

  return { systemPrompt, userPrompt };
}
