import type { DetectedFormField, FormElementType, SerializableFormField } from "~types/form";

const SKIP_TYPES = new Set([
  "hidden",
  "submit",
  "button",
  "reset",
  "image",
  "file",
  "password",
  "checkbox",
  "radio",
  "color",
  "range",
  "week",
  "month",
  "time",
  "datetime-local",
  "date",
  "number",
  "search"
]);

const SKIP_NAME_RE =
  /(csrf|captcha|recaptcha|authenticity.?token|honeypot|password|otp|cvv)/i;

function isHtmlElement(node: EventTarget | null): node is HTMLElement {
  return Boolean(node && node instanceof HTMLElement);
}

function isFormControl(
  el: Element
): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  );
}

function elementTypeOf(el: HTMLElement): FormElementType | null {
  if (el instanceof HTMLTextAreaElement) return "textarea";
  if (el instanceof HTMLSelectElement) return "select";
  if (el instanceof HTMLInputElement) return "input";
  return null;
}

function shouldSkip(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): boolean {
  if (el instanceof HTMLInputElement && SKIP_TYPES.has((el.type || "text").toLowerCase())) {
    return true;
  }
  const identity = `${el.name} ${el.id}`;
  if (SKIP_NAME_RE.test(identity)) return true;
  if (el.getAttribute("role") === "presentation") return true;
  return false;
}

function labelFromFor(el: HTMLElement, root: ParentNode): string | undefined {
  if (!el.id) return undefined;
  const escaped =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(el.id)
      : el.id.replace(/"/g, '\\"');
  const label = root.querySelector(`label[for="${escaped}"]`);
  return collapse(label?.textContent);
}

function wrappingLabel(el: HTMLElement): string | undefined {
  const label = el.closest("label");
  if (!label) return undefined;
  const clone = label.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("input,textarea,select,button").forEach((node) => node.remove());
  return collapse(clone.textContent);
}

function labelledBy(el: HTMLElement): string | undefined {
  const ids = el.getAttribute("aria-labelledby");
  if (!ids) return undefined;
  const parts = ids
    .split(/\s+/)
    .map((id) => el.ownerDocument.getElementById(id)?.textContent)
    .map(collapse)
    .filter((value): value is string => Boolean(value));
  return parts.join(" ") || undefined;
}

function nearbyText(el: HTMLElement): string | undefined {
  const prev = el.previousElementSibling;
  if (prev && !isFormControl(prev)) {
    const text = collapse(prev.textContent);
    if (text) return text.slice(0, 80);
  }

  const parent = el.parentElement;
  if (!parent) return undefined;
  for (const child of Array.from(parent.childNodes)) {
    if (child === el) break;
    if (child.nodeType === Node.TEXT_NODE) {
      const text = collapse(child.textContent);
      if (text) return text.slice(0, 80);
    }
  }
  return undefined;
}

function collapse(value?: string | null): string | undefined {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  return trimmed || undefined;
}

function currentValueOf(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): string | undefined {
  const value = el.value?.trim();
  return value || undefined;
}

function hashSignals(parts: string[]): string {
  const raw = parts.join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export function toSerializable(field: DetectedFormField): SerializableFormField {
  const { element: _element, ...rest } = field;
  return rest;
}

export function detectFormFields(
  root: ParentNode = document
): DetectedFormField[] {
  const controls = Array.from(
    root.querySelectorAll("input, textarea, select")
  ).filter(isFormControl);

  const fields: DetectedFormField[] = [];
  let index = 0;

  for (const el of controls) {
    if (shouldSkip(el)) continue;
    const elementType = elementTypeOf(el);
    if (!elementType) continue;

    const label =
      labelFromFor(el, root) ??
      wrappingLabel(el) ??
      labelledBy(el) ??
      collapse(el.getAttribute("aria-label"));

    const field: DetectedFormField = {
      id: "",
      elementType,
      inputType: el instanceof HTMLInputElement ? el.type : undefined,
      name: el.name || undefined,
      elementId: el.id || undefined,
      placeholder: "placeholder" in el ? el.placeholder || undefined : undefined,
      ariaLabel: collapse(el.getAttribute("aria-label")),
      label,
      autocomplete: el.getAttribute("autocomplete") || undefined,
      required: el.required || el.getAttribute("aria-required") === "true",
      currentValue: currentValueOf(el),
      nearbyText: nearbyText(el),
      disabled: el.disabled,
      element: el
    };

    field.id = `jac-${index}-${hashSignals([
      field.elementType,
      field.inputType ?? "",
      field.name ?? "",
      field.elementId ?? "",
      field.label ?? "",
      field.placeholder ?? ""
    ])}`;
    el.dataset.jacFieldId = field.id;
    fields.push(field);
    index += 1;
  }

  return fields;
}

export function findFieldElement(
  fieldId: string,
  root: ParentNode = document
): HTMLElement | null {
  const marked = root.querySelector(`[data-jac-field-id="${cssEscape(fieldId)}"]`);
  return isHtmlElement(marked) ? marked : null;
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/"/g, '\\"');
}
