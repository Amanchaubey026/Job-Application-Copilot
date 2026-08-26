/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { detectFormFields } from "./form-detector";
import { fillElement, fillFields } from "./form-filler";

describe("form filler", () => {
  it("sets input values with input and change events", async () => {
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

    await fillElement(input, "aman@example.com");
    expect(input.value).toBe("aman@example.com");
    expect(seen).toBe("aman@example.com");
    expect(inputCount).toBeGreaterThan(0);
    expect(changeCount).toBeGreaterThan(0);
  });

  it("fills detected fields by generated id", async () => {
    document.body.innerHTML = `
      <label for="fn">First Name</label>
      <input id="fn" name="first_name">
    `;
    const [detected] = detectFormFields(document);
    expect(detected).toBeTruthy();
    const results = await fillFields([{ fieldId: detected!.id, value: "Aman" }], document);
    expect(results[0]?.ok).toBe(true);
    expect((document.getElementById("fn") as HTMLInputElement).value).toBe("Aman");
  });

  it("does not fill empty values", async () => {
    document.body.innerHTML = `<input id="x" data-jac-field-id="jac-empty">`;
    const results = await fillFields([{ fieldId: "jac-empty", value: "   " }], document);
    expect(results[0]?.ok).toBe(false);
  });

  it("fills a country select by label even when the option value is a code", async () => {
    document.body.innerHTML = `
      <label for="country">Country</label>
      <select id="country">
        <option value="">Select...</option>
        <option value="IN">India</option>
        <option value="US">United States</option>
      </select>
    `;
    const select = document.getElementById("country") as HTMLSelectElement;
    expect(await fillElement(select, "India")).toBe(true);
    expect(select.value).toBe("IN");
  });

  it("does not pick a country because a skill string contains 'in'", async () => {
    document.body.innerHTML = `
      <select id="country">
        <option value="">Select...</option>
        <option value="IN">India</option>
        <option value="US">United States</option>
      </select>
    `;
    const select = document.getElementById("country") as HTMLSelectElement;
    expect(await fillElement(select, "React, Next.js, TypeScript, Node.js")).toBe(false);
    expect(select.value).toBe("");
  });
});
