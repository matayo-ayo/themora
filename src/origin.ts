import type {
  Point,
  ResolvedOrigin,
  TransitionOptions,
  TransitionOrigin,
} from "./types.js";
import { canUseDOM, clamp } from "./utils.js";

let lastPointer: Point | undefined;
let tracking = false;

function startTracking(): void {
  if (!canUseDOM() || tracking) return;
  tracking = true;
  window.addEventListener("pointerdown", rememberPointer, { passive: true });
  window.addEventListener("pointermove", rememberPointer, { passive: true });
}
function rememberPointer(event: PointerEvent): void {
  lastPointer = { x: event.clientX, y: event.clientY };
}
function center(target: HTMLElement): Point {
  const box = target.getBoundingClientRect();
  return { x: box.width / 2, y: box.height / 2 };
}
function within(point: Point, target: HTMLElement): Point {
  const box = target.getBoundingClientRect();
  return {
    x: clamp(point.x - box.left, 0, box.width),
    y: clamp(point.y - box.top, 0, box.height),
  };
}
function fromElement(element: Element, target: HTMLElement): Point {
  const rect = element.getBoundingClientRect();
  return within(
    { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    target,
  );
}
function triggerElement(
  trigger: TransitionOptions["trigger"],
): Element | undefined {
  if (typeof Element !== "undefined" && trigger instanceof Element)
    return trigger;
  if (trigger && "currentTarget" in trigger)
    return (trigger.currentTarget || trigger.target) as Element | undefined;
  return undefined;
}
function attributeElement(id?: string): Element | null {
  if (!canUseDOM()) return null;
  if (id) {
    const escaped =
      typeof CSS !== "undefined" && CSS.escape
        ? CSS.escape(id)
        : id.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
    return document.querySelector(
      `[data-theme-point="${escaped}"], [themePoint="${escaped}"]`,
    );
  }
  return document.querySelector("[data-theme-point], [themePoint]");
}

/** Resolves every public origin form relative to the transition target. */
export class OriginResolver {
  resolve(
    origin: TransitionOrigin | undefined,
    target: HTMLElement,
    options: TransitionOptions = {},
  ): ResolvedOrigin {
    startTracking();
    const fallback = center(target);
    const selected = origin ?? "center";
    if (typeof selected === "object") {
      if (selected.type === "coordinates")
        return { ...within(selected, target), source: "coordinates" };
      if (selected.type === "element") {
        const element =
          typeof selected.element === "string"
            ? document.querySelector(selected.element)
            : selected.element;
        return element
          ? { ...fromElement(element, target), source: "element" }
          : { ...fallback, source: "element" };
      }
      const found = attributeElement(selected.id);
      return found
        ? { ...fromElement(found, target), source: "attribute" }
        : { ...fallback, source: "attribute" };
    }
    if (selected === "trigger") {
      const element = triggerElement(options.trigger);
      return element
        ? { ...fromElement(element, target), source: "trigger" }
        : { ...fallback, source: "trigger" };
    }
    if (selected === "cursor")
      return {
        ...(lastPointer ? within(lastPointer, target) : fallback),
        source: "cursor",
      };
    if (selected === "attribute") {
      const found = attributeElement();
      return found
        ? { ...fromElement(found, target), source: "attribute" }
        : { ...fallback, source: "attribute" };
    }
    if (selected === "element") {
      const element = triggerElement(options.trigger);
      return element
        ? { ...fromElement(element, target), source: "element" }
        : { ...fallback, source: "element" };
    }
    return { ...fallback, source: "center" };
  }
  radius(target: HTMLElement, origin: Point): number {
    const box = target.getBoundingClientRect();
    return Math.max(
      Math.hypot(origin.x, origin.y),
      Math.hypot(box.width - origin.x, origin.y),
      Math.hypot(origin.x, box.height - origin.y),
      Math.hypot(box.width - origin.x, box.height - origin.y),
    );
  }
}
