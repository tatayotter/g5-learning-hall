import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Capacitor/Gradle output (copies of the web build).
    "android/**",
    // Tiled tileset files use a .tsx extension but are XML, not TypeScript.
    "public/**/*.tsx",
    // Other sessions' git worktrees live here; each lints itself.
    ".claude/**",
  ]),
  {
    rules: {
      // Sprites, pixel art and animated webp render as plain <img> on purpose;
      // next/image resamples and wraps them, which blurs and breaks layout.
      "@next/next/no-img-element": "off",
      // `_`-prefixed names are deliberately unused (e.g. omitting a key via rest).
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
        ignoreRestSiblings: true,
      }],
      // React Compiler compatibility rules. The compiler isn't enabled
      // (next.config has no reactCompiler), and most hits are deliberate
      // patterns: latest-value refs assigned during render, reading
      // window/isNativeApp() after mount, effects calling handlers declared
      // further down. Kept visible as warnings; promote back to errors if the
      // compiler is ever turned on.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    // Plain Node CommonJS scripts.
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
