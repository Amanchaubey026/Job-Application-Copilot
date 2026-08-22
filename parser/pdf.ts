import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import { parseFailedError } from "./errors";
import { reconstructPdfText, type PdfTextItem } from "./pdf-text";

let workerReady = false;

function ensureWorker(): void {
  if (workerReady) return;
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("pdf.worker.min.mjs");
  }
  workerReady = true;
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
      const items: PdfTextItem[] = content.items.flatMap((item) => {
        if (typeof item === "object" && item !== null && "str" in item) {
          const typed = item as {
            str?: unknown;
            transform?: unknown;
            width?: unknown;
            height?: unknown;
            hasEOL?: unknown;
          };
          return [
            {
              str: String(typed.str ?? ""),
              transform: Array.isArray(typed.transform) ? (typed.transform as number[]) : [],
              width: typeof typed.width === "number" ? typed.width : undefined,
              height: typeof typed.height === "number" ? typed.height : undefined,
              hasEOL: Boolean(typed.hasEOL)
            }
          ];
        }
        return [];
      });
      pages.push(reconstructPdfText(items));
    }

    return pages.filter(Boolean).join("\n\n").trim();
  } catch (error) {
    throw parseFailedError(error);
  } finally {
    await pdf?.destroy().catch(() => undefined);
  }
}
