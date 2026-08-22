import type { FieldMatch, FieldMatcher } from "~types/matching";
import { HIGH_CONFIDENCE_THRESHOLD } from "~types/matching";
import type { SerializableFormField } from "~types/form";
import type { UserProfile } from "~types/profile";

/**
 * Phase 1 uses the rule-based matcher only.
 * Phase 2 can pass an Ollama matcher as `fallback`; it runs when the
 * deterministic match is missing or below the high-confidence threshold.
 */
export class CompositeFieldMatcher implements FieldMatcher {
  constructor(
    private readonly primary: FieldMatcher,
    private readonly fallback?: FieldMatcher,
    private readonly fallbackBelow = HIGH_CONFIDENCE_THRESHOLD
  ) {}

  async match(
    field: SerializableFormField,
    profile: UserProfile
  ): Promise<FieldMatch | null> {
    const primaryMatch = await this.primary.match(field, profile);
    if (primaryMatch && primaryMatch.confidence >= this.fallbackBelow) {
      return primaryMatch;
    }
    if (!this.fallback) {
      return primaryMatch;
    }
    const fallbackMatch = await this.fallback.match(field, profile);
    if (!fallbackMatch) return primaryMatch;
    if (!primaryMatch) return fallbackMatch;
    return fallbackMatch.confidence > primaryMatch.confidence
      ? fallbackMatch
      : primaryMatch;
  }
}
