import type {
  FillFieldRequest,
  FillFieldResult,
  PageContext,
  SerializableFormField
} from "./form";
import type { UserProfile } from "./profile";

export type ExtensionMessage =
  | { type: "GET_PROFILE" }
  | { type: "SCAN_FORM" }
  | { type: "FILL_FIELDS"; fields: FillFieldRequest[] }
  | { type: "GET_PAGE_CONTEXT" }
  | { type: "PING" };

export type GetProfileResponse =
  | { ok: true; profile: UserProfile | null }
  | { ok: false; error: string };

export type ScanFormResponse =
  | { ok: true; fields: SerializableFormField[]; page: PageContext }
  | { ok: false; error: string };

export type FillFieldsResponse =
  | { ok: true; results: FillFieldResult[] }
  | { ok: false; error: string };

export type GetPageContextResponse =
  | { ok: true; page: PageContext }
  | { ok: false; error: string };

export type PingResponse = { ok: true };

export type ExtensionResponse =
  | GetProfileResponse
  | ScanFormResponse
  | FillFieldsResponse
  | GetPageContextResponse
  | PingResponse;

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return (
    type === "GET_PROFILE" ||
    type === "SCAN_FORM" ||
    type === "FILL_FIELDS" ||
    type === "GET_PAGE_CONTEXT" ||
    type === "PING"
  );
}
