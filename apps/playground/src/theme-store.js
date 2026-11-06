/** @typedef {"light" | "dark" | "system"} ThemePreference */
/** @typedef {{ preference: ThemePreference, theme: "light" | "dark" }} ThemeSnapshot */

/**
 * Creates the app's theme store and applies its initial appearance before React renders.
 * This file deliberately has no imports so the same source can run as a classic head script.
 * @param {{ storageKey: string, colors: { light: string, dark: string } }} settings
 * @param {Window} browser
 */
export function createThemeStore(settings, browser) {
  const media = browser.matchMedia("(prefers-color-scheme: dark)");
  /** @type {Set<() => void>} */
  const listeners = new Set();
  let persistenceFailed = false;

  /** @param {unknown} value @returns {ThemePreference} */
  function parsePreference(value) {
    return value === "light" || value === "dark" ? value : "system";
  }

  /** @returns {ThemePreference} */
  function readPreference() {
    try {
      return parsePreference(browser.localStorage.getItem(settings.storageKey));
    } catch {
      return "system";
    }
  }

  let preference = readPreference();
  /** @returns {"light" | "dark"} */
  const resolveTheme = () =>
    preference === "system" ? (media.matches ? "dark" : "light") : preference;
  /** @type {Readonly<ThemeSnapshot>} */
  let snapshot = Object.freeze({ preference, theme: resolveTheme() });

  function apply() {
    const theme = resolveTheme();
    const root = browser.document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    browser.document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", settings.colors[theme]);
    if (snapshot.preference !== preference || snapshot.theme !== theme) {
      snapshot = Object.freeze({ preference, theme });
      listeners.forEach((listener) => listener());
    }
  }

  function onMediaChange() {
    if (preference === "system") apply();
  }

  /** @param {StorageEvent} event */
  function onStorage(event) {
    if (event.key !== settings.storageKey && event.key !== null) return;
    try {
      if (event.storageArea && event.storageArea !== browser.localStorage) return;
    } catch {
      return;
    }
    preference = event.key === null ? "system" : parsePreference(event.newValue);
    persistenceFailed = false;
    apply();
  }

  /** @param {() => void} listener */
  function subscribe(listener) {
    listeners.add(listener);
    if (listeners.size === 1) {
      media.addEventListener("change", onMediaChange);
      browser.addEventListener("storage", onStorage);
      if (!persistenceFailed) preference = readPreference();
      apply();
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        media.removeEventListener("change", onMediaChange);
        browser.removeEventListener("storage", onStorage);
      }
    };
  }

  /** @param {ThemePreference} nextPreference */
  function setPreference(nextPreference) {
    preference = parsePreference(nextPreference);
    try {
      if (preference === "system") browser.localStorage.removeItem(settings.storageKey);
      else browser.localStorage.setItem(settings.storageKey, preference);
      persistenceFailed = false;
    } catch {
      persistenceFailed = true;
    }
    apply();
  }

  apply();
  return Object.freeze({ subscribe, getSnapshot: () => snapshot, setPreference });
}
