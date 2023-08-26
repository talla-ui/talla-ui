import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import { terser } from "rollup-plugin-terser";

export default {
  input: "./src/index.ts",
  output: {
    dir: "dist",
    entryFileNames: "docwidget.js",
    format: "iife",
  },
  plugins: [
    resolve(),
    typescript({ tsconfig: "./src/tsconfig.json" }),
    terser({ ecma: 5 }),
  ],
};
