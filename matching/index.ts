import { CompositeFieldMatcher } from "./composite-matcher";
import { RuleBasedFieldMatcher } from "./rule-based-matcher";

export { CompositeFieldMatcher } from "./composite-matcher";
export { RuleBasedFieldMatcher, shouldAutoselect } from "./rule-based-matcher";
export { CONFIDENCE, MATCH_RULES } from "./rules";

export function createPhase1Matcher(): CompositeFieldMatcher {
  return new CompositeFieldMatcher(new RuleBasedFieldMatcher());
}
