import { createThemora } from "../dist/index.js";

const themes = [
  {
    name: "light",
    colorScheme: "light",
    tokens: {
      background: "#f4f5fb",
      surface: "#ffffff",
      foreground: "#171828",
      muted: "#65677b",
      accent: "#6957e8",
      line: "#dedfed",
    },
  },
  {
    name: "dark",
    colorScheme: "dark",
    tokens: {
      background: "#11121b",
      surface: "#1b1c29",
      foreground: "#f4f4fc",
      muted: "#a6a7b6",
      accent: "#a996ff",
      line: "#313343",
    },
  },
  {
    name: "aurora",
    colorScheme: "dark",
    tokens: {
      background: "#062b2a",
      surface: "#0c3a37",
      foreground: "#e6fffa",
      muted: "#a8d6ce",
      accent: "#5ff0bd",
      line: "#22655c",
    },
  },
  {
    name: "sunset",
    colorScheme: "dark",
    tokens: {
      background: "#31152c",
      surface: "#49203d",
      foreground: "#fff2e9",
      muted: "#e9bdc8",
      accent: "#ff9b59",
      line: "#75405d",
    },
  },
];

const theme = createThemora({
  themes,
  defaultTheme: "system",
  transition: { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)" },
});
const selectTheme = document.querySelector("#theme");
const selectEffect = document.querySelector("#effect");
const selectOrigin = document.querySelector("#origin");
const duration = document.querySelector("#duration");
const durationValue = document.querySelector("#duration-value");
const readout = document.querySelector("#theme-readout");

duration.addEventListener("input", () => {
  durationValue.textContent = `${duration.value}ms`;
});
theme.subscribe(({ resolved }) => {
  readout.textContent = resolved;
  selectTheme.value = resolved;
});

document
  .querySelector("#transform")
  .addEventListener("click", async (event) => {
    const effect = selectEffect.value;
    const options = {
      effect,
      origin: selectOrigin.value,
      trigger: event,
      duration: Number(duration.value),
      direction: "right",
      amplitude: 30,
      wavelength: 105,
      windDensity: 12,
      intensity: 0.9,
      revealStyle: "classic",
    };
    await theme.transitionTo(selectTheme.value, options);
  });
document.querySelector("#noise-reveal").addEventListener("click", (event) =>
  theme.transitionTo(selectTheme.value, {
    effect: "noise",
    revealStyle: "reveal",
    origin: "trigger",
    trigger: event,
    duration: Number(duration.value),
    scanlines: true,
    interference: true,
  }),
);

theme.changeOnVisit({
  element: "#visit-dark",
  theme: "dark",
  threshold: 0.45,
  reverseOnExit: true,
  restoreOriginal: true,
  transition: { effect: "wind", direction: "right", duration: 550 },
});
theme.changeOnVisit({
  element: "#visit-aurora",
  theme: "aurora",
  threshold: 0.45,
  reverseOnExit: true,
  restoreOriginal: true,
  transition: { effect: "waves", duration: 700, amplitude: 32 },
});
