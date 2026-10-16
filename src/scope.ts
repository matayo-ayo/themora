import type { ThemeName, TransitionOptions } from "./types.js";
import type { ThemeManager } from "./theme-manager.js";
import { elementFrom } from "./utils.js";

/** An independently themed element. Its CSS variables inherit only to its descendants. */
export class ThemeScope {
  private element: HTMLElement | null;
  private current: ThemeName | undefined;
  constructor(
    private readonly manager: ThemeManager,
    target: HTMLElement | string,
    initialTheme?: ThemeName,
  ) {
    this.element = typeof document === "undefined" ? null : elementFrom(target);
    if (!this.element) throw new Error("Theme scope target was not found.");
    if (initialTheme) this.setTheme(initialTheme);
  }
  get target(): HTMLElement | null {
    return this.element;
  }
  get theme(): ThemeName | undefined {
    return this.current;
  }
  setTheme(theme: ThemeName): this {
    if (!this.element) throw new Error("ThemeScope has been destroyed.");
    if (!this.manager.getTheme(theme))
      throw new Error(`Unknown theme "${theme}".`);
    this.manager.applyThemeTo(theme, this.element);
    this.current = theme;
    return this;
  }
  async transitionTo(
    theme: ThemeName,
    options: TransitionOptions = {},
  ): Promise<void> {
    if (!this.element) throw new Error("ThemeScope has been destroyed.");
    await this.manager.transitionTo(theme, {
      ...options,
      target: this.element,
    });
    this.current = theme;
  }
  destroy(): void {
    this.element = null;
    this.current = undefined;
  }
}
