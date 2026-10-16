import type {
  ThemeChangeEvent,
  ThemeDefinition,
  ThemeListener,
  ThemeManagerOptions,
  ThemeName,
  ThemePreference,
  ThemeTokens,
  TransitionOptions,
} from "./types.js";
import { canUseDOM } from "./utils.js";
import { ThemeScope } from "./scope.js";
import { TransitionController } from "./transitions.js";

const defaultThemes: ThemeDefinition[] = [
  { name: "light", colorScheme: "light", tokens: {} },
  { name: "dark", colorScheme: "dark", tokens: {} },
];

function safeStorageGet(key: string): string | null {
  if (!canUseDOM()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeStorageSet(key: string, value: string): void {
  if (!canUseDOM()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode or disabled storage */
  }
}

export class ThemeManager {
  private readonly themes = new Map<ThemeName, ThemeDefinition>();
  private readonly listeners = new Set<ThemeListener>();
  private readonly appliedTokens = new WeakMap<HTMLElement, Set<string>>();
  private readonly mediaQuery: MediaQueryList | undefined;
  private selected: ThemePreference;
  private destroyed = false;
  readonly attribute: string;
  readonly storageKey: string;
  readonly persist: boolean;
  readonly root: HTMLElement | undefined;
  readonly defaultTransition: TransitionOptions;
  readonly respectReducedMotion: boolean;
  readonly transitions: TransitionController;

  constructor(options: ThemeManagerOptions = {}) {
    this.attribute = options.attribute ?? "data-theme";
    this.storageKey = options.storageKey ?? "themora-theme";
    this.persist = options.persist ?? true;
    this.root = options.root;
    this.defaultTransition = options.transition ?? {};
    this.respectReducedMotion = options.respectReducedMotion ?? true;
    for (const theme of [...defaultThemes, ...(options.themes ?? [])])
      this.registerTheme(theme);
    const persisted = this.persist ? safeStorageGet(this.storageKey) : null;
    const initial =
      persisted && this.isValidPreference(persisted)
        ? persisted
        : (options.defaultTheme ?? "system");
    if (!this.isValidPreference(initial))
      throw new Error(`Unknown default theme "${initial}".`);
    this.selected = initial;
    if (canUseDOM()) {
      if (typeof window.matchMedia === "function") {
        this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        this.mediaQuery.addEventListener("change", this.onSystemChange);
      }
      window.addEventListener("storage", this.onStorage);
    }
    this.apply(this.getResolvedTheme(), this.getRoot());
    this.transitions = new TransitionController(this, {
      respectReducedMotion: this.respectReducedMotion,
    });
    this.emit({
      selected: this.selected,
      resolved: this.getResolvedTheme(),
      previous: undefined,
      source: "init",
    });
  }

  get selectedTheme(): ThemePreference {
    return this.selected;
  }
  get resolvedTheme(): ThemeName {
    return this.getResolvedTheme();
  }
  getRoot(): HTMLElement | undefined {
    return this.root ?? (canUseDOM() ? document.documentElement : undefined);
  }
  getSelectedTheme(): ThemePreference {
    return this.selected;
  }
  getResolvedTheme(): ThemeName {
    return this.selected === "system"
      ? this.mediaQuery?.matches
        ? "dark"
        : "light"
      : this.selected;
  }
  listThemes(): ThemeDefinition[] {
    return [...this.themes.values()].map((theme) => ({
      ...theme,
      tokens: { ...theme.tokens },
    }));
  }
  getTheme(name: ThemeName): ThemeDefinition | undefined {
    const theme = this.themes.get(name);
    return theme ? { ...theme, tokens: { ...theme.tokens } } : undefined;
  }

  registerTheme(theme: ThemeDefinition): this {
    if (!theme.name || theme.name === "system")
      throw new Error('A theme name must be non-empty and cannot be "system".');
    this.themes.set(theme.name, { ...theme, tokens: { ...theme.tokens } });
    return this;
  }
  updateTheme(
    name: ThemeName,
    tokens: ThemeTokens,
    options: Pick<ThemeDefinition, "colorScheme"> = {},
  ): this {
    if (!this.themes.has(name)) throw new Error(`Unknown theme "${name}".`);
    return this.registerTheme({ name, tokens, ...options });
  }
  removeTheme(name: ThemeName): boolean {
    if (name === "light" || name === "dark")
      throw new Error("Built-in themes cannot be removed.");
    if (this.selected === name) this.setTheme("system");
    return this.themes.delete(name);
  }

  setTheme(
    theme: ThemePreference,
    options?: { persist?: boolean; source?: ThemeChangeEvent["source"] },
  ): this {
    this.assertLive();
    if (!this.isValidPreference(theme))
      throw new Error(`Unknown theme "${theme}".`);
    const previous = this.selected;
    this.selected = theme;
    const resolved = this.getResolvedTheme();
    this.apply(resolved, this.getRoot());
    if (options?.persist ?? this.persist)
      safeStorageSet(this.storageKey, theme);
    if (previous !== theme)
      this.emit({
        selected: theme,
        resolved,
        previous,
        source: options?.source ?? "api",
      });
    return this;
  }
  toggle(themes: readonly ThemePreference[] = ["light", "dark"]): this {
    if (themes.length < 2) throw new Error("toggle needs at least two themes.");
    const current = this.selected;
    const index = themes.indexOf(current);
    return this.setTheme(
      themes[index >= 0 ? (index + 1) % themes.length : 0] as ThemePreference,
    );
  }
  transitionTo(
    theme: ThemeName,
    options: TransitionOptions = {},
  ): Promise<void> {
    return this.transitions.transitionTo(theme, options);
  }
  onTransition(listener: import("./types.js").TransitionListener): () => void {
    return this.transitions.on(listener);
  }
  registerEffect(
    name: string,
    effect: import("./types.js").TransitionEffect,
  ): () => void {
    return this.transitions.registerEffect(name, effect);
  }
  subscribe(listener: ThemeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  createScope(
    target: HTMLElement | string,
    initialTheme?: ThemeName,
  ): ThemeScope {
    return new ThemeScope(this, target, initialTheme);
  }

  /** Applies a registered resolved theme to an arbitrary scope without changing global selection. */
  applyThemeTo(themeName: ThemeName, target: HTMLElement | undefined): void {
    this.apply(themeName, target);
  }

  /** Removes only theme state previously applied by this manager to a scope. */
  clearThemeFrom(target: HTMLElement): void {
    for (const token of this.appliedTokens.get(target) ?? [])
      target.style.removeProperty(token);
    this.appliedTokens.delete(target);
    target.removeAttribute(this.attribute);
    target.style.removeProperty("color-scheme");
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.mediaQuery?.removeEventListener("change", this.onSystemChange);
    if (canUseDOM()) window.removeEventListener("storage", this.onStorage);
    this.listeners.clear();
    this.transitions.destroy();
  }

  private apply(name: ThemeName, target: HTMLElement | undefined): void {
    if (!target) return;
    const theme = this.themes.get(name);
    if (!theme) return;
    target.setAttribute(this.attribute, name);
    if (theme.colorScheme) target.style.colorScheme = theme.colorScheme;
    else target.style.removeProperty("color-scheme");
    const nextTokens = new Set(
      Object.keys(theme.tokens).map((token) =>
        token.startsWith("--") ? token : `--${token}`,
      ),
    );
    for (const token of this.appliedTokens.get(target) ?? [])
      if (!nextTokens.has(token)) target.style.removeProperty(token);
    for (const [token, raw] of Object.entries(theme.tokens))
      target.style.setProperty(
        token.startsWith("--") ? token : `--${token}`,
        String(raw),
      );
    this.appliedTokens.set(target, nextTokens);
  }
  private isValidPreference(name: string): name is ThemePreference {
    return name === "system" || this.themes.has(name);
  }
  private assertLive(): void {
    if (this.destroyed) throw new Error("ThemeManager has been destroyed.");
  }
  private emit(event: ThemeChangeEvent): void {
    for (const listener of this.listeners) listener(event);
  }
  private onSystemChange = (): void => {
    if (this.selected !== "system" || this.destroyed) return;
    const resolved = this.getResolvedTheme();
    this.apply(resolved, this.getRoot());
    this.emit({
      selected: "system",
      resolved,
      previous: "system",
      source: "system",
    });
  };
  private onStorage = (event: StorageEvent): void => {
    if (
      event.key !== this.storageKey ||
      !event.newValue ||
      event.newValue === this.selected ||
      !this.isValidPreference(event.newValue)
    )
      return;
    this.setTheme(event.newValue, { persist: false, source: "storage" });
  };
}

export function createThemeManager(
  options: ThemeManagerOptions = {},
): ThemeManager {
  return new ThemeManager(options);
}
