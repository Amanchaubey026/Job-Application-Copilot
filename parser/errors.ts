import { AppError } from "~types/errors";

export function unsupportedFileError(): AppError {
  return new AppError("UNSUPPORTED_FILE");
}

export function emptyResumeError(): AppError {
  return new AppError("EMPTY_RESUME");
}

export function parseFailedError(cause?: unknown): AppError {
  const suffix =
    cause instanceof Error && cause.message ? ` ${cause.message}` : "";
  return new AppError("PARSE_FAILED", `We couldn't parse this resume.${suffix}`);
}
