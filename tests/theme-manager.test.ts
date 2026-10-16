import { describe, expect, it, vi } from "vitest";
import { createThemeManager } from "../src/index.js";

describe("ThemeManager", () => {
  it("applies registered token sets and exposes selected/resolved theme", () => {
    const manager = createThemeManager({
      defaultTheme: "light",
      themes: [
        {
          name: "ocean",
          tokens: { brand: "#06c", "--space": "1rem" },
          colorScheme: "dark",
        },
      ],
    });
    manager.setTheme("ocean");
    expect(document.documentElement.getAttribute("data-theme")).toBe("ocean");
    expect(document.documentElement.style.getPropertyValue("--brand")).toBe(
      "#06c",
    );
    expect(manager.getSelectedTheme()).toBe("ocean");
    expect(manager.getResolvedTheme()).toBe("ocean");
    manager.destroy();
  });
  it("persists selected themes and syncs subscriptions", () => {
    const callback = vi.fn();
    const manager = createThemeManager({
      defaultTheme: "light",
      storageKey: "test-theme",
    });
    const stop = manager.subscribe(callback);
    manager.setTheme("dark");
    expect(localStorage.getItem("test-theme")).toBe("dark");
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ selected: "dark", source: "api" }),
    );
    stop();
    manager.destroy();
  });
  it("supports custom attributes, updates, removal restrictions and toggle", () => {
    const manager = createThemeManager({
      attribute: "data-alt-theme",
      defaultTheme: "light",
      themes: [
        { name: "a", tokens: {} },
        { name: "b", tokens: {} },
      ],
    });
    manager.toggle(["a", "b"]);
    expect(manager.selectedTheme).toBe("a");
    manager.updateTheme("a", { color: "red" });
    expect(manager.getTheme("a")?.tokens.color).toBe("red");
    expect(() => manager.removeTheme("light")).toThrow("cannot be removed");
    expect(manager.removeTheme("b")).toBe(true);
    manager.destroy();
  });
  it("keeps scoped themes independent of the global theme", () => {
    document.body.innerHTML =
      '<section id="one"></section><section id="two"></section>';
    const manager = createThemeManager({
      defaultTheme: "light",
      themes: [
        { name: "amber", tokens: { brand: "gold" } },
        { name: "violet", tokens: { brand: "purple" } },
      ],
    });
    manager.createScope("#one").setTheme("amber");
    manager.createScope("#two").setTheme("violet");
    expect(document.querySelector("#one")?.getAttribute("data-theme")).toBe(
      "amber",
    );
    expect(document.querySelector("#two")?.getAttribute("data-theme")).toBe(
      "violet",
    );
    expect(manager.resolvedTheme).toBe("light");
    manager.destroy();
  });
  it("reacts to system preference and cross-tab storage changes", () => {
    let systemListener: (() => void) | undefined;
    const media = {
      matches: false,
      addEventListener: (_name: string, listener: () => void) => {
        systemListener = listener;
      },
      removeEventListener: vi.fn(),
    };
    window.matchMedia = vi
      .fn()
      .mockReturnValue(media) as unknown as typeof window.matchMedia;
    const manager = createThemeManager({
      defaultTheme: "system",
      storageKey: "sync-theme",
    });
    Object.defineProperty(media, "matches", { value: true });
    systemListener?.();
    expect(manager.resolvedTheme).toBe("dark");
    window.dispatchEvent(
      new StorageEvent("storage", { key: "sync-theme", newValue: "light" }),
    );
    expect(manager.selectedTheme).toBe("light");
    manager.destroy();
  });

  it("rejects an unregistered default theme", () => {
    expect(() => createThemeManager({ defaultTheme: "missing" })).toThrow(
      'Unknown default theme "missing"',
    );
  });
});
