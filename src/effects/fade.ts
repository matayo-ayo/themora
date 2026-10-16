import type { TransitionEffect } from "../types.js";
import {
  addOverlay,
  animate,
  defaultDuration,
  immediate,
  viewTransition,
  makeHandle,
  visualSnapshot,
} from "./shared.js";

export const fadeEffect: TransitionEffect = (context) => {
  if (context.reducedMotion) return immediate(context);
  const duration = defaultDuration(context.options.duration, 320);
  const easing = context.options.easing ?? "ease-in-out";
  const native = viewTransition(
    context,
    `::view-transition-old(root), ::view-transition-new(root) { animation-duration:${duration}ms; animation-timing-function:${easing}; } ::view-transition-old(root) { animation-name: themora-fade-out; } ::view-transition-new(root) { animation-name: themora-fade-in; } @keyframes themora-fade-out { to { opacity: 0; } } @keyframes themora-fade-in { from { opacity: 0; } }`,
  );
  if (native) return native;
  const snapshot = visualSnapshot(context.target);
  const overlay = addOverlay(context.target, "fade");
  overlay.appendChild(snapshot);
  context.applyTheme();
  return makeHandle(
    animate(snapshot, [{ opacity: 1 }, { opacity: 0 }], {
      duration,
      easing,
      fill: "forwards",
    }),
    () => overlay.removeThemoraOverlay(),
    context.signal,
  );
};
