const eslintPluginReact = require('eslint-plugin-react');

module.exports = [
  {
    "files": ["src/**/*.js"],
    "rules": {
      "semi": "error",
      "prefer-const": "warn",
      "no-undef": "error"
    },
    "languageOptions": {
      "globals": {
        "require": "readable",
        "module": "readable",
        "console": "readable",
        "alert": "readable",
        "document": "readable",
        "window": "readable",
        "browser": "readable",
        "fetch": "readable"
      }
    },
    "plugins": {
      "react": eslintPluginReact
    }
  }
];
