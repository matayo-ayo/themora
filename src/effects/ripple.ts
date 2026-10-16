import type { TransitionEffect } from "../types.js";
import {
  addOverlay,
  animate,
  defaultDuration,
  immediate,
  makeHandle,
  targetSize,
  viewTransition,
  visualSnapshot,
} from "./shared.js";
import { OriginResolver } from "../origin.js";

export const rippleEffect: TransitionEffect = (context) => {
  if (context.reducedMotion) return immediate(context);
  const duration = defaultDuration(context.options.duration, 600);
  const radius = new OriginResolver().radius(context.target, context.origin);
  const easing = context.options.easing ?? "cubic-bezier(.2,.8,.2,1)";
  const native = viewTransition(
    context,
    `::view-transition-old(root) { animation:none; } ::view-transition-new(root) { animation: themora-ripple ${duration}ms ${easing} both; clip-path:circle(0px at ${context.origin.x}px ${context.origin.y}px); } @keyframes themora-ripple { to { clip-path:circle(${radius}px at ${context.origin.x}px ${context.origin.y}px); } }`,
  );
  if (native) return native;
  const snapshot = visualSnapshot(context.target);
  const overlay = addOverlay(context.target, "ripple");
  overlay.appendChild(snapshot);
  context.applyTheme();
  const size = targetSize(context.target);
  overlay.style.width = `${size.width}px`;
  overlay.style.height = `${size.height}px`;
  const done = animate(
    snapshot,
    [
      {
        clipPath: `circle(${radius}px at ${context.origin.x}px ${context.origin.y}px)`,
      },
      {
        clipPath: `circle(0px at ${context.origin.x}px ${context.origin.y}px)`,
      },
    ],
    { duration, easing, fill: "forwards" },
  );
  return makeHandle(done, () => overlay.removeThemoraOverlay(), context.signal);
};
