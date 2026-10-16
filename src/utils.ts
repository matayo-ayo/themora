export const canUseDOM = (): boolean =>
  typeof window !== "undefined" && typeof document !== "undefined";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isReducedMotion(): boolean {
  return (
    canUseDOM() &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function elementFrom(
  target: HTMLElement | string,
  root: Document | HTMLElement = document,
): HTMLElement | null {
  if (typeof target !== "string") return target;
  try {
    return root.querySelector<HTMLElement>(target);
  } catch {
    return null;
  }
}

export function setStyle(
  element: HTMLElement,
  property: string,
  value: string,
): void {
  element.style.setProperty(property, value);
}

export function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function animationFinished(animation: Animation): Promise<void> {
  return animation.finished.then(() => undefined).catch(() => undefined);
}
