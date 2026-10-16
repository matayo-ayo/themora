import type { EffectContext, EffectHandle } from "../types.js";
import { animationFinished, canUseDOM, clamp } from "../utils.js";

export const defaultDuration = (
  value: number | undefined,
  fallback: number,
): number => clamp(value ?? fallback, 0, 30_000);

export function immediate(context: EffectContext): EffectHandle {
  context.applyTheme();
  return { finished: Promise.resolve(), cancel: () => undefined };
}

export function makeHandle(
  finished: Promise<void>,
  cleanup: () => void,
  signal: AbortSignal,
): EffectHandle {
  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    cleanup();
  };
  signal.addEventListener("abort", close, { once: true });
  return { finished: finished.finally(close), cancel: close };
}

type ThemoraOverlay = HTMLDivElement & { removeThemoraOverlay: () => void };

function copyComputedStyles(source: Element, clone: Element): void {
  if (!(source instanceof HTMLElement) || !(clone instanceof HTMLElement))
    return;
  const computed = getComputedStyle(source);
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    if (!property) continue;
    clone.style.setProperty(
      property,
      computed.getPropertyValue(property),
      computed.getPropertyPriority(property),
    );
  }
  clone.removeAttribute("id");
  clone.setAttribute("aria-hidden", "true");
  const sourceChildren = source.children;
  const cloneChildren = clone.children;
  for (let index = 0; index < sourceChildren.length; index += 1) {
    const sourceChild = sourceChildren.item(index);
    const cloneChild = cloneChildren.item(index);
    if (sourceChild && cloneChild) copyComputedStyles(sourceChild, cloneChild);
  }
}

/** Captures the current rendered subtree for browsers without View Transitions. */
export function visualSnapshot(target: HTMLElement): HTMLElement {
  const source =
    target === document.documentElement && document.body
      ? document.body
      : target;
  const clone = source.cloneNode(true) as HTMLElement;
  copyComputedStyles(source, clone);
  Object.assign(clone.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    margin: "0",
    pointerEvents: "none",
    overflow: "hidden",
    maxWidth: "none",
    maxHeight: "none",
  });
  return clone;
}

export function addOverlay(
  target: HTMLElement,
  className: string,
): ThemoraOverlay {
  const overlay = document.createElement("div");
  overlay.className = `themora-overlay themora-${className}`;
  Object.assign(overlay.style, {
    position: target === document.documentElement ? "fixed" : "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2147483647",
    overflow: "hidden",
    contain: "strict",
  });
  const originalPosition = target.style.position;
  const adjustedPosition =
    target !== document.documentElement &&
    getComputedStyle(target).position === "static";
  if (adjustedPosition) target.style.position = "relative";
  target.appendChild(overlay);
  const typedOverlay = overlay as ThemoraOverlay;
  typedOverlay.removeThemoraOverlay = (): void => {
    overlay.remove();
    if (adjustedPosition) target.style.position = originalPosition;
  };
  return typedOverlay;
}

export function animate(
  element: Element,
  keyframes: Keyframe[],
  timing: KeyframeAnimationOptions,
): Promise<void> {
  if (typeof element.animate !== "function") return Promise.resolve();
  return animationFinished(element.animate(keyframes, timing));
}

interface NativeViewTransition {
  finished: Promise<void>;
  skipTransition?: () => void;
}

/** Run a native View Transition when available; it captures old/new DOM snapshots correctly. */
export function viewTransition(
  context: EffectContext,
  css: string,
): EffectHandle | undefined {
  const doc = canUseDOM() ? document : undefined;
  const start = doc
    ? (
        doc as unknown as {
          startViewTransition?: (callback: () => void) => NativeViewTransition;
        }
      ).startViewTransition
    : undefined;
  if (!doc || !start || context.target !== document.documentElement)
    return undefined;
  const style = document.createElement("style");
  style.dataset.themora = "view-transition";
  style.textContent = css;
  document.head.appendChild(style);
  let transition: NativeViewTransition | undefined;
  try {
    transition = start.call(doc, context.applyTheme);
  } catch {
    style.remove();
    return undefined;
  }
  return makeHandle(
    transition.finished,
    () => {
      style.remove();
      transition?.skipTransition?.();
    },
    context.signal,
  );
}

export function targetSize(target: HTMLElement): {
  width: number;
  height: number;
} {
  const rect = target.getBoundingClientRect();
  return { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
}
