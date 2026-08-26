import type { FieldOption, FillFieldRequest, FillFieldResult } from "~types/form";
import { matchOption, optionsFromSelect } from "./select-option";
import { findFieldElement } from "./form-detector";
import { skillTokens } from "./skill-field";

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function associatedSelect(element: HTMLElement): HTMLSelectElement | null {
  const root =
    element.closest(".field, [class*='Field'], form, fieldset") ??
    element.parentElement?.parentElement ??
    element.parentElement;
  const select = root?.querySelector("select");
  return select instanceof HTMLSelectElement ? select : null;
}

function fillSelect(element: HTMLSelectElement, value: string): boolean {
  const options = optionsFromSelect(element);
  const match = matchOption(value, options);
  if (!match) return false;

  const optionNode =
    Array.from(element.options).find((option) => option.value === match.value) ??
    Array.from(element.options).find((option) => option.text.trim() === match.label);
  if (!optionNode) return false;

  element.focus();
  element.value = optionNode.value;
  optionNode.selected = true;
  element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  element.blur();
  return true;
}

function fillRadioGroup(element: HTMLElement, value: string): boolean {
  const fieldId = element.dataset.jacFieldId;
  const radios = fieldId
    ? Array.from(element.ownerDocument.querySelectorAll(`[data-jac-field-id="${fieldId}"]`))
    : [];
  const inputs = (radios.length ? radios : [element]).filter(
    (node): node is HTMLInputElement => node instanceof HTMLInputElement && node.type === "radio"
  );
  if (inputs.length === 0) return false;
  const options: FieldOption[] = inputs.map((input) => ({
    value: input.value,
    label: input.closest("label")?.textContent?.trim() || input.value
  }));
  const match = matchOption(value, options);
  const target =
    inputs.find((input) => input.value === match?.value) ??
    inputs.find((input) => (input.closest("label")?.textContent ?? "").trim() === match?.label);
  if (!target) return false;
  target.click();
  target.checked = true;
  target.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  target.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  return target.checked;
}

function visibleOptions(root: ParentNode): HTMLElement[] {
  return Array.from(
    root.querySelectorAll('[role="option"], [class*="option"], [class*="menu"] [class*="option"]')
  ).filter((node): node is HTMLElement => node instanceof HTMLElement && Boolean(node.textContent?.trim()));
}

async function fillCombobox(element: HTMLElement, value: string): Promise<boolean> {
  const native = associatedSelect(element);
  if (native && fillSelect(native, value)) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      fillTextControl(element, value);
    }
    return true;
  }

  element.scrollIntoView({ block: "center", inline: "nearest" });
  element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  element.click();
  element.focus();

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    fillTextControl(element, value);
    element.focus();
    const nativeSet = getNativeValueSetter(element);
    nativeSet?.(value);
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        composed: true,
        data: value,
        inputType: "insertText"
      })
    );
  }

  await sleep(120);
  const doc = element.ownerDocument;
  const options = visibleOptions(doc);
  const mapped: FieldOption[] = options.map((node) => ({
    value: node.getAttribute("data-value") || node.textContent?.trim() || "",
    label: node.textContent?.trim() || ""
  }));
  const match = matchOption(value, mapped);
  if (match) {
    const node = options.find(
      (option) =>
        option.textContent?.trim() === match.label || option.getAttribute("data-value") === match.value
    );
    if (node) {
      node.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      node.click();
      return true;
    }
  }

  element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  element.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
  if (element instanceof HTMLInputElement) {
    return element.value.toLowerCase().includes(value.trim().toLowerCase().slice(0, 12));
  }
  return false;
}

function looksLikeSkillElement(element: HTMLElement): boolean {
  const blob = [
    element.getAttribute("placeholder"),
    element.getAttribute("aria-label"),
    element.closest("label")?.textContent,
    element.parentElement?.previousElementSibling?.textContent,
    element.parentElement?.parentElement?.textContent?.slice(0, 80)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /\b(skill set|skillset|skills|search and add skills)\b/.test(blob);
}

async function fillSkillTags(element: HTMLElement, value: string): Promise<boolean> {
  const tokens = skillTokens(value);
  if (tokens.length === 0) return false;
  let added = 0;
  for (const token of tokens) {
    const ok = await fillCombobox(element, token);
    if (ok || (element instanceof HTMLInputElement && element.value.toLowerCase().includes(token.toLowerCase()))) {
      added += 1;
    }
    await sleep(90);
  }
  return added > 0;
}

export async function fillElement(element: HTMLElement, value: string): Promise<boolean> {
  if (element instanceof HTMLInputElement && element.type === "radio") {
    return fillRadioGroup(element, value);
  }
  if (element instanceof HTMLSelectElement) {
    return fillSelect(element, value);
  }
  if (looksLikeSkillElement(element) && /[,;\n]/.test(value)) {
    return fillSkillTags(element, value);
  }
  const role = (element.getAttribute("role") ?? "").toLowerCase();
  const combobox =
    role === "combobox" ||
    element.getAttribute("aria-autocomplete") === "list" ||
    Boolean(element.closest(".select__control, [class*='react-select']"));
  if (combobox) {
    return fillCombobox(element, value);
  }
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    if (element.disabled || element.readOnly) return false;
    return fillTextControl(element, value);
  }
  return false;
}

export async function fillFields(
  requests: FillFieldRequest[],
  root: ParentNode = document
): Promise<FillFieldResult[]> {
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

    const ok = await fillElement(element, request.value);
    results.push({
      fieldId: request.fieldId,
      ok,
      reason: ok ? undefined : "The field could not be filled with that value."
    });
  }

  return results;
}
