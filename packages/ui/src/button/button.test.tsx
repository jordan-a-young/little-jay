import { describe, expect, it } from "vite-plus/test";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "./index.js";

describe("Button native contract", () => {
  it("uses a pointer for enabled buttons and preserves the disabled cursor", () => {
    for (const disabled of [false, true]) {
      const markup = renderToStaticMarkup(<Button disabled={disabled}>Continue</Button>);
      expect(markup).toContain("enabled:cursor-pointer");
      expect(markup).toContain("disabled:cursor-not-allowed");
    }
  });

  it("does not submit a form unless explicitly requested", () => {
    expect(renderToStaticMarkup(<Button>Continue</Button>)).toContain('type="button"');
    expect(renderToStaticMarkup(<Button type="submit">Save</Button>)).toContain('type="submit"');
  });

  it("preserves native attributes and consumer classes", () => {
    const markup = renderToStaticMarkup(
      <Button
        disabled
        name="action"
        value="save"
        aria-label="Save draft"
        className="project-button"
      >
        Save
      </Button>,
    );
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('name="action"');
    expect(markup).toContain('value="save"');
    expect(markup).toContain('aria-label="Save draft"');
    expect(markup).toContain("project-button");
  });
});
