import type { TransitionEffect } from "../types.js";
import {
  addOverlay,
  defaultDuration,
  immediate,
  makeHandle,
  targetSize,
  visualSnapshot,
} from "./shared.js";
import { clamp } from "../utils.js";

function startStaticSound(
  option: boolean | { volume?: number } | undefined,
): () => void {
  if (
    !option ||
    typeof window === "undefined" ||
    !navigator.userActivation?.isActive
  )
    return () => undefined;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return () => undefined;
  try {
    const audio = new AudioContextClass();
    const frames = Math.max(1, Math.floor(audio.sampleRate * 0.25));
    const buffer = audio.createBuffer(1, frames, audio.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < frames; index += 1)
      channel[index] = Math.random() * 2 - 1;
    const source = audio.createBufferSource();
    const gain = audio.createGain();
    const volume =
      typeof option === "object" && option !== null && "volume" in option
        ? Number(option.volume)
        : 0.035;
    gain.gain.value = clamp(Number.isFinite(volume) ? volume : 0.035, 0, 0.15);
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain).connect(audio.destination);
    source.start();
    return () => {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      void audio.close();
    };
  } catch {
    return () => undefined;
  }
}

/** Procedural black-and-white CRT snow with scanlines and moving interference bands. */
export const analogNoiseEffect: TransitionEffect = (context) => {
  if (context.reducedMotion) return immediate(context);
  const duration = defaultDuration(context.options.duration, 900);
  const stopSound = startStaticSound(context.options.sound);
  const reveal = context.options.revealStyle === "reveal";
  const snapshot = reveal ? visualSnapshot(context.target) : undefined;
  const overlay = addOverlay(context.target, "analog-noise");
  const canvas = document.createElement("canvas");
  const { width, height } = targetSize(context.target);
  const quality =
    context.options.quality === "high"
      ? 1
      : context.options.quality === "low"
        ? 0.35
        : Math.min(0.7, window.devicePixelRatio > 1.5 ? 0.5 : 0.7);
  const grain = Math.max(1, context.options.grainSize ?? 2);
  canvas.width = Math.max(1, Math.floor((width * quality) / grain));
  canvas.height = Math.max(1, Math.floor((height * quality) / grain));
  Object.assign(canvas.style, {
    width: "100%",
    height: "100%",
    imageRendering: "pixelated",
    display: "block",
    opacity: "0",
  });
  if (snapshot) overlay.appendChild(snapshot);
  overlay.appendChild(canvas);
  const context2d = canvas.getContext("2d", { alpha: false });
  if (!context2d) {
    context.applyTheme();
    stopSound();
    overlay.removeThemoraOverlay();
    return { finished: Promise.resolve(), cancel: () => undefined };
  }
  const image = context2d.createImageData(canvas.width, canvas.height);
  const intensity = clamp(context.options.intensity ?? 0.9, 0.1, 1);
  const density = clamp(context.options.staticDensity ?? 1, 0.1, 1);
  const distortion = clamp(context.options.distortion ?? 0.3, 0, 1);
  const radius = Math.max(
    Math.hypot(context.origin.x, context.origin.y),
    Math.hypot(width - context.origin.x, context.origin.y),
    Math.hypot(context.origin.x, height - context.origin.y),
    Math.hypot(width - context.origin.x, height - context.origin.y),
  );
  const spread = Math.max(8, context.options.spread ?? 55);
  const start = performance.now();
  let applied = false;
  if (reveal) {
    context.applyTheme();
    applied = true;
  }
  let raf = 0;
  let lastNoiseAt = -Infinity;
  const frameInterval =
    1000 / clamp(context.options.flickerFrequency ?? 30, 10, 60);
  const draw = (now: number): void => {
    const elapsed = now - start;
    const progress = clamp(elapsed / duration, 0, 1);
    const alpha = reveal
      ? intensity
      : (progress < 0.32 ? progress / 0.32 : 1 - (progress - 0.32) / 0.68) *
        intensity;
    canvas.style.opacity = String(clamp(alpha, 0, 1));
    if (reveal && snapshot) {
      const edge = progress * (radius + spread);
      const oldMask = `radial-gradient(circle at ${context.origin.x}px ${context.origin.y}px, transparent ${Math.max(0, edge - spread)}px, black ${edge}px)`;
      const noiseMask = `radial-gradient(circle at ${context.origin.x}px ${context.origin.y}px, transparent ${Math.max(0, edge - spread)}px, black ${Math.max(0, edge - spread + 1)}px, black ${edge}px, transparent ${edge + spread}px)`;
      snapshot.style.maskImage = oldMask;
      snapshot.style.setProperty("-webkit-mask-image", oldMask);
      canvas.style.maskImage = noiseMask;
      canvas.style.setProperty("-webkit-mask-image", noiseMask);
    }
    if (now - lastNoiseAt >= frameInterval || progress >= 1) {
      lastNoiseAt = now;
      const data = image.data;
      const band = Math.floor((now / 6) % Math.max(1, canvas.height));
      for (let y = 0; y < canvas.height; y += 1) {
        const scanline =
          context.options.scanlines === false ? 1 : y % 3 === 0 ? 0.55 : 1;
        const shift =
          context.options.interference === false
            ? 0
            : Math.floor(Math.sin((y + now / 5) * 0.15) * distortion * 12);
        for (let x = 0; x < canvas.width; x += 1) {
          const index = (y * canvas.width + x) * 4;
          const random = Math.random() < density ? Math.random() * 255 : 18;
          const interference = Math.abs(y - band) < 3 ? 1.45 : 1;
          const snow = clamp(
            (random + ((x + shift) % 13) * 2) * scanline * interference,
            0,
            255,
          );
          data[index] = snow;
          data[index + 1] = snow;
          data[index + 2] = snow;
          data[index + 3] = 255;
        }
      }
      context2d.putImageData(image, 0, 0);
    }
    if (!applied && (reveal || progress >= 0.32)) {
      applied = true;
      context.applyTheme();
    }
    if (progress < 1 && !context.signal.aborted)
      raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  const done = new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, duration + 20);
    context.signal.addEventListener("abort", () => window.clearTimeout(timer), {
      once: true,
    });
  });
  return makeHandle(
    done,
    () => {
      cancelAnimationFrame(raf);
      stopSound();
      overlay.removeThemoraOverlay();
      if (!applied) context.applyTheme();
    },
    context.signal,
  );
};
