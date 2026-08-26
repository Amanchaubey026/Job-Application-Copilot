export type FormElementType = "input" | "textarea" | "select" | "combobox" | "radio-group";

export interface FieldOption {
  value: string;
  label: string;
}

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
  options?: FieldOption[];
  role?: string;
}

export interface DetectedFormField extends SerializableFormField {
  element: HTMLElement;
}

export interface PageContext {
  title: string;
  url: string;
  looksLikeJobApplication: boolean;
  signals: string[];
  hostname?: string;
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
