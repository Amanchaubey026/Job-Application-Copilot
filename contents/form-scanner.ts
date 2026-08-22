import type { PlasmoCSConfig } from "plasmo";
import { pickAdapter } from "~adapters/sites";
import { computeCompleteness } from "~applications/completeness";
import { detectFormFields, toSerializable } from "~lib/form-detector";
import { fillFields } from "~lib/form-filler";
import { extractJobDescription } from "~lib/job-extractor";
import { getPageContext } from "~lib/page-context";
import { detectApplicationQuestions } from "~lib/question-detector";
import { debounce } from "~utils/debounce";
import {
  isExtensionMessage,
  type ExtensionMessage,
  type ExtensionResponse
} from "~types/messages";

export const config: PlasmoCSConfig = {
  matches: ["http://*/*", "https://*/*"],
  run_at: "document_idle",
  all_frames: false
};

let filling = false;
let observer: MutationObserver | null = null;

function snapshot() {
  const page = getPageContext(document);
  const adapter = pickAdapter(page);
  const fields = (adapter.detectFields?.(page, document) ?? detectFormFields(document).map(toSerializable));
  const questions = detectApplicationQuestions(fields);
  const job = adapter.detectJob(page, document) ?? extractJobDescription(document);
  const steps = adapter.detectApplicationSteps(page, document);
  return {
    fields,
    page,
    job,
    questions,
    steps,
    completeness: computeCompleteness(fields),
    adapterId: adapter.id
  };
}

const notifyFieldsChanged = debounce(() => {
  if (filling) return;
  const snap = snapshot();
  void chrome.runtime
    .sendMessage({
      type: "FORM_FIELDS_CHANGED",
      ...snap
    })
    .catch(() => undefined);
}, 400);

function ensureObserver(): void {
  if (observer || !document.body) return;
  observer = new MutationObserver((mutations) => {
    if (filling) return;
    const hasNewFields = mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some((node) => {
        if (!(node instanceof HTMLElement)) return false;
        return (
          node.matches("input, textarea, select, form, article, main") ||
          Boolean(node.querySelector("input, textarea, select, h1"))
        );
      })
    );
    if (hasNewFields) notifyFieldsChanged();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function handleMessage(message: ExtensionMessage): ExtensionResponse {
  switch (message.type) {
    case "PING":
      return { ok: true };
    case "GET_PAGE_CONTEXT":
      return { ok: true, page: getPageContext(document) };
    case "GET_JOB_CONTEXT": {
      ensureObserver();
      const snap = snapshot();
      return { ok: true, job: snap.job, questions: snap.questions };
    }
    case "SCAN_FORM": {
      ensureObserver();
      return { ok: true, ...snapshot() };
    }
    case "FILL_FIELDS": {
      filling = true;
      try {
        ensureObserver();
        const results = fillFields(message.fields, document);
        return { ok: true, results };
      } finally {
        filling = false;
      }
    }
    case "GET_PROFILE":
      return { ok: false, error: "Profile is not available in the page context." };
    default:
      return { ok: false, error: "Unknown message." };
  }
}

chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
  if (!isExtensionMessage(raw)) return;
  try {
    sendResponse(handleMessage(raw));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    sendResponse({ ok: false, error: message });
  }
  return true;
});
