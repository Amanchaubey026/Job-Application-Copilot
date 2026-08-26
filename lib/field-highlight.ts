import { findFieldElement } from "./form-detector";

const HOST_ID = "jac-field-highlight";

function host(): HTMLDivElement {
  const existing = document.getElementById(HOST_ID);
  if (existing instanceof HTMLDivElement) return existing;
  const node = document.createElement("div");
  node.id = HOST_ID;
  node.style.cssText =
    "position:fixed;pointer-events:none;z-index:2147483645;border:2px solid #0f766e;border-radius:10px;box-shadow:0 0 0 4px rgba(15,118,110,0.18);transition:all 120ms ease;display:none;";
  document.documentElement.appendChild(node);
  return node;
}

export function highlightField(fieldId: string | null): void {
  const box = host();
  if (!fieldId) {
    box.style.display = "none";
    return;
  }
  const element = findFieldElement(fieldId);
  if (!element) {
    box.style.display = "none";
    return;
  }
  const target =
    element.closest(".field, .select, label, [class*='Field']") instanceof HTMLElement
      ? (element.closest(".field, .select, label, [class*='Field']") as HTMLElement)
      : element;
  target.scrollIntoView({ block: "center", behavior: "smooth" });
  const rect = target.getBoundingClientRect();
  box.style.display = "block";
  box.style.top = `${Math.max(8, rect.top - 6)}px`;
  box.style.left = `${Math.max(8, rect.left - 6)}px`;
  box.style.width = `${rect.width + 12}px`;
  box.style.height = `${rect.height + 12}px`;
}

export function clearHighlight(): void {
  highlightField(null);
}
