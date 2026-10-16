/** Next.js uses the React adapter. This entry adds an SSR-safe theme boot script. */
export {
  Themora,
  ThemeProvider,
  useChangeOnVisit,
  useSectionTheme,
  useTheme,
  useThemeManager,
  useThemeTransition,
} from "./react.js";
export type {
  ThemoraButtonSize,
  ThemoraProps,
  ThemoraSource,
} from "./react.js";

export interface ThemeBootScriptOptions {
  storageKey?: string;
  attribute?: string;
  defaultTheme?: "light" | "dark" | "system";
}

/** Return inline JavaScript for Next's beforeInteractive Script component. */
export function getThemeBootScript(
  options: ThemeBootScriptOptions = {},
): string {
  const storageKey = JSON.stringify(options.storageKey ?? "themora-theme");
  const attribute = JSON.stringify(options.attribute ?? "data-theme");
  const fallback = JSON.stringify(options.defaultTheme ?? "system");
  return `(()=>{try{const k=${storageKey},a=${attribute};let t=localStorage.getItem(k)||${fallback};if(t==='system')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute(a,t)}catch(_){}})()`;
}
