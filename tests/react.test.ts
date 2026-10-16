import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { Themora, ThemeProvider } from "../src/react.js";
import { createThemeManager } from "../src/theme-manager.js";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("Themora React toggle", () => {
  const roots: Array<ReturnType<typeof createRoot>> = [];

  afterEach(async () => {
    await act(async () => {
      roots.splice(0).forEach((root) => root.unmount());
    });
  });

  it("renders Lucide icons and toggles through the supplied manager", async () => {
    const manager = createThemeManager({ defaultTheme: "light" });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    await act(async () => {
      root.render(
        createElement(
          ThemeProvider,
          { manager },
          createElement(Themora, {
            transition: "fade",
            duration: 0,
            source: "self",
            size: "sm",
          }),
        ),
      );
    });
    const button = container.querySelector("button");
    expect(button?.getAttribute("aria-label")).toBe("Switch to dark theme");
    expect(button?.querySelector("svg")).not.toBeNull();
    expect(button?.style.width).toBe("32px");
    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(manager.resolvedTheme).toBe("dark");
    expect(button?.getAttribute("aria-label")).toBe("Switch to light theme");
    manager.destroy();
  });

  it("works without a ThemeProvider", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    await act(async () => {
      root.render(createElement(Themora, { transition: "fade", duration: 0 }));
    });
    await act(async () => {
      container
        .querySelector("button")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
