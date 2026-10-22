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
      // A Supabase query is lazy: it only runs once something awaits it or calls
      // .then(). A bare `supabase.rpc(...)` statement never reaches the server, which
      // silently left the trash counters and saved map position at zero for months.
      "no-restricted-syntax": ["error", ...[
        "ExpressionStatement > CallExpression",
        "ExpressionStatement > UnaryExpression[operator='void'] > CallExpression",
      ].map(prefix => ({
        selector: `${prefix}[callee.type='MemberExpression'][callee.property.name=/^(rpc|from|select|insert|update|upsert|eq|neq|in|is|match|order|limit|range|single|maybeSingle)$/]:has(Identifier[name='supabase'])`,
        message: "This Supabase query never runs: await it or add .then(...).",
      }))],
    },
  },
  {
    // Plain Node CommonJS scripts.
    files: ["scripts/**/*.js", "**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
