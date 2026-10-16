export type BuiltInTheme = "light" | "dark" | "system";
export type ThemeName = string;
export type CSSValue = string | number;
export type ThemeTokens = Record<string, CSSValue>;
export interface ThemeDefinition {
  name: ThemeName;
  tokens: ThemeTokens;
  colorScheme?: "light" | "dark";
}
export type ThemePreference = ThemeName | "system";
export type TransitionEffectName =
  "ripple" | "fade" | "wind" | "waves" | "noise" | string;
export type TransitionDirection = "left" | "right" | "top" | "bottom";
export type OriginKind =
  "center" | "trigger" | "cursor" | "attribute" | "element" | "coordinates";
export type TransitionOrigin =
  | OriginKind
  | { type: "coordinates"; x: number; y: number }
  | { type: "element"; element: Element | string }
  | { type: "attribute"; id?: string };
export interface Point {
  x: number;
  y: number;
}
export interface ResolvedOrigin extends Point {
  source: OriginKind;
}
export interface TransitionOptions {
  effect?: TransitionEffectName;
  duration?: number;
  /** Multiplier applied to transition playback speed. Values above 1 are faster. */
  speed?: number;
  easing?: string;
  direction?: TransitionDirection;
  origin?: TransitionOrigin;
  trigger?: Element | Event | null;
  target?: HTMLElement;
  intensity?: number;
  spread?: number;
  delay?: number;
  windDensity?: number;
  stagger?: number;
  amplitude?: number;
  wavelength?: number;
  frequency?: number;
  grainSize?: number;
  flickerFrequency?: number;
  scanlines?: boolean;
  interference?: boolean;
  distortion?: number;
  staticDensity?: number;
  revealStyle?: "classic" | "reveal";
  sound?: boolean | { volume?: number };
  quality?: "auto" | "low" | "high";
  onComplete?: () => void;
  onCancel?: (reason: string) => void;
}
export interface ThemeManagerOptions {
  themes?: ThemeDefinition[];
  defaultTheme?: ThemePreference;
  attribute?: string;
  storageKey?: string;
  persist?: boolean;
  root?: HTMLElement;
  transition?: TransitionOptions;
  respectReducedMotion?: boolean;
}
export interface ThemeChangeEvent {
  selected: ThemePreference;
  resolved: ThemeName;
  previous: ThemePreference | undefined;
  source: "api" | "storage" | "system" | "init";
}
export type ThemeListener = (event: ThemeChangeEvent) => void;
export type TransitionPhase =
  "start" | "applied" | "complete" | "cancel" | "error";
export interface TransitionEvent {
  phase: TransitionPhase;
  theme: ThemeName;
  options: Required<Pick<TransitionOptions, "effect" | "duration" | "easing">> &
    TransitionOptions;
  error?: unknown;
}
export type TransitionListener = (event: TransitionEvent) => void;
export interface EffectContext {
  target: HTMLElement;
  origin: ResolvedOrigin;
  options: TransitionOptions;
  reducedMotion: boolean;
  signal: AbortSignal;
  applyTheme: () => void;
}
export interface EffectHandle {
  finished: Promise<void>;
  cancel: (reason?: string) => void;
}
export type TransitionEffect = (context: EffectContext) => EffectHandle;
export interface SectionVisitOptions {
  element: HTMLElement | string;
  theme: ThemeName;
  enabled?: boolean;
  threshold?: number | number[];
  rootMargin?: string;
  transition?: TransitionOptions;
  once?: boolean;
  reverseOnExit?: boolean;
  restoreOriginal?: boolean;
  initial?: boolean;
  onEnter?: (element: HTMLElement) => void;
  onExit?: (element: HTMLElement) => void;
  onThemeChange?: (theme: ThemeName, element: HTMLElement) => void;
}
