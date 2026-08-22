import type { FillFieldRequest, FillFieldResult } from "~types/form";
import { findFieldElement } from "./form-detector";

function getNativeValueSetter(
  element: HTMLInputElement | HTMLTextAreaElement
): ((value: string) => void) | undefined {
  const proto =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
  return descriptor?.set
    ? (value: string) => descriptor.set?.call(element, value)
    : undefined;
}

function resetReactTracker(element: HTMLElement): void {
  const tracker = (element as unknown as { _valueTracker?: { setValue: (value: string) => void } })
    ._valueTracker;
  tracker?.setValue("");
}

function dispatchInputEvents(element: HTMLElement, value: string): void {
  element.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      composed: true,
      data: value,
      inputType: "insertFromPaste"
    })
  );
  element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
}

function fillTextControl(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
): boolean {
  element.focus();
  resetReactTracker(element);
  const nativeSet = getNativeValueSetter(element);
  if (nativeSet) {
    nativeSet(value);
  } else {
    element.value = value;
  }
  dispatchInputEvents(element, value);
  element.blur();
  return element.value === value;
}

function fillSelect(element: HTMLSelectElement, value: string): boolean {
  const needle = value.trim().toLowerCase();
  const options = Array.from(element.options);
  const match =
    options.find((option) => option.value.toLowerCase() === needle) ??
    options.find((option) => option.text.trim().toLowerCase() === needle) ??
    options.find(
      (option) =>
        option.text.trim().toLowerCase().includes(needle) ||
        needle.includes(option.text.trim().toLowerCase())
    );

  if (!match) return false;

  element.focus();
  element.value = match.value;
  match.selected = true;
  element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  element.blur();
  return true;
}

export function fillElement(element: HTMLElement, value: string): boolean {
  if (element instanceof HTMLSelectElement) {
    return fillSelect(element, value);
  }
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    if (element.disabled || element.readOnly) return false;
    return fillTextControl(element, value);
  }
  return false;
}

export function fillFields(
  requests: FillFieldRequest[],
  root: ParentNode = document
): FillFieldResult[] {
  const results: FillFieldResult[] = [];

  for (const request of requests) {
    if (!request.value.trim()) {
      results.push({
        fieldId: request.fieldId,
        ok: false,
        reason: "This field could not be matched to your profile."
      });
      continue;
    }

    const element = findFieldElement(request.fieldId, root);
    if (!element) {
      results.push({
        fieldId: request.fieldId,
        ok: false,
        reason: "The field is no longer on the page. Refresh detection and try again."
      });
      continue;
    }

    const ok = fillElement(element, request.value);
    results.push({
      fieldId: request.fieldId,
      ok,
      reason: ok ? undefined : "The field could not be filled."
    });
  }

  return results;
}
