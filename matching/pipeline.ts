import { IDENTITY_PROFILE_PATHS } from "~ai/allowlist";
import { classifyAmbiguousField } from "~ai/services";
import { logAiError } from "~ai/logger";
import type { AIProvider, AiSettings } from "~types/ai";
import type { ApplicationQuestion } from "~types/job";
import type { SerializableFormField } from "~types/form";
import type { FieldMatch, MatchedField } from "~types/matching";
import { HIGH_CONFIDENCE_THRESHOLD } from "~types/matching";
import type { UserProfile } from "~types/profile";
import { RuleBasedFieldMatcher } from "./rule-based-matcher";

const MAX_AI_FIELDS = 6;

function withSource(match: FieldMatch | null): FieldMatch | null {
  if (!match) return null;
  return { ...match, source: match.source ?? "deterministic" };
}

function shouldSkipAi(
  item: MatchedField,
  questionIds: Set<string>
): boolean {
  if (questionIds.has(item.field.id)) return true;
  if (
    item.field.elementType === "select" ||
    item.field.elementType === "combobox" ||
    item.field.elementType === "radio-group"
  ) {
    return true;
  }
  if ((item.field.options?.length ?? 0) > 0) return true;
  const type = (item.field.inputType ?? "").toLowerCase();
  if (type === "email" || type === "tel") return true;
  if (item.match && IDENTITY_PROFILE_PATHS.has(item.match.profilePath)) return true;
  if (item.match && item.match.confidence >= HIGH_CONFIDENCE_THRESHOLD) return true;
  const blob = [
    item.field.label,
    item.field.name,
    item.field.ariaLabel,
    item.field.placeholder,
    item.field.nearbyText
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (
    /\b(country|salary|compensation|sponsorship|visa|authorized|gender|race|ethnicity|veteran|disability)\b/.test(
      blob
    )
  ) {
    return true;
  }
  return false;
}

export async function matchFieldsPhase2(input: {
  fields: SerializableFormField[];
  profile: UserProfile;
  questions?: ApplicationQuestion[];
  provider?: AIProvider;
  settings?: AiSettings;
  aiEnabled?: boolean;
}): Promise<MatchedField[]> {
  const rule = new RuleBasedFieldMatcher();
  const base = rule.matchAll(input.fields, input.profile).map((item) => ({
    field: item.field,
    match: withSource(item.match)
  }));

  if (!input.aiEnabled || !input.provider || !input.settings?.model) {
    return base;
  }

  try {
    const available = await input.provider.isAvailable();
    if (!available) return base;
  } catch {
    return base;
  }

  const questionIds = new Set((input.questions ?? []).map((question) => question.fieldId));
  let used = 0;

  for (let index = 0; index < base.length; index += 1) {
    if (used >= MAX_AI_FIELDS) break;
    const item = base[index];
    if (!item || shouldSkipAi(item, questionIds)) continue;
    used += 1;
    try {
      const aiMatch = await classifyAmbiguousField({
        provider: input.provider,
        settings: input.settings,
        field: item.field,
        profile: input.profile
      });
      if (!aiMatch) continue;
      if (item.match && item.match.confidence >= aiMatch.confidence) continue;
      base[index] = { field: item.field, match: aiMatch };
    } catch (error) {
      logAiError("pipeline", error);
    }
  }

  return base;
}
