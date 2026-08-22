import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import { parseFailedError } from "./errors";

let workerReady = false;

function ensureWorker(): void {
  if (workerReady) return;
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("pdf.worker.min.mjs");
  }
  workerReady = true;
}

function lineKeyFromItem(item: { transform?: number[] }): number {
  const y = item.transform?.[5];
  return typeof y === "number" ? Math.round(y) : 0;
}

function extractPageLines(
  items: Array<{ str?: string; transform?: number[] }>
): string {
  const lines = new Map<number, string[]>();
  const order: number[] = [];

  for (const item of items) {
    const text = item.str ?? "";
    if (!text) continue;
    const key = lineKeyFromItem(item);
    if (!lines.has(key)) {
      lines.set(key, []);
      order.push(key);
    }
    lines.get(key)?.push(text);
  }

  return order
    .map((key) => (lines.get(key) ?? []).join(" ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export async function extractTextFromPdf(data: ArrayBuffer): Promise<string> {
  ensureWorker();

  let pdf: PDFDocumentProxy | undefined;
  try {
    const task = getDocument({
      data: new Uint8Array(data),
      useSystemFonts: true,
      isEvalSupported: false,
      useWorkerFetch: false,
      disableAutoFetch: true,
      disableStream: true
    });
    pdf = await task.promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items.flatMap((item) => {
        if (typeof item === "object" && item !== null && "str" in item) {
          return [
            {
              str: String((item as { str: unknown }).str ?? ""),
              transform: Array.isArray((item as { transform?: unknown }).transform)
                ? ((item as { transform: number[] }).transform)
                : []
            }
          ];
        }
        return [];
      });
      pages.push(extractPageLines(items));
    }

    return pages.filter(Boolean).join("\n\n").trim();
  } catch (error) {
    throw parseFailedError(error);
  } finally {
    await pdf?.destroy().catch(() => undefined);
  }
}
