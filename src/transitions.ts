import type {
  EffectHandle,
  ThemeManagerOptions,
  ThemeName,
  TransitionEffect,
  TransitionEvent,
  TransitionListener,
  TransitionOptions,
} from "./types.js";
import type { ThemeManager } from "./theme-manager.js";
import { OriginResolver } from "./origin.js";
import { isReducedMotion } from "./utils.js";
import {
  analogNoiseEffect,
  fadeEffect,
  rippleEffect,
  wavesEffect,
  windEffect,
} from "./effects/index.js";

const builtIns: Record<string, TransitionEffect> = {
  fade: fadeEffect,
  ripple: rippleEffect,
  wind: windEffect,
  waves: wavesEffect,
  noise: analogNoiseEffect,
  "analog-noise": analogNoiseEffect,
};

/** Serializes replacement-safe transitions and exposes lifecycle events. Latest request wins. */
export class TransitionController {
  private effects = new Map<string, TransitionEffect>(Object.entries(builtIns));
  private listeners = new Set<TransitionListener>();
  private active = new Map<
    HTMLElement,
    { abort: AbortController; handle: EffectHandle }
  >();
  private readonly resolver = new OriginResolver();
  constructor(
    private readonly manager: ThemeManager,
    private readonly managerOptions: Pick<
      ThemeManagerOptions,
      "respectReducedMotion"
    > = {},
  ) {}
  registerEffect(name: string, effect: TransitionEffect): () => void {
    this.effects.set(name, effect);
    return () => this.effects.delete(name);
  }
  unregisterEffect(name: string): boolean {
    return this.effects.delete(name);
  }
  on(listener: TransitionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  cancel(reason = "replaced", target?: HTMLElement): void {
    const entries = target
      ? ([[target, this.active.get(target)]] as const)
      : [...this.active.entries()];
    for (const [activeTarget, active] of entries) {
      if (!active) continue;
      active.abort.abort(reason);
      active.handle.cancel(reason);
      this.active.delete(activeTarget);
    }
  }
  async transitionTo(
    theme: ThemeName,
    options: TransitionOptions = {},
  ): Promise<void> {
    if (!this.manager.getTheme(theme))
      throw new Error(`Unknown theme "${theme}".`);
    const target = options.target ?? this.manager.getRoot();
    if (!target) {
      this.manager.setTheme(theme);
      return;
    }
    this.cancel("replaced", target);
    const merged = { ...this.manager.defaultTransition, ...options };
    const effectName = merged.effect ?? "fade";
    const effect = this.effects.get(effectName);
    if (!effect) throw new Error(`Unknown transition effect "${effectName}".`);
    const normalized = {
      ...merged,
      effect: effectName,
      duration:
        (merged.duration ?? 320) /
        (Number.isFinite(merged.speed) && (merged.speed ?? 0) > 0
          ? (merged.speed as number)
          : 1),
      easing: merged.easing ?? "ease",
    };
    const abort = new AbortController();
    const origin = this.resolver.resolve(merged.origin, target, merged);
    this.emit({ phase: "start", theme, options: normalized });
    let applied = false;
    const applyTheme = (): void => {
      if (applied || abort.signal.aborted) return;
      applied = true;
      if (target === this.manager.getRoot()) this.manager.setTheme(theme);
      else this.manager.applyThemeTo(theme, target);
      this.emit({ phase: "applied", theme, options: normalized });
    };
    const reduced =
      (this.managerOptions.respectReducedMotion ??
        this.manager.respectReducedMotion) &&
      isReducedMotion();
    try {
      const delay = Math.max(0, merged.delay ?? 0);
      if (delay > 0) {
        let timer = 0;
        const delayed = new Promise<void>((resolve) => {
          timer = window.setTimeout(resolve, delay);
          abort.signal.addEventListener(
            "abort",
            () => {
              window.clearTimeout(timer);
              resolve();
            },
            { once: true },
          );
        });
        const waiting: EffectHandle = {
          finished: delayed,
          cancel: () => window.clearTimeout(timer),
        };
        this.active.set(target, { abort, handle: waiting });
        await delayed;
        if (abort.signal.aborted) {
          this.emit({ phase: "cancel", theme, options: normalized });
          normalized.onCancel?.(String(abort.signal.reason ?? "cancelled"));
          return;
        }
      }
      const handle = effect({
        target,
        origin,
        options: normalized,
        reducedMotion: reduced,
        signal: abort.signal,
        applyTheme,
      });
      this.active.set(target, { abort, handle });
      await Promise.race([
        handle.finished,
        new Promise<void>((resolve) =>
          abort.signal.addEventListener("abort", () => resolve(), {
            once: true,
          }),
        ),
      ]);
      if (abort.signal.aborted) {
        this.emit({ phase: "cancel", theme, options: normalized });
        normalized.onCancel?.(String(abort.signal.reason ?? "cancelled"));
        return;
      }
      applyTheme();
      this.emit({ phase: "complete", theme, options: normalized });
      normalized.onComplete?.();
    } catch (error) {
      applyTheme();
      this.emit({ phase: "error", theme, options: normalized, error });
      throw error;
    } finally {
      if (this.active.get(target)?.abort === abort) this.active.delete(target);
    }
  }
  destroy(): void {
    this.cancel("destroyed");
    this.listeners.clear();
    this.effects.clear();
  }
  private emit(event: TransitionEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
