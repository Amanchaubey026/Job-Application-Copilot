import type { PlasmoCSConfig } from "plasmo";
import { detectFormFields, toSerializable } from "~lib/form-detector";
import { fillFields } from "~lib/form-filler";
import { getPageContext } from "~lib/page-context";
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

function scan() {
  const fields = detectFormFields(document).map(toSerializable);
  return {
    ok: true as const,
    fields,
    page: getPageContext(document)
  };
}

const notifyFieldsChanged = debounce(() => {
  if (filling) return;
  void chrome.runtime.sendMessage({
    type: "FORM_FIELDS_CHANGED",
    fields: detectFormFields(document).map(toSerializable),
    page: getPageContext(document)
  }).catch(() => undefined);
}, 400);

function ensureObserver(): void {
  if (observer || !document.body) return;
  observer = new MutationObserver((mutations) => {
    if (filling) return;
    const hasNewFields = mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some((node) => {
        if (!(node instanceof HTMLElement)) return false;
        return (
          node.matches("input, textarea, select, form") ||
          Boolean(node.querySelector("input, textarea, select"))
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
    case "SCAN_FORM": {
      ensureObserver();
      const result = scan();
      if (result.fields.length === 0) {
        return { ok: false, error: "No recognizable form fields found on this page." };
      }
      return result;
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
