import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import { typescript } from "@typescript-eslint/eslint-plugin";

// Remove the react-refresh import since it's causing issues
// Fix for Vercel build error - Updated package import

export default [
  { ignores: ["dist"] },
  js.configs.recommended,
  ...typescript.configs.recommended,
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
