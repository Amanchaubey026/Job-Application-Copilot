import { emptyResumeError } from "./errors";
import { detectResumeFileKind } from "./file-type";

export async function extractResumeText(file: File): Promise<string> {
  const kind = detectResumeFileKind(file);
  const buffer = await file.arrayBuffer();
  const text =
    kind === "pdf"
      ? await (await import("./pdf")).extractTextFromPdf(buffer)
      : await (await import("./docx")).extractTextFromDocx(buffer);

  if (!text || text.replace(/\s+/g, "").length < 8) {
    throw emptyResumeError();
  }

  return text;
}
