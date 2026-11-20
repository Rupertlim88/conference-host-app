import js from "@eslint/js";
import { globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import pluginReactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import pluginNext from "@next/eslint-plugin-next";
import { config as baseConfig } from "./base.js";

const DATA_ONLY_THROUGH_BACKEND = "UIs reach data only through @repo/host-backend.";

/**
 * A custom ESLint configuration for libraries that use Next.js.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const nextJsConfig = [
  ...baseConfig,
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
      },
    },
  },
  {
    plugins: {
      "@next/next": pluginNext,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,
    },
  },
  pluginReactHooks.configs.flat.recommended,
  {
    rules: {
      // A host UI reaches data only through @repo/host-backend. Turborepo's boundaries are
      // transitive, so they let an app import the store; these rules stop it.
      // Severity "error" is downgraded to a warning by eslint-plugin-only-warn,
      // so these guards fail a lint run only via each package's --max-warnings 0.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@repo/host-store", message: DATA_ONLY_THROUGH_BACKEND },
            { name: "drizzle-orm", message: DATA_ONLY_THROUGH_BACKEND },
            { name: "postgres", message: DATA_ONLY_THROUGH_BACKEND },
            {
              name: "next/font/google",
              message: "Fonts are kept in the repository: use next/font/local, so builds never download them.",
            },
          ],
          patterns: [
            { group: ["drizzle-orm/*", "@repo/host-store/*"], message: DATA_ONLY_THROUGH_BACKEND },
          ],
        },
      ],
      // no-restricted-imports ignores dynamic import(); this covers it.
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportExpression > Literal[value=/^(drizzle-orm|postgres|@repo\\/host-store)(\\/|$)/]",
          message: DATA_ONLY_THROUGH_BACKEND,
        },
      ],
      // no-restricted-imports only sees ESM; this covers `require(...)` too.
      "no-restricted-modules": [
        "error",
        {
          paths: ["@repo/host-store", "drizzle-orm", "postgres"].map((name) => ({ name, message: DATA_ONLY_THROUGH_BACKEND })),
          patterns: ["drizzle-orm/*", "@repo/host-store/*"],
        },
      ],
    },
  },
];
