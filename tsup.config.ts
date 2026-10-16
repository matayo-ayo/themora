import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    react: "src/react.ts",
    vue: "src/vue.ts",
    next: "src/next.ts",
    vanilla: "src/vanilla.ts",
    "effects/index": "src/effects/index.ts",
    "effects/fade": "src/effects/fade.ts",
    "effects/ripple": "src/effects/ripple.ts",
    "effects/wind": "src/effects/wind.ts",
    "effects/waves": "src/effects/waves.ts",
    "effects/noise": "src/effects/noise.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: ["react", "vue", "lucide-react"],
});
