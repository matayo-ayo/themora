import type { SectionVisitOptions, ThemeManagerOptions } from "./types.js";
import { createThemeManager, type ThemeManager } from "./theme-manager.js";
import { changeOnVisit } from "./sections.js";

export interface VanillaThemora extends ThemeManager {
  changeOnVisit: (options: SectionVisitOptions) => () => void;
}
/** Convenience factory for script-tag and plain JavaScript applications. */
export function createThemora(
  options: ThemeManagerOptions = {},
): VanillaThemora {
  const manager = createThemeManager(options) as VanillaThemora;
  manager.changeOnVisit = (visitOptions) =>
    changeOnVisit(manager, visitOptions);
  return manager;
}
