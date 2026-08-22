export type FormElementType = "input" | "textarea" | "select";

export interface SerializableFormField {
  id: string;
  elementType: FormElementType;
  inputType?: string;
  name?: string;
  elementId?: string;
  placeholder?: string;
  ariaLabel?: string;
  label?: string;
  autocomplete?: string;
  required?: boolean;
  currentValue?: string;
  nearbyText?: string;
  helperText?: string;
  maxLength?: number;
  disabled?: boolean;
}

export interface DetectedFormField extends SerializableFormField {
  element: HTMLElement;
}

export interface PageContext {
  title: string;
  url: string;
  looksLikeJobApplication: boolean;
  signals: string[];
}

export interface FillFieldRequest {
  fieldId: string;
  value: string;
}

export interface FillFieldResult {
  fieldId: string;
  ok: boolean;
  reason?: string;
}
