import type { TransitionEffect } from "../types.js";
import {
  addOverlay,
  defaultDuration,
  immediate,
  makeHandle,
  visualSnapshot,
} from "./shared.js";
import { clamp } from "../utils.js";

function wavePath(
  width: number,
  height: number,
  amplitude: number,
  wavelength: number,
  phase: number,
  vertical: boolean,
): string {
  const points: string[] = [];
  const length = vertical ? height : width;
  for (let axis = 0; axis <= length; axis += 8) {
    const displacement =
      Math.sin((axis / wavelength) * Math.PI * 2 + phase) * amplitude;
    points.push(
      vertical
        ? `${width / 2 + displacement},${axis}`
        : `${axis},${height / 2 + displacement}`,
    );
  }
  return points.join(" ");
}

function revealPath(
  width: number,
  height: number,
  progress: number,
  amplitude: number,
  wavelength: number,
  phase: number,
  direction: string,
): string {
  const points: string[] = [];
  const horizontal = direction === "left" || direction === "right";
  const reverse = direction === "left" || direction === "top";
  const length = horizontal ? height : width;
  const cross = horizontal ? width : height;
  const boundary = reverse ? cross * (1 - progress) : cross * progress;
  if (horizontal) points.push(reverse ? "0px 0px" : `${width}px 0px`);
  else points.push(reverse ? "0px 0px" : `0px ${height}px`);
  for (let axis = 0; axis <= length; axis += 6) {
    const displacement =
      Math.sin((axis / wavelength) * Math.PI * 2 + phase) * amplitude;
    if (horizontal)
      points.push(`${clamp(boundary + displacement, 0, width)}px ${axis}px`);
    else
      points.push(`${axis}px ${clamp(boundary + displacement, 0, height)}px`);
  }
  if (horizontal)
    points.push(reverse ? `0px ${height}px` : `${width}px ${height}px`);
  else points.push(reverse ? `${width}px 0px` : `${width}px ${height}px`);
  return `polygon(${points.join(",")})`;
}

export const wavesEffect: TransitionEffect = (context) => {
  if (context.reducedMotion) return immediate(context);
  const duration = defaultDuration(context.options.duration, 780);
  const rect = context.target.getBoundingClientRect();
  const amplitude = Math.max(2, context.options.amplitude ?? 26);
  const wavelength = Math.max(16, context.options.wavelength ?? 120);
  const vertical =
    context.options.direction === "top" ||
    context.options.direction === "bottom";
  const direction = context.options.direction ?? "right";
  const snapshot = visualSnapshot(context.target);
  const overlay = addOverlay(context.target, "waves");
  overlay.appendChild(snapshot);
  context.applyTheme();
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
  svg.setAttribute("preserveAspectRatio", "none");
  Object.assign(svg.style, { width: "100%", height: "100%", display: "block" });
  for (let layer = 0; layer < 3; layer += 1) {
    const polyline = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polyline",
    );
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", "currentColor");
    polyline.setAttribute("stroke-opacity", String(0.22 - layer * 0.05));
    polyline.setAttribute(
      "stroke-width",
      String(amplitude * (2.5 - layer * 0.5)),
    );
    svg.appendChild(polyline);
    const start = performance.now() + layer * 120;
    const frequency = Math.max(0.2, context.options.frequency ?? 1);
    let frame = 0;
    const draw = (now: number): void => {
      const phase = ((now - start) / 1000) * frequency * Math.PI * 2;
      polyline.setAttribute(
        "points",
        wavePath(
          rect.width,
          rect.height,
          amplitude * (1 - layer * 0.2),
          wavelength,
          phase,
          vertical,
        ),
      );
      if (now - start < duration) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    context.signal.addEventListener(
      "abort",
      () => cancelAnimationFrame(frame),
      { once: true },
    );
  }
  let revealFrame = 0;
  let resolveDone = (): void => undefined;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  const started = performance.now();
  const reveal = (now: number): void => {
    const progress = clamp((now - started) / duration, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    snapshot.style.clipPath = revealPath(
      rect.width,
      rect.height,
      eased,
      amplitude,
      wavelength,
      ((now - started) / 1000) *
        Math.max(0.2, context.options.frequency ?? 1) *
        Math.PI *
        2,
      direction,
    );
    if (progress < 1 && !context.signal.aborted)
      revealFrame = requestAnimationFrame(reveal);
    else resolveDone();
  };
  revealFrame = requestAnimationFrame(reveal);
  return makeHandle(
    done,
    () => {
      cancelAnimationFrame(revealFrame);
      overlay.removeThemoraOverlay();
    },
    context.signal,
  );
};
