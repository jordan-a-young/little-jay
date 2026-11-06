import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createThemeStore } from "./theme-store.js";
import { themeSettings } from "./theme-settings.js";

describe("document theme preference", () => {
  let media: EventTarget & { matches: boolean };

  beforeEach(() => {
    localStorage.clear();
    document.head.innerHTML = '<meta name="theme-color" content="">';
    delete document.documentElement.dataset.theme;
    media = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => media),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("applies the system preference to the document and meta without persisting a choice", () => {
    media.matches = true;
    const store = createThemeStore(themeSettings, window);
    const unsubscribe = store.subscribe(vi.fn());
    expect(store.getSnapshot()).toEqual({ preference: "system", theme: "dark" });
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      themeSettings.colors.dark,
    );
    expect(localStorage.getItem(themeSettings.storageKey)).toBeNull();
    media.matches = false;
    media.dispatchEvent(new Event("change"));
    expect(store.getSnapshot().theme).toBe("light");
    unsubscribe();
  });

  it("persists explicit preferences and ignores system changes until the preference is cleared", () => {
    const store = createThemeStore(themeSettings, window);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.setPreference("dark");
    expect(localStorage.getItem(themeSettings.storageKey)).toBe("dark");
    const darkSnapshot = store.getSnapshot();
    store.setPreference("dark");
    media.dispatchEvent(new Event("change"));
    expect(store.getSnapshot()).toBe(darkSnapshot);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(createThemeStore(themeSettings, window).getSnapshot().theme).toBe("dark");
    store.setPreference("system");
    expect(localStorage.getItem(themeSettings.storageKey)).toBeNull();
    expect(store.getSnapshot()).toEqual({ preference: "system", theme: "light" });
    unsubscribe();
  });

  it("keeps an explicit in-memory choice when persistence fails", () => {
    localStorage.setItem(themeSettings.storageKey, "light");
    const store = createThemeStore(themeSettings, window);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    store.setPreference("dark");
    const unsubscribe = store.subscribe(vi.fn());
    media.dispatchEvent(new Event("change"));
    expect(store.getSnapshot()).toEqual({ preference: "dark", theme: "dark" });
    unsubscribe();
    const again = store.subscribe(vi.fn());
    expect(store.getSnapshot().theme).toBe("dark");
    again();
  });

  it("falls back safely when storage is blocked or contains an invalid preference", () => {
    localStorage.setItem(themeSettings.storageKey, "unexpected");
    expect(createThemeStore(themeSettings, window).getSnapshot().preference).toBe("system");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage blocked");
    });
    media.matches = true;
    expect(createThemeStore(themeSettings, window).getSnapshot()).toEqual({
      preference: "system",
      theme: "dark",
    });
  });

  it("synchronizes another tab's preference and returns to system after storage is cleared", () => {
    const store = createThemeStore(themeSettings, window);
    const unsubscribe = store.subscribe(vi.fn());
    localStorage.setItem(themeSettings.storageKey, "dark");
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: themeSettings.storageKey,
        newValue: "dark",
        storageArea: localStorage,
      }),
    );
    expect(store.getSnapshot().theme).toBe("dark");
    localStorage.clear();
    window.dispatchEvent(new StorageEvent("storage", { key: null, storageArea: localStorage }));
    expect(store.getSnapshot()).toEqual({ preference: "system", theme: "light" });
    unsubscribe();
  });

  it("shares one listener pair and reconciles changes made before subscribing", () => {
    const add = vi.spyOn(media, "addEventListener");
    const remove = vi.spyOn(media, "removeEventListener");
    const store = createThemeStore(themeSettings, window);
    media.matches = true;
    const first = store.subscribe(vi.fn());
    const second = store.subscribe(vi.fn());
    expect(store.getSnapshot().theme).toBe("dark");
    expect(add).toHaveBeenCalledTimes(1);
    first();
    expect(remove).not.toHaveBeenCalled();
    second();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
