import { createRequire } from "node:module";

const esm = await import("themora");
const effects = await import("themora/effects");
const ripple = await import("themora/effects/ripple");
const react = await import("themora/react");
const vue = await import("themora/vue");
const next = await import("themora/next");
const vanilla = await import("themora/vanilla");
const require = createRequire(import.meta.url);
const cjs = require("themora");
const cjsEffects = require("themora/effects");
const cjsRipple = require("themora/effects/ripple");
const cjsReact = require("themora/react");
const cjsVue = require("themora/vue");
const cjsNext = require("themora/next");
const cjsVanilla = require("themora/vanilla");

for (const [name, value] of Object.entries({
  createThemeManager: esm.createThemeManager,
  cjsCreateThemeManager: cjs.createThemeManager,
  rippleEffect: effects.rippleEffect,
  cjsRippleEffect: cjsEffects.rippleEffect,
  directRippleEffect: ripple.rippleEffect,
  cjsDirectRippleEffect: cjsRipple.rippleEffect,
  ThemeProvider: react.ThemeProvider,
  cjsThemeProvider: cjsReact.ThemeProvider,
  useTheme: vue.useTheme,
  cjsUseTheme: cjsVue.useTheme,
  getThemeBootScript: next.getThemeBootScript,
  cjsGetThemeBootScript: cjsNext.getThemeBootScript,
  createThemora: vanilla.createThemora,
  cjsCreateThemora: cjsVanilla.createThemora,
})) {
  if (typeof value !== "function")
    throw new Error(`Missing function export: ${name}`);
}
if (!react.Themora || !cjsReact.Themora)
  throw new Error("Missing Themora React component export.");
console.log("Verified ESM and CommonJS package entry points.");
