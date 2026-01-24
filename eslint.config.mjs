import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import prettierPlugin from "eslint-plugin-prettier";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

// Begins exporting a ESLint config object
export default [
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**", "next-env.d.ts"],
  },
  {
    files: ["**/*.{ts,tsx}"], // Targets all ts and tsx files in the repo for linting

    languageOptions: {
      parser: tsparser, // We use the TypeScript parser so ESLint understands TS Syntas
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",

        project: "./tsconfig.json", // Tell ESLint to use your tsconfig so it can do type aware linting
        tsconfigRootDir: import.meta.dirname,
      },
    },

    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
      },
    },

    plugins: {
      "@typescript-eslint": tseslint,
      import: importPlugin,
      prettier: prettierPlugin,
      "react-hooks": reactHooksPlugin,
      "@next/next": nextPlugin,
    },

    rules: {
      // Naming convention rules
      "@typescript-eslint/naming-convention": [
        "error",

        // Supabase-generated export uses PascalCase: `export const Constants = ...`
        {
          selector: "variable",
          modifiers: ["exported", "const"],
          filter: { regex: "^Constants$", match: true },
          format: ["PascalCase"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow",
        },

        // UPPER_CASE constants (must come before regular variables rule)
        // Matches any const variable that is all uppercase with underscores
        {
          selector: "variable",
          modifiers: ["const"],
          format: ["UPPER_CASE"],
          filter: {
            regex: "^[A-Z][A-Z0-9_]*$",
            match: true,
          },
        },

        // Regular variables (this will now only catch non-UPPER_CASE variables)
        {
          selector: "variable",
          format: ["camelCase"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow",
        },

        // React Components (functions starting with a capital letter)
        {
          selector: "function",
          format: ["camelCase", "PascalCase"],
          filter: {
            regex: "^[A-Z]",
            match: true,
          },
        },

        // Classes / Interfaces / Types / Enums (PascalCase)
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },

        // Enum members → UPPER_CASE (industry standard)
        {
          selector: "enumMember",
          format: ["UPPER_CASE"],
        },

        // Functions (non-component)
        {
          selector: "function",
          format: ["camelCase"],
        },

        // Object properties (don't enforce — avoid breaking API responses)
        {
          selector: "property",
          format: null,
        },
      ],

      // Unused Variables Detection
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Prevent Incorrect Imports
      "import/no-unresolved": "error",
      "import/named": "error",
      "import/default": "error",
      "import/no-named-as-default": "warn",

      // Enforce import ordering (cleaner diffs & dev experience)
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
        },
      ],

      // Strong TypeScript Safety
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/require-await": "error",

      // Security Hardening Rules
      "no-eval": "error",
      "no-implied-eval": "error",
      "@typescript-eslint/no-implied-eval": "error",

      // Avoid accidental leaks/logging of secrets
      "no-console": ["warn", { allow: ["info", "warn", "error"] }],

      // Clean-Code & Logic Safety
      eqeqeq: ["error", "always"],
      "no-return-await": "error",
      curly: ["error", "all"],
      "no-shadow": "off",
      "@typescript-eslint/no-shadow": "error",

      // Prettier Integration (Prevents conflicts)
      "prettier/prettier": "error",
    },
  },
];
