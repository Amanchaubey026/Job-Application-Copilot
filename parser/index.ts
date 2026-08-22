import type { ExtractionSummary, UserProfile } from "~types/profile";
import { extractResumeText } from "./extract-text";
import { extractProfileFromText } from "./profile-extractor";

export async function parseResumeFile(
  file: File
): Promise<{ profile: UserProfile; summary: ExtractionSummary }> {
  const text = await extractResumeText(file);
  return extractProfileFromText(text, file.name);
}

export { extractResumeText } from "./extract-text";
export { extractProfileFromText } from "./profile-extractor";
export { detectResumeFileKind } from "./file-type";
