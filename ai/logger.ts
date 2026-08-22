export function logAiError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : "unknown error";
  console.warn(`[jac:ai] ${context}: ${message}`);
}
