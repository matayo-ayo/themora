import {
  computed,
  getCurrentInstance,
  onBeforeUnmount,
  onMounted,
  ref,
  type Ref,
} from "vue";
import type {
  SectionVisitOptions,
  ThemeName,
  TransitionOptions,
} from "./types.js";
import type { ThemeManager } from "./theme-manager.js";
import { changeOnVisit } from "./sections.js";

export function useTheme(manager: ThemeManager) {
  const selected = ref(manager.selectedTheme);
  const resolved = ref(manager.resolvedTheme);
  const stop = manager.subscribe((event) => {
    selected.value = event.selected;
    resolved.value = event.resolved;
  });
  if (getCurrentInstance()) onBeforeUnmount(stop);
  return {
    selected: computed(() => selected.value),
    resolved: computed(() => resolved.value),
    setTheme: manager.setTheme.bind(manager),
    toggle: manager.toggle.bind(manager),
  };
}
export function useThemeTransition(manager: ThemeManager) {
  return (theme: ThemeName, options?: TransitionOptions) =>
    manager.transitionTo(theme, options);
}
export function useSectionTheme(
  manager: ThemeManager,
  target: Ref<HTMLElement | null>,
  initial?: ThemeName,
) {
  onMounted(() => {
    if (initial && target.value)
      void manager.transitionTo(initial, { target: target.value });
  });
  return {
    setTheme: (theme: ThemeName, options?: TransitionOptions) =>
      target.value
        ? manager.transitionTo(theme, { ...options, target: target.value })
        : Promise.reject(new Error("Section ref is not mounted.")),
  };
}
export function useChangeOnVisit(
  manager: ThemeManager,
  options: SectionVisitOptions,
): void {
  let stop: (() => void) | undefined;
  onMounted(() => {
    stop = changeOnVisit(manager, options);
  });
  onBeforeUnmount(() => stop?.());
}
