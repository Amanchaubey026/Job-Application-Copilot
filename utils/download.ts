export function downloadBytes(filename: string, bytes: Uint8Array, mime: string): void {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, value: unknown): void {
  const bytes = new TextEncoder().encode(JSON.stringify(value, null, 2));
  downloadBytes(filename, bytes, "application/json");
}

export function downloadText(filename: string, text: string, mime: string): void {
  downloadBytes(filename, new TextEncoder().encode(text), mime);
}
