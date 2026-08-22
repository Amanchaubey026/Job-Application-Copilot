import { AppError } from "~types/errors";
import type {
  ExtensionMessage,
  FillFieldsResponse,
  GetPageContextResponse,
  ScanFormResponse
} from "~types/messages";
import type { FillFieldRequest } from "~types/form";

const RESTRICTED_PREFIXES = ["chrome://", "chrome-extension://", "edge://", "about:"];

export async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) {
    throw new AppError("NO_TAB");
  }
  if (tab.url && RESTRICTED_PREFIXES.some((prefix) => tab.url?.startsWith(prefix))) {
    throw new AppError("RESTRICTED_PAGE");
  }
  return tab;
}

async function sendToTab<T>(tabId: number, message: ExtensionMessage): Promise<T> {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    throw new AppError("NO_CONTENT_SCRIPT");
  }
}

export async function pingTab(tabId: number): Promise<boolean> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "PING" });
    return Boolean(response && response.ok);
  } catch {
    return false;
  }
}

export async function scanActiveTab(): Promise<ScanFormResponse> {
  const tab = await getActiveTab();
  return sendToTab<ScanFormResponse>(tab.id as number, { type: "SCAN_FORM" });
}

export async function fillActiveTab(
  fields: FillFieldRequest[]
): Promise<FillFieldsResponse> {
  const tab = await getActiveTab();
  return sendToTab<FillFieldsResponse>(tab.id as number, {
    type: "FILL_FIELDS",
    fields
  });
}

export async function getActivePageContext(): Promise<GetPageContextResponse> {
  const tab = await getActiveTab();
  return sendToTab<GetPageContextResponse>(tab.id as number, {
    type: "GET_PAGE_CONTEXT"
  });
}
