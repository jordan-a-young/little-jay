import { describe, expect, it } from "vite-plus/test";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "./index.js";

describe("Button native contract", () => {
  it("defaults to primary and consumes variant without forwarding it to the DOM", () => {
    const markup = renderToStaticMarkup(<Button>Continue</Button>);
    expect(markup).toContain("bg-primary");
    expect(markup).toContain("text-on-primary");
    expect(markup).not.toContain('variant="');
  });

  it.each([
    ["primary", "bg-primary text-on-primary"],
    ["secondary", "bg-surface text-content inset-ring inset-ring-border"],
    ["outline", "bg-transparent text-primary inset-ring inset-ring-primary"],
    ["ghost", "bg-transparent text-primary"],
    ["danger", "bg-danger text-background"],
  ] as const)("uses semantic theme classes for %s", (variant, classes) => {
    const markup = renderToStaticMarkup(
      <Button variant={variant} className="project-button">
        Continue
      </Button>,
    );
    for (const token of classes.split(" ")) expect(markup).toContain(token);
    expect(markup).toContain("project-button");
    expect(markup).not.toContain('variant="');
    expect(markup).toContain("focus-visible:outline-primary");
  });

  it.each(["secondary", "outline", "ghost", "danger"] as const)(
    "%s removes the native border without requiring an application reset",
    (variant) => {
      expect(renderToStaticMarkup(<Button variant={variant}>Continue</Button>)).toContain(
        "border-0",
      );
    },
  );

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
