import { profileRepository } from "~storage/profile-repository";
import { isExtensionMessage, type ExtensionResponse } from "~types/messages";

chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
  if (!isExtensionMessage(raw)) {
    return;
  }

  if (raw.type === "GET_PROFILE") {
    profileRepository
      .getProfile()
      .then((profile) => {
        const response: ExtensionResponse = { ok: true, profile };
        sendResponse(response);
      })
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to load profile."
        });
      });
    return true;
  }

  if (raw.type === "PING" && sender.tab) {
    sendResponse({ ok: true });
    return true;
  }

  return undefined;
});
