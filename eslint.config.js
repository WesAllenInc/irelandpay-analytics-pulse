import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslintPlugin from "@typescript-eslint/eslint-plugin";

// Fix for Vercel build error - Import as CommonJS module
// @typescript-eslint/eslint-plugin is a CommonJS module that doesn't support named exports

export default [
  { ignores: ["dist"] },
  js.configs.recommended,
  // Fix for tseslintPlugin.configs.recommended not being iterable
  tseslintPlugin.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      // Remove the react-refresh plugin
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Remove the react-refresh rule
      "@typescript-eslint/no-unused-vars": "off",
    },
  }
];
