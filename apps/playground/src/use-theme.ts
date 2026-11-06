import { useSyncExternalStore } from "react";
import { createThemeStore } from "./theme-store.js";
import { themeSettings } from "./theme-settings.js";

declare global {
  interface Window {
    __littleJayTheme?: ReturnType<typeof createThemeStore>;
  }
}

const store =
  typeof window === "undefined"
    ? undefined
    : (window.__littleJayTheme ??= createThemeStore(themeSettings, window));
const serverSnapshot = Object.freeze({ preference: "system", theme: "light" } as const);

export function useTheme() {
  const snapshot = useSyncExternalStore(
    store?.subscribe ?? (() => () => {}),
    store?.getSnapshot ?? (() => serverSnapshot),
    () => serverSnapshot,
  );
  return { ...snapshot, setPreference: store?.setPreference ?? (() => {}) };
}
