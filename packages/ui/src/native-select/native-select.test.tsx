import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import { NativeSelect } from "./index.js";

describe("NativeSelect indicator", () => {
  it("reserves inline-end space for the inset single-select chevron", () => {
    const markup = renderToStaticMarkup(
      <NativeSelect aria-label="Mode" defaultValue="plan">
        <option value="plan">Plan</option>
      </NativeSelect>,
    );
    expect(markup).toContain("lj-select-indicator pe-11");
    expect(markup).toContain('aria-label="Mode"');
    expect(markup).toContain('<option value="plan" selected="">Plan</option>');
  });
  it("does not add a dropdown chevron to multiple selection or visible listboxes", () => {
    for (const props of [{ multiple: true }, { size: 4 }]) {
      const markup = renderToStaticMarkup(
        <NativeSelect {...props} aria-label="Modes">
          <option>Plan</option>
          <option>Review</option>
        </NativeSelect>,
      );
      expect(markup).not.toContain("lj-select-indicator");
      expect(markup).not.toContain("pe-11");
    }
  });
  it("retains the indicator for a one-row select and forwards native direction and disabled state", () => {
    const markup = renderToStaticMarkup(
      <NativeSelect size={1} dir="rtl" disabled aria-label="Mode">
        <option>Plan</option>
      </NativeSelect>,
    );
    expect(markup).toContain("lj-select-indicator");
    expect(markup).toContain('dir="rtl"');
    expect(markup).toContain('disabled=""');
  });
});
