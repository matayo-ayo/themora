// @vitest-environment node
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { createThemeManager } from "../src/index.js";
import { ThemeProvider } from "../src/react.js";
import { getThemeBootScript } from "../src/next.js";

describe("server rendering", () => {
  it("imports and constructs the core without browser globals", () => {
    const manager = createThemeManager({ defaultTheme: "dark" });
    expect(manager.resolvedTheme).toBe("dark");
    expect(manager.getRoot()).toBeUndefined();
    manager.destroy();
  });

  it("renders the React provider without touching the DOM", () => {
    expect(
      renderToString(createElement(ThemeProvider, null, "content")),
    ).toContain("content");
  });

  it("creates an inline boot script with safely encoded settings", () => {
    const script = getThemeBootScript({ storageKey: "custom-key" });
    expect(script).toContain('const k="custom-key"');
    expect(script).toContain("document.documentElement.setAttribute");
  });
});
