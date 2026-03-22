import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "adapters/indexeddb": "src/adapters/indexeddb.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["better-auth", "nanostores", "@better-fetch/fetch"],
});
