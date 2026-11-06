import { Button, Field, NativeSelect } from "@ljay/ui";
import { useTheme } from "../use-theme.js";
import type { PreviewWidth } from "./PreviewFrame.js";

export function Toolbar({
  width,
  onWidthChange,
  onReset,
}: {
  width: PreviewWidth;
  onWidthChange: (width: PreviewWidth) => void;
  onReset: () => void;
}) {
  const { theme, preference, setPreference } = useTheme();
  return (
    <div className="catalog-toolbar" role="group" aria-label="Preview settings">
      <Button onClick={() => setPreference(theme === "dark" ? "light" : "dark")}>
        {theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      </Button>
      <Button aria-pressed={preference === "system"} onClick={() => setPreference("system")}>
        Use system theme
      </Button>
      <Field label="Preview width">
        <NativeSelect
          value={width}
          onChange={(event) => onWidthChange(event.target.value as PreviewWidth)}
        >
          <option value="fluid">Available width</option>
          <option value="640">640 px</option>
          <option value="320">320 px</option>
        </NativeSelect>
      </Field>
      <Button onClick={onReset}>Reset preview</Button>
      <p className="catalog-toolbar-note">
        Width constrains content; media queries follow the browser viewport.
      </p>
    </div>
  );
}
