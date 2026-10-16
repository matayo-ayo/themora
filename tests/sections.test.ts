import { describe, expect, it } from "vitest";
import { createThemeManager, changeOnVisit } from "../src/index.js";
import { IntersectionObserverMock } from "./setup.js";

describe("changeOnVisit", () => {
  it("only changes the visited section and can restore original appearance", async () => {
    document.body.innerHTML =
      '<section id="first"></section><section id="second"></section>';
    const manager = createThemeManager({
      defaultTheme: "light",
      themes: [{ name: "sunset", tokens: { brand: "orange" } }],
    });
    const stop = changeOnVisit(manager, {
      element: "#second",
      theme: "sunset",
      transition: { duration: 0 },
      reverseOnExit: true,
      restoreOriginal: true,
    });
    const observer = IntersectionObserverMock.instances[0];
    observer?.trigger(document.querySelector("#second") as Element, true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector("#second")?.getAttribute("data-theme")).toBe(
      "sunset",
    );
    expect(
      document.querySelector("#first")?.getAttribute("data-theme"),
    ).toBeNull();
    observer?.trigger(document.querySelector("#second") as Element, false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      document.querySelector("#second")?.getAttribute("data-theme"),
    ).toBeNull();
    stop();
    manager.destroy();
  });
  it("can cancel a selector registration before the element is inserted", async () => {
    const manager = createThemeManager({ defaultTheme: "light" });
    const stop = changeOnVisit(manager, {
      element: "#late",
      theme: "dark",
      transition: { duration: 0 },
    });
    stop();
    document.body.insertAdjacentHTML(
      "beforeend",
      '<section id="late"></section>',
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      document.querySelector("#late")?.getAttribute("data-theme"),
    ).toBeNull();
    manager.destroy();
  });

  it("clears scoped tokens when restoring an originally unthemed section", async () => {
    document.body.innerHTML = '<section id="section"></section>';
    const manager = createThemeManager({
      defaultTheme: "light",
      themes: [{ name: "painted", tokens: { brand: "tomato" } }],
    });
    const stop = changeOnVisit(manager, {
      element: "#section",
      theme: "painted",
      transition: { duration: 0 },
      reverseOnExit: true,
      restoreOriginal: true,
    });
    const section = document.querySelector("#section") as HTMLElement;
    const observer = IntersectionObserverMock.instances[0];
    observer?.trigger(section, true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(section.style.getPropertyValue("--brand")).toBe("tomato");
    observer?.trigger(section, false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(section.style.getPropertyValue("--brand")).toBe("");
    stop();
    manager.destroy();
  });
});
