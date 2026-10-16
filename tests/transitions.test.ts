import { describe, expect, it, vi } from "vitest";
import { createThemeManager } from "../src/index.js";

describe("transitions", () => {
  it("runs a registered effect, emits lifecycle and applies final theme", async () => {
    const manager = createThemeManager({ defaultTheme: "light" });
    const effect = vi.fn(({ applyTheme }) => {
      applyTheme();
      return { finished: Promise.resolve(), cancel: vi.fn() };
    });
    manager.registerEffect("test", effect);
    const phases: string[] = [];
    manager.onTransition((event) => phases.push(event.phase));
    await manager.transitionTo("dark", {
      effect: "test",
      target: document.documentElement,
    });
    expect(effect).toHaveBeenCalledOnce();
    expect(phases).toEqual(["start", "applied", "complete"]);
    expect(manager.resolvedTheme).toBe("dark");
    manager.destroy();
  });
  it("replaces an active transition deterministically", async () => {
    const manager = createThemeManager({ defaultTheme: "light" });
    let release: (() => void) | undefined;
    const cancelled = vi.fn();
    manager.registerEffect("slow", ({ applyTheme }) => ({
      finished: new Promise<void>((resolve) => {
        release = () => {
          applyTheme();
          resolve();
        };
      }),
      cancel: cancelled,
    }));
    const first = manager.transitionTo("dark", { effect: "slow" });
    await manager.transitionTo("light", { effect: "fade", duration: 0 });
    release?.();
    await first;
    expect(cancelled).toHaveBeenCalled();
    expect(manager.resolvedTheme).toBe("light");
    manager.destroy();
  });
  it("uses instant accessible fallback for reduced motion", async () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
    const manager = createThemeManager({ defaultTheme: "light" });
    await manager.transitionTo("dark", { effect: "noise" });
    expect(manager.resolvedTheme).toBe("dark");
    manager.destroy();
  });
  it("allows independent scoped transitions to run concurrently", async () => {
    document.body.innerHTML =
      '<section id="a"></section><section id="b"></section>';
    const manager = createThemeManager({
      defaultTheme: "light",
      themes: [{ name: "accent", tokens: {} }],
    });
    const releases: Array<() => void> = [];
    const cancelled = vi.fn();
    manager.registerEffect("held", ({ applyTheme }) => ({
      finished: new Promise<void>((resolve) => {
        releases.push(() => {
          applyTheme();
          resolve();
        });
      }),
      cancel: cancelled,
    }));
    const a = document.querySelector("#a") as HTMLElement;
    const b = document.querySelector("#b") as HTMLElement;
    const first = manager.transitionTo("dark", { effect: "held", target: a });
    const second = manager.transitionTo("accent", {
      effect: "held",
      target: b,
    });
    releases.forEach((release) => release());
    await Promise.all([first, second]);
    expect(cancelled).not.toHaveBeenCalled();
    expect(a.dataset.theme).toBe("dark");
    expect(b.dataset.theme).toBe("accent");
    manager.destroy();
  });

  it.each(["fade", "ripple", "wind", "waves", "noise"])(
    "cleans up the %s effect overlay",
    async (effect) => {
      const manager = createThemeManager({ defaultTheme: "light" });
      await manager.transitionTo("dark", { effect, duration: 0 });
      expect(document.querySelector(".themora-overlay")).toBeNull();
      expect(manager.resolvedTheme).toBe("dark");
      manager.destroy();
    },
  );
});
