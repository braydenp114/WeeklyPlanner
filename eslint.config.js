// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // Arrived unannounced via an eslint-config-expo patch bump on 12 Oct, not a deliberate
      // team decision to adopt React Compiler's strict manual-memoization checking. Several
      // pre-existing useCallback hooks omit state setters from their deps, which React
      // guarantees are stable and don't need to be listed — downgraded rather than rewritten
      // so it's visible without blocking CI on code nobody meant to flag.
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
]);
