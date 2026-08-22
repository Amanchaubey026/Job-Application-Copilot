/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { detectFormFields } from "./form-detector";
import { fillElement, fillFields } from "./form-filler";

describe("form filler", () => {
  it("sets input values with input and change events", () => {
    document.body.innerHTML = `<label>Email Address</label><input name="candidate_email">`;
    const input = document.querySelector("input") as HTMLInputElement;
    let inputCount = 0;
    let changeCount = 0;
    let seen = "";
    input.addEventListener("input", () => {
      inputCount += 1;
      seen = input.value;
    });
    input.addEventListener("change", () => {
      changeCount += 1;
    });

    fillElement(input, "aman@example.com");
    expect(input.value).toBe("aman@example.com");
    expect(seen).toBe("aman@example.com");
    expect(inputCount).toBeGreaterThan(0);
    expect(changeCount).toBeGreaterThan(0);
  });

  it("fills detected fields by generated id", () => {
    document.body.innerHTML = `
      <label for="fn">First Name</label>
      <input id="fn" name="first_name">
    `;
    const [detected] = detectFormFields(document);
    expect(detected).toBeTruthy();
    const results = fillFields([{ fieldId: detected!.id, value: "Aman" }], document);
    expect(results[0]?.ok).toBe(true);
    expect((document.getElementById("fn") as HTMLInputElement).value).toBe("Aman");
  });

  it("does not fill empty values", () => {
    document.body.innerHTML = `<input id="x" data-jac-field-id="jac-empty">`;
    const results = fillFields([{ fieldId: "jac-empty", value: "   " }], document);
    expect(results[0]?.ok).toBe(false);
  });
});
