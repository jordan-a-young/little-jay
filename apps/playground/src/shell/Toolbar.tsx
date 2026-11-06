import { useId } from "react";
import { Button, Field, NativeSelect } from "@littlejay/ui";
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
  const { preference, setPreference } = useTheme();
  const settingsId = useId();
  const titleId = useId();
  return (
    <div className="catalog-toolbar">
      <Button
        className="catalog-settings-trigger"
        popoverTarget={settingsId}
        aria-haspopup="dialog"
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 7h7m4 0h5M4 17h3m4 0h9" />
          <circle cx="13" cy="7" r="2" />
          <circle cx="9" cy="17" r="2" />
        </svg>
        Settings
      </Button>
      <div
        id={settingsId}
        popover="auto"
        role="dialog"
        aria-labelledby={titleId}
        className="catalog-settings-popover"
      >
        <div className="catalog-settings-heading">
          <h2 id={titleId}>Preview settings</h2>
          <Button
            className="catalog-settings-close"
            popoverTarget={settingsId}
            popoverTargetAction="hide"
          >
            Close
          </Button>
        </div>
        <Field label="Theme">
          <NativeSelect
            name="theme"
            value={preference}
            onChange={(event) => {
              const nextPreference = event.target.value;
              if (
                nextPreference === "system" ||
                nextPreference === "light" ||
                nextPreference === "dark"
              ) {
                setPreference(nextPreference);
              }
            }}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </NativeSelect>
        </Field>
        <Field label="Preview width">
          <NativeSelect
            name="preview-width"
            value={width}
            onChange={(event) => onWidthChange(event.target.value as PreviewWidth)}
          >
            <option value="fluid">Available width</option>
            <option value="640">640 px</option>
            <option value="320">320 px</option>
          </NativeSelect>
        </Field>
        <p className="catalog-toolbar-note">
          Width constrains content; media queries follow the browser viewport.
        </p>
        <Button className="catalog-settings-reset" onClick={onReset}>
          Reset preview
        </Button>
      </div>
    </div>
  );
}
