export type AppErrorCode =
  | "UNSUPPORTED_FILE"
  | "EMPTY_RESUME"
  | "PARSE_FAILED"
  | "NO_PROFILE"
  | "NO_FORM"
  | "MISSING_VALUE"
  | "NO_TAB"
  | "NO_CONTENT_SCRIPT"
  | "RESTRICTED_PAGE";

export const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  UNSUPPORTED_FILE: "Unsupported file type. Please upload PDF or DOCX.",
  EMPTY_RESUME:
    "We couldn't extract readable text from this file. Try another PDF/DOCX.",
  PARSE_FAILED: "We couldn't parse this resume. Try another PDF/DOCX.",
  NO_PROFILE: "No profile found. Upload your resume first.",
  NO_FORM: "No recognizable form fields found on this page.",
  MISSING_VALUE: "This field could not be matched to your profile.",
  NO_TAB: "No active tab found.",
  NO_CONTENT_SCRIPT:
    "This page hasn't loaded the extension yet. Refresh the page and try again.",
  RESTRICTED_PAGE:
    "This page can't be scanned. Open a job application on http(s) and try again."
};

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message?: string) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}
