import type { GeneratedAnswer, JobAnalysis } from "~types/ai";
import type { UserProfile } from "~types/profile";
import { normalizeText } from "~utils/normalize";

const HALLUCINATION_MARKERS = [
  "aws",
  "amazon web services",
  "docker",
  "kubernetes",
  "terraform",
  "10 years",
  "15 years",
  "ten years",
  "decade of"
];

function profileBlob(profile: UserProfile): string {
  return normalizeText(
    [
      profile.personal.fullName,
      profile.skills.join(" "),
      profile.experience
        .map((item) => [item.company, item.title, item.description].join(" "))
        .join(" "),
      profile.projects.map((item) => [item.name, item.description].join(" ")).join(" "),
      (profile.achievements ?? []).join(" "),
      profile.education.map((item) => [item.institution, item.degree, item.field].join(" ")).join(" ")
    ].join(" ")
  );
}

export function unsupportedClaims(text: string, profile: UserProfile): string[] {
  const blob = profileBlob(profile);
  const lower = normalizeText(text);
  return HALLUCINATION_MARKERS.filter((marker) => lower.includes(marker) && !blob.includes(marker));
}

export function groundGeneratedAnswer(
  answer: GeneratedAnswer,
  profile: UserProfile,
  maxLength?: number
): GeneratedAnswer {
  let text = answer.answer.trim();
  if (maxLength && text.length > maxLength) {
    text = text.slice(0, maxLength).replace(/\s+\S*$/, "").trim();
  }

  const extras = unsupportedClaims(text, profile);
  if (extras.length) {
    return {
      answer: "",
      confidence: 0,
      sources: [],
      needsUserInput: true,
      missingInformation: [
        ...(answer.missingInformation ?? []),
        `The draft mentioned ${extras.join(", ")}, which is not in your profile.`
      ]
    };
  }

  if (!text) {
    return {
      ...answer,
      answer: "",
      needsUserInput: true,
      missingInformation: answer.missingInformation?.length
        ? answer.missingInformation
        : ["Not enough profile information to answer this question."]
    };
  }

  return { ...answer, answer: text };
}

export function groundJobAnalysis(analysis: JobAnalysis, profile: UserProfile): JobAnalysis {
  const skills = profile.skills.map((skill) => skill.toLowerCase());
  const experienceText = profile.experience
    .map((item) => normalizeText([item.company, item.title, item.description].join(" ")))
    .join(" ");
  const projectText = profile.projects
    .map((item) => normalizeText([item.name, item.description].join(" ")))
    .join(" ");

  const matchingSkills = analysis.matchingSkills.filter((skill) =>
    skills.some(
      (owned) =>
        owned === skill.toLowerCase() ||
        owned.includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(owned)
    )
  );

  const matchingExperience = analysis.matchingExperience.filter((item) => {
    const n = normalizeText(item);
    return n.split(" ").some((word) => word.length > 3 && experienceText.includes(word));
  });

  const relevantProjects = analysis.relevantProjects.filter((item) => {
    const n = normalizeText(item);
    return n.split(" ").some((word) => word.length > 3 && projectText.includes(word));
  });

  const missingSkills = analysis.missingSkills.filter(
    (skill) => !skills.includes(skill.toLowerCase())
  );

  return {
    ...analysis,
    matchScore: Math.min(1, Math.max(0, analysis.matchScore)),
    matchingSkills,
    matchingExperience,
    relevantProjects,
    missingSkills
  };
}
