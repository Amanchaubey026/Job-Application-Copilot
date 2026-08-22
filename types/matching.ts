import type { SerializableFormField } from "./form";
import type { UserProfile } from "./profile";

export interface FieldMatch {
  profilePath: string;
  value: string;
  confidence: number;
  reason: string;
}

export interface FieldMatcher {
  match(
    field: SerializableFormField,
    profile: UserProfile
  ): Promise<FieldMatch | null>;
}

export type ConfidenceBand = "high" | "medium" | "low";

export const HIGH_CONFIDENCE_THRESHOLD = 0.9;
export const MEDIUM_CONFIDENCE_THRESHOLD = 0.7;

export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return "high";
  if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) return "medium";
  return "low";
}

export interface MatchedField {
  field: SerializableFormField;
  match: FieldMatch | null;
}

export interface MatchAllResult {
  matches: MatchedField[];
}
