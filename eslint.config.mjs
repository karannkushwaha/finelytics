import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Apply the configuration to specific file types
  { files: ["**/*.{js,mjs,cjs,jsx}"] },

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

  // Apply recommended rules from the React plugin
  pluginReact.configs.flat.recommended,

  // Add custom rules
  {
    rules: {
      "no-console": "off", // Disable the no-console rule
      "react/react-in-jsx-scope": "off",
    },
  },
];
