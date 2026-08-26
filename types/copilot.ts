import type { FieldOption, SerializableFormField } from "./form";
import type { JobContext } from "./job";
import type { FieldMatch } from "./matching";

export type CopilotInputKind = "text" | "choice" | "yesno" | "longtext";

export type CopilotAskReason =
  | "missing_profile"
  | "human_judgment"
  | "ambiguous_match"
  | "choice_unmatched"
  | "narrative";

export interface CopilotAutofillItem {
  fieldId: string;
  label: string;
  value: string;
  reason: string;
}

export interface CopilotAskItem {
  fieldId: string;
  label: string;
  question: string;
  why: string;
  reason: CopilotAskReason;
  inputKind: CopilotInputKind;
  options?: FieldOption[];
  suggested?: string;
  required?: boolean;
}

export interface CopilotPlan {
  autofill: CopilotAutofillItem[];
  ask: CopilotAskItem[];
  skipped: Array<{ fieldId: string; label: string; reason: string }>;
}

export interface CopilotTurn {
  question: string;
  why: string;
  suggestion: string;
  suggestionConfidence: number;
  inputKind: CopilotInputKind;
  choices: string[];
  model?: string;
}

export interface CopilotQuestionRequest {
  field: SerializableFormField;
  match?: FieldMatch | null;
  job?: JobContext | null;
  suggested?: string;
  options?: FieldOption[];
}
