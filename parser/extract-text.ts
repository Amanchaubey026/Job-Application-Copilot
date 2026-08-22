import { emptyResumeError } from "./errors";
import { detectResumeFileKind } from "./file-type";
import { extractTextFromDocx } from "./docx";
import { extractTextFromPdf } from "./pdf";

export async function extractResumeText(file: File): Promise<string> {
  const kind = detectResumeFileKind(file);
  const buffer = await file.arrayBuffer();
  const text =
    kind === "pdf"
      ? await extractTextFromPdf(buffer)
      : await extractTextFromDocx(buffer);

  if (!text || text.replace(/\s+/g, "").length < 8) {
    throw emptyResumeError();
  }

  return text;
}
