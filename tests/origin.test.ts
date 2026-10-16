import { describe, expect, it } from "vitest";
import { OriginResolver } from "../src/index.js";

describe("OriginResolver", () => {
  it("resolves coordinates, attributes, triggers and graceful fallbacks relative to target", () => {
    document.body.innerHTML =
      '<main><button data-theme-point="menu"></button></main>';
    const target = document.querySelector("main") as HTMLElement;
    const button = document.querySelector("button") as HTMLButtonElement;
    Object.defineProperty(target, "getBoundingClientRect", {
      value: () => ({ left: 10, top: 20, width: 400, height: 200 }),
    });
    Object.defineProperty(button, "getBoundingClientRect", {
      value: () => ({ left: 70, top: 50, width: 20, height: 30 }),
    });
    const resolver = new OriginResolver();
    expect(
      resolver.resolve({ type: "coordinates", x: 50, y: 40 }, target),
    ).toMatchObject({ x: 40, y: 20, source: "coordinates" });
    expect(
      resolver.resolve({ type: "attribute", id: "menu" }, target),
    ).toMatchObject({ x: 70, y: 45 });
    expect(
      resolver.resolve("trigger", target, { trigger: button }),
    ).toMatchObject({ x: 70, y: 45 });
    expect(
      resolver.resolve({ type: "attribute", id: "missing" }, target),
    ).toMatchObject({ x: 200, y: 100 });
    expect(resolver.radius(target, { x: 0, y: 0 })).toBeCloseTo(
      Math.hypot(400, 200),
    );
  });
});
