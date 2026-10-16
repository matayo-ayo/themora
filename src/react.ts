import {
  createContext,
  createElement,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Moon, Sun } from "lucide-react";
import type {
  SectionVisitOptions,
  ThemeManagerOptions,
  ThemeName,
  TransitionEffectName,
  TransitionOptions,
  TransitionOrigin,
} from "./types.js";
import { createThemeManager, type ThemeManager } from "./theme-manager.js";
import { changeOnVisit } from "./sections.js";

const ThemeContext = createContext<ThemeManager | null>(null);
export interface ThemeProviderProps {
  manager?: ThemeManager;
  options?: ThemeManagerOptions;
  children?: ReactNode;
}
export function ThemeProvider({
  manager: supplied,
  options,
  children,
}: ThemeProviderProps) {
  const owned = useRef<ThemeManager | null>(null);
  const lifecycle = useRef(0);
  if (!supplied && !owned.current) owned.current = createThemeManager(options);
  const manager = supplied ?? owned.current;
  if (!manager) throw new Error("Unable to create a ThemeManager.");
  useEffect(() => {
    const version = ++lifecycle.current;
    return () => {
      queueMicrotask(() => {
        if (
          lifecycle.current === version &&
          !supplied &&
          owned.current === manager
        ) {
          manager.destroy();
          owned.current = null;
        }
      });
    };
  }, [manager, supplied]);
  return createElement(ThemeContext.Provider, { value: manager }, children);
}
export function useThemeManager(): ThemeManager {
  const manager = useContext(ThemeContext);
  if (!manager)
    throw new Error(
      "Themora hooks require ThemeProvider or an explicit manager.",
    );
  return manager;
}
export function useTheme(): {
  selected: string;
  resolved: string;
  setTheme: ThemeManager["setTheme"];
  toggle: ThemeManager["toggle"];
} {
  const manager = useThemeManager();
  const state = useSyncExternalStore(
    (listener) => manager.subscribe(() => listener()),
    () => `${manager.selectedTheme}:${manager.resolvedTheme}`,
    () => `${manager.selectedTheme}:${manager.resolvedTheme}`,
  );
  const separator = state.indexOf(":");
  const selected =
    separator < 0 ? manager.selectedTheme : state.slice(0, separator);
  const resolved =
    separator < 0 ? manager.resolvedTheme : state.slice(separator + 1);
  return useMemo(
    () => ({
      selected,
      resolved,
      setTheme: manager.setTheme.bind(manager),
      toggle: manager.toggle.bind(manager),
    }),
    [manager, selected, resolved],
  );
}
export function useThemeTransition(): (
  theme: ThemeName,
  options?: TransitionOptions,
) => Promise<void> {
  const manager = useThemeManager();
  return useMemo(() => manager.transitionTo.bind(manager), [manager]);
}
export function useSectionTheme(
  ref: RefObject<HTMLElement | null>,
  theme?: ThemeName,
): {
  setTheme: (name: ThemeName, options?: TransitionOptions) => Promise<void>;
} {
  const manager = useThemeManager();
  useEffect(() => {
    if (theme && ref.current)
      void manager.transitionTo(theme, { target: ref.current });
  }, [manager, ref, theme]);
  return useMemo(
    () => ({
      setTheme: (name, options = {}) => {
        if (!ref.current)
          return Promise.reject(new Error("Section ref is not mounted."));
        return manager.transitionTo(name, { ...options, target: ref.current });
      },
    }),
    [manager, ref],
  );
}
export function useChangeOnVisit(options: SectionVisitOptions): void {
  const manager = useThemeManager();
  useEffect(() => changeOnVisit(manager, options), [manager, options]);
}

export type ThemoraSource = "self" | "tag" | "center" | "cursor";
export type ThemoraButtonSize = "sm" | "md" | "lg" | number;

export interface ThemoraProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "size"
> {
  /** Built-in or registered transition name. Defaults to ripple. */
  transition?: TransitionEffectName;
  /** Transition time in milliseconds. Numeric strings are accepted for JSX convenience. */
  duration?: number | `${number}`;
  /** self = this button, tag = data-theme-point/themePoint, center = viewport center. */
  source?: ThemoraSource;
  /** Semantic button size or an exact square size in pixels. */
  size?: ThemoraButtonSize;
  /** Optional id used when source="tag". */
  themePoint?: string;
  lightTheme?: ThemeName;
  darkTheme?: ThemeName;
  manager?: ThemeManager;
  managerOptions?: ThemeManagerOptions;
  transitionOptions?: Omit<
    TransitionOptions,
    "effect" | "duration" | "origin" | "trigger"
  >;
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onTransitionError?: (error: unknown) => void;
}

function useThemoraManager(
  supplied: ThemeManager | undefined,
  options: ThemeManagerOptions | undefined,
): ThemeManager {
  const contextual = useContext(ThemeContext);
  const owned = useRef<ThemeManager | null>(null);
  const lifecycle = useRef(0);
  if (!supplied && !contextual && !owned.current)
    owned.current = createThemeManager(options);
  const manager = supplied ?? contextual ?? owned.current;
  if (!manager) throw new Error("Unable to create a ThemeManager.");
  useEffect(() => {
    const version = ++lifecycle.current;
    return () => {
      queueMicrotask(() => {
        if (lifecycle.current === version && owned.current === manager) {
          manager.destroy();
          owned.current = null;
        }
      });
    };
  }, [manager]);
  return manager;
}

function sourceOrigin(
  source: ThemoraSource,
  themePoint?: string,
): TransitionOrigin {
  if (source === "self") return "trigger";
  if (source === "tag")
    return themePoint ? { type: "attribute", id: themePoint } : "attribute";
  return source;
}

function buttonPixels(size: ThemoraButtonSize): number {
  if (typeof size === "number") return Math.max(24, size);
  return size === "sm" ? 32 : size === "lg" ? 48 : 40;
}

/** One-line accessible light/dark toggle with animated transitions and Lucide icons. */
export const Themora = forwardRef<HTMLButtonElement, ThemoraProps>(
  function Themora(
    {
      transition = "ripple",
      duration = 500,
      source = "self",
      size = "md",
      themePoint,
      lightTheme = "light",
      darkTheme = "dark",
      manager: supplied,
      managerOptions,
      transitionOptions,
      onClick,
      onTransitionError,
      children,
      disabled,
      style,
      ...buttonProps
    },
    ref,
  ) {
    const manager = useThemoraManager(supplied, managerOptions);
    const [pending, setPending] = useState(false);
    const state = useSyncExternalStore(
      (listener) => manager.subscribe(() => listener()),
      () => manager.resolvedTheme,
      () => manager.resolvedTheme,
    );
    const isDark = state === darkTheme;
    const nextTheme = isDark ? lightTheme : darkTheme;
    const pixels = buttonPixels(size);
    const label = `Switch to ${nextTheme} theme`;
    const handleClick = (event: ReactMouseEvent<HTMLButtonElement>): void => {
      onClick?.(event);
      if (event.defaultPrevented || disabled || pending) return;
      setPending(true);
      void manager
        .transitionTo(nextTheme, {
          ...transitionOptions,
          effect: transition,
          duration: Number(duration),
          origin: sourceOrigin(source, themePoint),
          trigger: event.currentTarget,
        })
        .catch((error: unknown) => onTransitionError?.(error))
        .finally(() => setPending(false));
    };
    const icon = isDark
      ? createElement(Sun, {
          size: Math.round(pixels * 0.5),
          "aria-hidden": true,
        })
      : createElement(Moon, {
          size: Math.round(pixels * 0.5),
          "aria-hidden": true,
        });
    return createElement(
      "button",
      {
        type: "button",
        ...buttonProps,
        ref,
        disabled: disabled || pending,
        onClick: handleClick,
        "aria-label": buttonProps["aria-label"] ?? label,
        "aria-pressed": isDark,
        "data-theme": state,
        "data-themora-toggle": "",
        style: {
          width: pixels,
          height: pixels,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          border: 0,
          borderRadius: "9999px",
          background: "transparent",
          color: "inherit",
          cursor: disabled ? "not-allowed" : "pointer",
          ...style,
        },
      },
      children ?? icon,
    );
  },
);
