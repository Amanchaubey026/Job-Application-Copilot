import { unsupportedFileError } from "./errors";

export type ResumeFileKind = "pdf" | "docx";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function detectResumeFileKind(file: File): ResumeFileKind {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }

  if (type === DOCX_MIME || name.endsWith(".docx")) {
    return "docx";
  }

  throw unsupportedFileError();
}
