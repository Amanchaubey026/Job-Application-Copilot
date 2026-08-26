import { tryCreateOllamaProvider } from "~ai/ollama-provider";
import { resolveOllamaConnection } from "~ai/ollama-status";
import { generateCopilotTurn } from "~ai/services";
import { buildCopilotPlan } from "~copilot/plan";
import { matchFieldsPhase2 } from "~matching/pipeline";
import { fieldDisplayLabel, inputKindFor } from "~matching/human-required";
import { profileRepository } from "~storage/profile-repository";
import { settingsRepository } from "~storage/settings-repository";
import { toUserMessage } from "~types/errors";
import {
  isExtensionMessage,
  type CopilotPlanResponse,
  type CopilotQuestionResponse,
  type ExtensionResponse
} from "~types/messages";
import type { CopilotTurn } from "~types/copilot";
import type { SerializableFormField } from "~types/form";

function fallbackTurn(field: SerializableFormField, suggested?: string): CopilotTurn {
  const options = field.options ?? [];
  return {
    question: `What should I enter for ${fieldDisplayLabel(field)}?`,
    why: "I need your input before filling this.",
    suggestion: suggested ?? "",
    suggestionConfidence: suggested ? 0.4 : 0,
    inputKind: inputKindFor(field),
    choices: options.slice(0, 12).map((option) => option.label)
  };
}

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

  if (raw.type === "COPILOT_PLAN") {
    void (async () => {
      try {
        const [profile, settings] = await Promise.all([
          profileRepository.getProfile(),
          settingsRepository.getSettings()
        ]);
        if (!profile) {
          const response: CopilotPlanResponse = { ok: false, error: "No profile found. Upload your resume first." };
          sendResponse(response);
          return;
        }
        const ollama = await resolveOllamaConnection(settings);
        const provider = ollama.ready
          ? tryCreateOllamaProvider(ollama.url, settings.timeoutMs)
          : undefined;
        const matches = await matchFieldsPhase2({
          fields: raw.fields,
          profile,
          questions: raw.questions,
          provider,
          settings: { ...settings, model: ollama.model || settings.model, ollamaUrl: ollama.url },
          aiEnabled: ollama.ready
        });
        const plan = buildCopilotPlan({
          matches,
          profile,
          questions: raw.questions
        });
        const response: CopilotPlanResponse = {
          ok: true,
          plan,
          ollamaReady: ollama.ready,
          model: ollama.model,
          ollamaStatus: ollama.status,
          profileName: profile.personal.fullName || profile.personal.firstName || "Your profile"
        };
        sendResponse(response);
      } catch (error) {
        sendResponse({ ok: false, error: toUserMessage(error) });
      }
    })();
    return true;
  }

  if (raw.type === "COPILOT_QUESTION") {
    void (async () => {
      try {
        const [profile, settings] = await Promise.all([
          profileRepository.getProfile(),
          settingsRepository.getSettings()
        ]);
        if (!profile) {
          const response: CopilotQuestionResponse = { ok: false, error: "No profile found." };
          sendResponse(response);
          return;
        }
        const ollama = await resolveOllamaConnection(settings);
        const provider = ollama.ready
          ? tryCreateOllamaProvider(ollama.url, settings.timeoutMs)
          : undefined;
        if (!ollama.ready || !provider) {
          const response: CopilotQuestionResponse = {
            ok: true,
            ollamaReady: false,
            model: ollama.model,
            turn: fallbackTurn(raw.field, raw.suggested)
          };
          sendResponse(response);
          return;
        }
        const turn = await generateCopilotTurn({
          provider,
          settings: { ...settings, model: ollama.model, ollamaUrl: ollama.url },
          field: raw.field,
          job: raw.job,
          profile,
          suggested: raw.suggested
        });
        const response: CopilotQuestionResponse = {
          ok: true,
          ollamaReady: true,
          model: ollama.model,
          turn
        };
        sendResponse(response);
      } catch (error) {
        sendResponse({
          ok: true,
          ollamaReady: false,
          model: "",
          turn: fallbackTurn(raw.field, raw.suggested)
        });
      }
    })();
    return true;
  }

  if (raw.type === "PING" && sender.tab) {
    sendResponse({ ok: true });
    return true;
  }

  return undefined;
});
