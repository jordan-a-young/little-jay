import pebble from "@ljay/brand/mascot/pebble.svg";
import logoLight from "@ljay/brand/logos/lockup-light.svg";
import logoDark from "@ljay/brand/logos/lockup-dark.svg";
import palette from "@ljay/tokens/palette.json";
import { Button, Field, Input } from "@ljay/ui";
import { useTheme } from "../../use-theme.js";
import { catalogHref } from "../registry.js";

export function IntroductionExample() {
  return (
    <div className="space-y-5">
      <div className="playground-intro">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-muted">
            Made to feel at home
          </p>
          <h2 className="intro-title">
            Small pieces.
            <br />
            Room to grow.
          </h2>
          <p>Reusable React components with a shared theme, backed by Fastify.</p>
        </div>
        <img src={pebble} alt="" width={240} height={240} className="intro-pebble" />
      </div>
      <p>
        Choose a component in the sidebar, select a named example, then read usage, props, and
        accessibility notes below.
      </p>
      <a href={catalogHref("button")}>Explore Button</a>
    </div>
  );
}
export function ThemeExample() {
  return (
    <div className="space-y-5">
      <p>
        Shared semantic tokens apply to every preview and future body portal. Use the toolbar to
        switch appearance.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button>Primary action</Button>
        <Button disabled>Disabled</Button>
      </div>
      <Field label="Themed field">
        <Input defaultValue="A draft survives theme changes" />
      </Field>
      <div className="catalog-swatches">
        {Object.entries(palette.brand).map(([name, color]) => (
          <div key={name}>
            <span className="catalog-swatch" style={{ backgroundColor: color }} />
            <strong>{name}</strong>
            <code>{color}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
export function BrandingExample() {
  const { theme } = useTheme();
  return (
    <div className="space-y-5">
      <img
        src={theme === "dark" ? logoDark : logoLight}
        alt="Little Jay"
        width={275}
        height={75}
        style={{ maxWidth: "100%", height: "auto" }}
      />
      <img
        src={pebble}
        alt=""
        width={160}
        height={160}
        style={{ objectFit: "contain", maxWidth: "100%", height: "auto" }}
      />
      <p>
        Pebble is decorative here; the logo has meaningful alt text. Artwork retains its supplied
        proportions.
      </p>
      <a href={catalogHref("pebble-state", "showcase")}>View app-state illustrations</a>
    </div>
  );
}
