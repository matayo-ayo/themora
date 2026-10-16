# Themora
_"Change with Style"_

Themora adds ripple, fade, wind, wave, and analog TV static transitions to your themes. It works with React, Next.js, Vue, Angular, or plain JavaScript. It remembers the selected theme, follows the system preference, and respects reduced-motion settings.

## Install

```bash
npm install themora
```

## The quickest React setup

Add the toggle anywhere in your app:

```tsx
import { Themora } from "themora/react";

export function ThemeToggle() {
  return <Themora transition="ripple" duration={600} source="self" size="md" />;
}
```

That is enough to get a working, accessible light/dark button. Themora displays Lucide Moon and Sun icons, remembers the choice in `localStorage`, and starts the ripple from the button.

Themora sets `data-theme="light"` or `data-theme="dark"` on the document. Your CSS decides what those themes look like:

```css
:root {
  --page: #ffffff;
  --text: #171717;
  --accent: #6d5dfc;
}

:root[data-theme="dark"] {
  --page: #11131a;
  --text: #f7f7fb;
  --accent: #a99cff;
}

body {
  margin: 0;
  background: var(--page);
  color: var(--text);
}
```

You do not need a provider for this basic setup.

### Toggle options

| Prop         | What it does                                | Examples                                             |
| ------------ | ------------------------------------------- | ---------------------------------------------------- |
| `transition` | Chooses the animation                       | `"ripple"`, `"fade"`, `"wind"`, `"waves"`, `"noise"` |
| `duration`   | Sets the animation time in milliseconds     | `600`                                                |
| `source`     | Chooses where the animation begins          | `"self"`, `"tag"`, `"center"`, `"cursor"`            |
| `size`       | Sets the square button size                 | `"sm"`, `"md"`, `"lg"`, or `44`                      |
| `lightTheme` | Changes the light theme name                | `"day"`                                              |
| `darkTheme`  | Changes the dark theme name                 | `"night"`                                            |
| `themePoint` | Selects a marked origin when `source="tag"` | `"hero"`                                             |

All normal button props also work, including `className`, `style`, `title`, and `aria-label`. Pass children if you want to replace the default icons:

```tsx
<Themora transition="fade">Change theme</Themora>
```

## Choosing where an animation starts

Use `source="self"` to start from the toggle itself:

```tsx
<Themora transition="ripple" source="self" />
```

Use `source="center"` for a transition that begins in the middle of the page:

```tsx
<Themora transition="waves" source="center" />
```

Use `source="cursor"` to begin from the visitor's latest pointer position:

```tsx
<Themora transition="noise" source="cursor" />
```

Use `source="tag"` when the animation should begin from another element:

```tsx
<div data-theme-point="hero">Your hero content</div>

<Themora
  transition="ripple"
  source="tag"
  themePoint="hero"
  duration={700}
/>
```

`data-theme-point` is recommended. The older `themePoint` HTML attribute is supported too.

## Custom themes in React

Use `ThemeProvider` when you want custom theme tokens, shared state, or more than one theme control.

```tsx
import { ThemeProvider, Themora } from "themora/react";

const themes = [
  {
    name: "light",
    colorScheme: "light" as const,
    tokens: {
      page: "#ffffff",
      text: "#171717",
      accent: "#6657e8",
    },
  },
  {
    name: "dark",
    colorScheme: "dark" as const,
    tokens: {
      page: "#11131a",
      text: "#f7f7fb",
      accent: "#aa9cff",
    },
  },
];

export function App({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider options={{ defaultTheme: "system", themes }}>
      <Themora transition="ripple" source="self" />
      {children}
    </ThemeProvider>
  );
}
```

Theme tokens become CSS custom properties. The `page` token becomes `--page`, while a token already named `--page` stays unchanged.

```css
body {
  background: var(--page);
  color: var(--text);
}
```

For custom controls, use the hooks directly:

```tsx
import { useTheme, useThemeTransition } from "themora/react";

function CustomToggle() {
  const { resolved } = useTheme();
  const transitionTo = useThemeTransition();

  return (
    <button
      onClick={(event) =>
        void transitionTo(resolved === "dark" ? "light" : "dark", {
          effect: "ripple",
          duration: 600,
          origin: "trigger",
          trigger: event,
        })
      }
    >
      Current theme: {resolved}
    </button>
  );
}
```

The React adapter exports `ThemeProvider`, `Themora`, `useTheme`, `useThemeManager`, `useThemeTransition`, `useSectionTheme`, and `useChangeOnVisit`.

## Next.js

Render `Themora` from a client component:

```tsx
"use client";

import { Themora } from "themora/next";

export function ThemeToggle() {
  return <Themora transition="ripple" source="self" />;
}
```

To apply the saved theme before hydration, add the boot script near the root of the app:

```tsx
import Script from "next/script";
import { getThemeBootScript } from "themora/next";

<Script id="themora-theme" strategy="beforeInteractive">
  {getThemeBootScript()}
</Script>;
```

This helps prevent the wrong theme from flashing during the first page load.

## Plain JavaScript

```js
import { createThemora } from "themora";

const theme = createThemora({
  defaultTheme: "system",
  themes: [
    {
      name: "light",
      colorScheme: "light",
      tokens: { page: "#fff", text: "#171717" },
    },
    {
      name: "dark",
      colorScheme: "dark",
      tokens: { page: "#11131a", text: "#f7f7fb" },
    },
  ],
});

document.querySelector("#theme-toggle").addEventListener("click", (event) => {
  const next = theme.resolvedTheme === "dark" ? "light" : "dark";

  void theme.transitionTo(next, {
    effect: "ripple",
    duration: 600,
    origin: "trigger",
    trigger: event,
  });
});
```

CommonJS is supported as well:

```js
const { createThemora } = require("themora");
```

## Built-in transitions

### Fade

```ts
await theme.transitionTo("dark", {
  effect: "fade",
  duration: 350,
});
```

### Ripple

```ts
await theme.transitionTo("dark", {
  effect: "ripple",
  duration: 650,
  origin: "cursor",
});
```

### Wind

```ts
await theme.transitionTo("dark", {
  effect: "wind",
  direction: "right",
  windDensity: 12,
  stagger: 18,
});
```

Directions are `left`, `right`, `top`, and `bottom`.

### Waves

```ts
await theme.transitionTo("dark", {
  effect: "waves",
  direction: "right",
  amplitude: 30,
  wavelength: 110,
  frequency: 1,
});
```

### Analog TV static

Classic static hides the theme change behind television snow:

```ts
await theme.transitionTo("dark", {
  effect: "noise",
  revealStyle: "classic",
  duration: 900,
  intensity: 0.85,
  grainSize: 2,
  scanlines: true,
  interference: true,
});
```

Static reveal spreads from an origin:

```ts
await theme.transitionTo("dark", {
  effect: "noise",
  revealStyle: "reveal",
  origin: "cursor",
  spread: 55,
});
```

Sound is always off unless you set `sound: true`. Browsers still require the transition to begin from an active user gesture before audio can play.

All transitions accept `duration`, `speed`, `delay`, and `easing`. A newer transition safely cancels an older transition on the same target.

## Theme only one section

Global theme changes are not always what you want. A scope lets one part of the page use its own theme:

```ts
const sidebar = theme.createScope("#sidebar", "dark");

await sidebar.transitionTo("aurora", {
  effect: "waves",
  duration: 700,
});
```

The global page theme does not change. CSS variables from the scoped theme are inherited only by that section's descendants.

## Change a section when it enters the viewport

`changeOnVisit` watches a section and themes only that section:

```ts
const stopWatching = theme.changeOnVisit({
  element: "#pricing",
  theme: "dark",
  threshold: 0.35,
  transition: {
    effect: "wind",
    direction: "right",
    duration: 500,
  },
  reverseOnExit: true,
  restoreOriginal: true,
});

// Call this when the section no longer needs to be watched.
stopWatching();
```

You can watch several sections at once. Their themes remain independent, including nested sections. Selector targets added later are detected automatically.

## Vue

```ts
import { createThemeManager } from "themora";
import { useTheme, useThemeTransition } from "themora/vue";

const manager = createThemeManager({ defaultTheme: "system" });
const { selected, resolved, toggle } = useTheme(manager);
const transitionTo = useThemeTransition(manager);
```

The Vue adapter also exports `useSectionTheme` and `useChangeOnVisit`. Subscriptions and observers are cleaned up with the component lifecycle.

## Angular

Themora does not require an Angular adapter. Create one `ThemeManager` in a service and call its methods from your components:

```ts
import { Injectable } from "@angular/core";
import { createThemeManager } from "themora";

@Injectable({ providedIn: "root" })
export class ThemeService {
  readonly manager = createThemeManager({ defaultTheme: "system" });

  set(theme: "light" | "dark") {
    return this.manager.transitionTo(theme, { effect: "ripple" });
  }
}
```

## Registering and changing themes

```ts
theme.registerTheme({
  name: "aurora",
  colorScheme: "dark",
  tokens: {
    page: "#08251f",
    text: "#eafff8",
    accent: "#49e3ad",
  },
});

theme.updateTheme("aurora", {
  page: "#061f1b",
  text: "#ffffff",
  accent: "#5ff0bd",
});

console.log(theme.listThemes());
theme.removeTheme("aurora");
```

`light` and `dark` are built in and cannot be removed. `system` is a preference that resolves to one of them.

## Creating a custom effect

```ts
theme.registerEffect("flash", ({ target, applyTheme }) => {
  applyTheme();

  const animation = target.animate(
    [{ filter: "brightness(1.4)" }, { filter: "brightness(1)" }],
    { duration: 180 },
  );

  return {
    finished: animation.finished.catch(() => undefined),
    cancel: () => animation.cancel(),
  };
});
```

Built-in effects can be imported individually:

```ts
import { rippleEffect } from "themora/effects/ripple";
```

## Useful manager methods

```ts
theme.setTheme("light");
theme.getSelectedTheme();
theme.getResolvedTheme();
theme.toggle(["light", "dark"]);
theme.getTheme("dark");
theme.listThemes();

const unsubscribe = theme.subscribe((event) => {
  console.log(event.selected, event.resolved);
});

const stopLifecycleEvents = theme.onTransition((event) => {
  console.log(event.phase);
});

unsubscribe();
stopLifecycleEvents();
theme.destroy();
```

The selected theme can remain `system`; the resolved theme is the actual `light` or `dark` theme currently shown.

## Accessibility and browser support

Themora respects `prefers-reduced-motion`. When reduced motion is enabled, it applies the new theme without the full animation. Transitions do not move focus, block pointer input, or announce unnecessary content to screen readers.

Theme changes work in current Chromium, Firefox, and Safari. The animation may look simpler when a browser does not support an advanced visual API, but the selected theme will still be applied.

## Troubleshooting

**The button changes but the page colors do not.**  
Add CSS for `[data-theme="dark"]`, or register themes with CSS tokens and use those variables in your styles.

**The transition happens immediately.**  
The operating system may have reduced motion enabled. Also check that the target has visible dimensions and that `duration` is greater than zero.

**A tagged origin starts from the center.**  
Make sure the value in `themePoint="hero"` matches `data-theme-point="hero"` exactly.

**The theme flashes during Next.js hydration.**  
Add `getThemeBootScript()` with Next's `beforeInteractive` script strategy.

**Storage does not work in a private browser context.**  
Themora continues working in memory when `localStorage` is unavailable, but the choice cannot persist across reloads.
