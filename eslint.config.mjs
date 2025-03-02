import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import nextPlugin from "eslint-config-next"; // Next.js ESLint config

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Apply the configuration to specific file types
  {
    files: ["**/*.{js,mjs,cjs,jsx}"], // Only include JavaScript and JSX files
  },

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
  nextPlugin, // Next.js ESLint config

  // Apply recommended rules from the React plugin
  {
    ...pluginReact.configs.recommended,
    settings: {
      react: {
        version: "detect", // Automatically detect React version
      },
    },
  },

  // Add custom rules
  {
    rules: {
      "no-console": "off", // Disable the no-console rule
      "react/react-in-jsx-scope": "off", // Disable react-in-jsx-scope (not needed with React 17+)
      "react/prop-types": "off", // Disable prop-types (optional, if you're not using prop-types)
    },
  },
];
