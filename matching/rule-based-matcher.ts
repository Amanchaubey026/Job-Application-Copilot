import type { FieldMatch, FieldMatcher, MatchedField } from "~types/matching";
import type { SerializableFormField } from "~types/form";
import type { UserProfile } from "~types/profile";
import { containsPhrase, expandTerm, normalizeAutocomplete, normalizeText } from "~utils/normalize";
import { getProfileValue } from "~utils/profile-path";
import { inferCountryName } from "~lib/country";
import { normalizeGitHubUrl, normalizeLinkedInUrl } from "~lib/links";
import { CONFIDENCE, MATCH_RULES, type MatchRule } from "./rules";

interface FieldSignals {
  autocomplete: string[];
  name: string;
  elementId: string;
  label: string;
  ariaLabel: string;
  placeholder: string;
  nearby: string;
  inputType: string;
  combined: string;
}

function signalsOf(field: SerializableFormField): FieldSignals {
  const autocomplete = normalizeAutocomplete(field.autocomplete);
  const name = normalizeText(field.name);
  const elementId = normalizeText(field.elementId);
  const label = normalizeText(field.label);
  const ariaLabel = normalizeText(field.ariaLabel);
  const placeholder = normalizeText(field.placeholder);
  const nearby = normalizeText(field.nearbyText);
  const inputType = (field.inputType ?? "").toLowerCase();
  return {
    autocomplete,
    name,
    elementId,
    label,
    ariaLabel,
    placeholder,
    nearby,
    inputType,
    combined: [name, elementId, label, ariaLabel, placeholder, nearby].filter(Boolean).join(" ")
  };
}

function isExcluded(rule: MatchRule, haystack: string): boolean {
  return (rule.exclude ?? []).some((phrase) => containsPhrase(haystack, phrase));
}

function exactHit(value: string, terms: string[]): boolean {
  if (!value) return false;
  const variants = terms.flatMap(expandTerm);
  return variants.includes(value) || variants.includes(value.replace(/\s+/g, ""));
}

function synonymHit(value: string, terms: string[]): boolean {
  if (!value) return false;
  return terms.some((term) => containsPhrase(value, term));
}

function scoreRule(rule: MatchRule, signals: FieldSignals): { confidence: number; reason: string } | null {
  if (isExcluded(rule, signals.combined)) {
    return null;
  }

  const autoMatch = rule.autocomplete.some((token) => signals.autocomplete.includes(token));
  if (autoMatch) {
    return { confidence: CONFIDENCE.autocomplete, reason: "Exact autocomplete match" };
  }

  if (rule.inputTypes?.includes(signals.inputType)) {
    const typeNeedsContext =
      signals.inputType === "url" &&
      (rule.profilePath === "links.linkedin" ||
        rule.profilePath === "links.github" ||
        rule.profilePath === "links.portfolio");
    if (!typeNeedsContext) {
      return { confidence: CONFIDENCE.inputType, reason: "Exact input type match" };
    }
  }

  if (exactHit(signals.name, rule.exact) || exactHit(signals.elementId, rule.exact)) {
    return { confidence: CONFIDENCE.exactName, reason: "Exact field name match" };
  }

  if (exactHit(signals.label, rule.exact) || exactHit(signals.ariaLabel, rule.exact)) {
    return { confidence: CONFIDENCE.exactLabel, reason: "Exact label match" };
  }

  if (synonymHit(signals.name, rule.synonyms) || synonymHit(signals.label, rule.synonyms) || synonymHit(signals.ariaLabel, rule.synonyms) || synonymHit(signals.elementId, rule.synonyms)) {
    return { confidence: CONFIDENCE.synonym, reason: "Known synonym" };
  }

  if (exactHit(signals.placeholder, rule.exact) || synonymHit(signals.placeholder, rule.synonyms)) {
    return { confidence: CONFIDENCE.placeholder, reason: "Placeholder match" };
  }

  if (synonymHit(signals.nearby, rule.synonyms) || synonymHit(signals.combined, rule.synonyms)) {
    return { confidence: CONFIDENCE.contextual, reason: "Contextual match" };
  }

  return null;
}

function matchFieldSync(
  field: SerializableFormField,
  profile: UserProfile
): FieldMatch | null {
  const signals = signalsOf(field);
  let best: FieldMatch | null = null;

  for (const rule of MATCH_RULES) {
    const scored = scoreRule(rule, signals);
    if (!scored) continue;
    if (best && scored.confidence < best.confidence) continue;
    if (best && scored.confidence === best.confidence && rule.profilePath.length <= best.profilePath.length) {
      continue;
    }
    let value = getProfileValue(profile, rule.profilePath) ?? "";
    if (rule.profilePath === "links.linkedin") {
      value = normalizeLinkedInUrl(value) ?? "";
    } else if (rule.profilePath === "links.github") {
      value = normalizeGitHubUrl(value) ?? "";
    } else if (rule.profilePath === "personal.address.country") {
      value =
        inferCountryName({
          country: profile.personal.address?.country,
          location: profile.personal.location,
          city: profile.personal.address?.city,
          state: profile.personal.address?.state,
          phone: profile.personal.phone
        }) ?? value;
    }
    best = {
      profilePath: rule.profilePath,
      value,
      confidence: scored.confidence,
      reason: scored.reason,
      source: "deterministic"
    };
  }

  return best;
}

function demoteGenericNameMatches(results: MatchedField[]): MatchedField[] {
  const hasFirst = results.some(
    (item) =>
      item.match?.profilePath === "personal.firstName" && item.match.confidence >= 0.9
  );
  const hasLast = results.some(
    (item) =>
      item.match?.profilePath === "personal.lastName" && item.match.confidence >= 0.9
  );
  if (!hasFirst || !hasLast) return results;

  return results.map((item) => {
    if (!item.match || item.match.profilePath !== "personal.fullName") return item;
    const label = normalizeText(
      item.field.label ?? item.field.name ?? item.field.elementId ?? ""
    );
    if (label === "name" || label === "your name") {
      return {
        ...item,
        match: {
          ...item.match,
          confidence: Math.min(item.match.confidence, 0.55),
          reason: "Generic name field demoted because first and last name fields exist"
        }
      };
    }
    return item;
  });
}

export class RuleBasedFieldMatcher implements FieldMatcher {
  async match(
    field: SerializableFormField,
    profile: UserProfile
  ): Promise<FieldMatch | null> {
    return matchFieldSync(field, profile);
  }

  matchSync(field: SerializableFormField, profile: UserProfile): FieldMatch | null {
    return matchFieldSync(field, profile);
  }

  matchAll(fields: SerializableFormField[], profile: UserProfile): MatchedField[] {
    const results = fields.map((field) => ({
      field,
      match: matchFieldSync(field, profile)
    }));
    return demoteGenericNameMatches(results);
  }
}

export function shouldAutoselect(match: FieldMatch | null): boolean {
  return Boolean(match && match.confidence >= 0.9 && match.value.trim());
}
