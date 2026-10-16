import type { TransitionEffect } from "../types.js";
import {
  addOverlay,
  animate,
  defaultDuration,
  immediate,
  makeHandle,
  visualSnapshot,
} from "./shared.js";

export const windEffect: TransitionEffect = (context) => {
  if (context.reducedMotion) return immediate(context);
  const duration = defaultDuration(context.options.duration, 650);
  const density = Math.max(
    3,
    Math.min(
      24,
      Math.round(context.options.windDensity ?? context.options.intensity ?? 9),
    ),
  );
  const direction = context.options.direction ?? "right";
  const horizontal = direction === "left" || direction === "right";
  const reverse = direction === "left" || direction === "top";
  const easing = context.options.easing ?? "cubic-bezier(.16,1,.3,1)";
  const snapshot = visualSnapshot(context.target);
  const overlay = addOverlay(context.target, "wind");
  overlay.appendChild(snapshot);
  context.applyTheme();
  const animations: Promise<void>[] = [];
  const finalClip =
    direction === "right"
      ? "inset(0 0 0 100%)"
      : direction === "left"
        ? "inset(0 100% 0 0)"
        : direction === "bottom"
          ? "inset(100% 0 0 0)"
          : "inset(0 0 100% 0)";
  const drift =
    direction === "right"
      ? "translateX(5%) skewX(-2deg)"
      : direction === "left"
        ? "translateX(-5%) skewX(2deg)"
        : direction === "bottom"
          ? "translateY(5%) skewY(-2deg)"
          : "translateY(-5%) skewY(2deg)";
  animations.push(
    animate(
      snapshot,
      [
        { clipPath: "inset(0)", transform: "translate(0, 0)" },
        { clipPath: finalClip, transform: drift },
      ],
      { duration, easing, fill: "forwards" },
    ),
  );
  for (let index = 0; index < density; index += 1) {
    const band = document.createElement("i");
    const size = 100 / density + 2;
    const offset = index * (100 / density) - 1;
    Object.assign(band.style, {
      position: "absolute",
      display: "block",
      background: "color-mix(in srgb, currentColor 8%, transparent)",
      opacity: "0.65",
      filter: "blur(1px)",
    });
    if (horizontal)
      Object.assign(band.style, {
        top: "0",
        bottom: "0",
        left: `${offset}%`,
        width: `${size}%`,
      });
    else
      Object.assign(band.style, {
        left: "0",
        right: "0",
        top: `${offset}%`,
        height: `${size}%`,
      });
    overlay.appendChild(band);
    const distance = reverse ? "-140%" : "140%";
    const transform = horizontal
      ? `translateX(${distance}) skewX(${reverse ? -10 : 10}deg)`
      : `translateY(${distance}) skewY(${reverse ? -8 : 8}deg)`;
    animations.push(
      animate(
        band,
        [
          { transform, opacity: 0 },
          { transform: "translate(0, 0)", opacity: 0.55, offset: 0.35 },
          {
            transform: horizontal ? "translateX(20%)" : "translateY(20%)",
            opacity: 0,
          },
        ],
        {
          duration: duration * (0.65 + (index / density) * 0.35),
          delay: index * (context.options.stagger ?? 18),
          easing,
        },
      ),
    );
  }
  return makeHandle(
    Promise.all(animations).then(() => undefined),
    () => overlay.removeThemoraOverlay(),
    context.signal,
  );
};
