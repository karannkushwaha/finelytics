import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import nextPlugin from "eslint-config-next"; // Add Next.js plugin

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Apply the configuration to specific file types
  { files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"] }, // Added .ts and .tsx for Next.js

  // Define global variables for both browser and Node.js environments
  {
    languageOptions: {
      globals: {
        ...globals.browser, // Browser globals (e.g., `window`, `document`)
        ...globals.node, // Node.js globals (e.g., `process`)
      },
    },
  },

  // Apply recommended rules from the core ESLint plugin
  pluginJs.configs.recommended,

  // Apply Next.js recommended rules
  nextPlugin, // Add this line

  // Apply recommended rules from the React plugin
  {
    ...pluginReact.configs.flat.recommended,
    settings: {
      react: {
        version: "19.0", // Specify React 19 (or "detect")
      },
    },
  },

  // Add custom rules
  {
    rules: {
      "no-console": "off", // Disable the no-console rule
      "react/react-in-jsx-scope": "off", // Disable react-in-jsx-scope (not needed with React 19 + Next.js)
    },
  },
];
