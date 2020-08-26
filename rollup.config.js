import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "lib/index.ts",
  output: {
    dir: "dist",
    format: "cjs",
  },
  plugins: [commonjs(), typescript(), resolve()],
};
