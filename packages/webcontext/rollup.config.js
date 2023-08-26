import * as path from "path";
import multiEntry from "@rollup/plugin-multi-entry";
import alias from "@rollup/plugin-alias";
import resolve from "@rollup/plugin-node-resolve";
import { terser } from "rollup-plugin-terser";
import gzip from "rollup-plugin-gzip";

export default [
  {
    input: ["dist/index.js", "node_modules/typescene/dist/index.js"],
    output: {
      file: "umd/typescene.min.js",
      format: "umd",
      name: "typescene",
    },
    plugins: [
      multiEntry(),
      resolve(),
      terser({
        ecma: 5,
        module: true,
        keep_classnames: true,
      }),
      gzip(),
    ],
    onwarn: warning => {
      if (warning.code !== "CIRCULAR_DEPENDENCY") {
        console.warn(`- ${warning.message}`);
      }
    },
  },
  {
    input: ["dist-es6/index.js", "node_modules/typescene/dist-es6/index.js"],
    output: {
      file: "umd/typescene.es6.min.js",
      format: "umd",
      name: "typescene",
    },
    plugins: [
      multiEntry(),
      alias({
        entries: [
          {
            find: "typescene",
            replacement: path.resolve(process.cwd(), "node_modules/typescene/dist-es6"),
          },
        ],
      }),
      resolve(),
      terser({
        ecma: 2015,
        module: true,
        keep_classnames: true,
      }),
      gzip(),
    ],
    onwarn: warning => {
      if (warning.code !== "CIRCULAR_DEPENDENCY") {
        console.warn(`- ${warning.message}`);
      }
    },
  },
  {
    input: ["dist-es8/index.js", "node_modules/typescene/dist-es8/index.js"],
    output: {
      file: "umd/typescene.es8.min.js",
      format: "umd",
      name: "typescene",
    },
    plugins: [
      multiEntry(),
      alias({
        entries: [
          {
            find: "typescene",
            replacement: path.resolve(process.cwd(), "node_modules/typescene/dist-es8"),
          },
        ],
      }),
      resolve(),
      terser({
        ecma: 2017,
        module: true,
        keep_classnames: true,
      }),
      gzip(),
    ],
    onwarn: warning => {
      if (warning.code !== "CIRCULAR_DEPENDENCY") {
        console.warn(`- ${warning.message}`);
      }
    },
  },
];
