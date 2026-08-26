import { resolveFillValue } from "./fill-value";
import {
  fieldDisplayLabel,
  inputKindFor,
  isHumanRequiredField
} from "~matching/human-required";
import { shouldAutoselect } from "~matching/rule-based-matcher";
import type { ApplicationQuestion } from "~types/job";
import type { CopilotAskItem, CopilotPlan } from "~types/copilot";
import type { MatchedField } from "~types/matching";
import type { UserProfile } from "~types/profile";

function askPriority(item: CopilotAskItem): number {
  const label = item.label.toLowerCase();
  if (label.includes("country")) return 10;
  if (label.includes("phone")) return 20;
  if (label.includes("salary") || label.includes("compensation")) return 30;
  if (label.includes("authorized") || label.includes("work authorization")) return 40;
  if (label.includes("sponsorship") || label.includes("visa")) return 50;
  if (item.required) return 60;
  if (item.inputKind === "longtext") return 80;
  return 70;
}

function isQuestionField(fieldId: string, questions: ApplicationQuestion[]): boolean {
  return questions.some((question) => question.fieldId === fieldId);
}

export function buildCopilotPlan(input: {
  matches: MatchedField[];
  profile: UserProfile;
  questions?: ApplicationQuestion[];
}): CopilotPlan {
  const questions = input.questions ?? [];
  const plan: CopilotPlan = { autofill: [], ask: [], skipped: [] };

  for (const item of input.matches) {
    const label = fieldDisplayLabel(item.field);
    const human = isHumanRequiredField(item.field);
    const narrative = isQuestionField(item.field.id, questions);
    const value = resolveFillValue(item.field, item.match, input.profile);
    const current = item.field.currentValue?.trim() ?? "";

    const alreadySame =
      current.length > 0 && value !== null && current.toLowerCase() === value.toLowerCase();
    if (alreadySame && !human && !narrative) {
      plan.skipped.push({ fieldId: item.field.id, label, reason: "Already filled on the page." });
      continue;
    }

    if (!human && !narrative && value && shouldAutoselect(item.match) && isPlausibleAuto(item)) {
      const needsConfirm =
        (item.field.elementType === "combobox" || item.field.elementType === "select") &&
        !(item.field.options?.length) &&
        item.match?.profilePath !== "skills";
      if (!needsConfirm) {
        plan.autofill.push({
          fieldId: item.field.id,
          label,
          value,
          reason: item.match?.reason ?? "Matched to your profile"
        });
        continue;
      }
    }

    if (human || narrative || item.field.required || value || looksImportant(label)) {
      const options = item.field.options;
      plan.ask.push({
        fieldId: item.field.id,
        label,
        question: narrative
          ? questions.find((question) => question.fieldId === item.field.id)?.question ?? label
          : `What should I enter for ${label}?`,
        why: human
          ? "This usually needs your judgment, so I will not guess."
          : !value
            ? "This is not in your profile (or the page value would be invalid)."
            : current
              ? `The page already has “${current}”. Confirm before I replace it.`
              : "I want you to confirm this before filling it.",
        reason: human ? "human_judgment" : narrative ? "narrative" : value ? "ambiguous_match" : "missing_profile",
        inputKind: inputKindFor(item.field),
        options,
        suggested: value || undefined,
        required: item.field.required
      });
      continue;
    }

    plan.skipped.push({
      fieldId: item.field.id,
      label,
      reason: "Optional field with no reliable profile match."
    });
  }

  plan.ask.sort((a, b) => askPriority(a) - askPriority(b));
  return plan;
}

function isPlausibleAuto(item: MatchedField): boolean {
  if (item.field.elementType === "textarea") return false;
  if (isHumanRequiredField(item.field)) return false;
  if (item.match?.source === "ai" && (item.match.confidence ?? 0) < 0.93) return false;
  return true;
}

function looksImportant(label: string): boolean {
  return /\b(skill|education|experience|linkedin|github|portfolio|company|title|degree|university|college|institute)\b/i.test(
    label
  );
}
