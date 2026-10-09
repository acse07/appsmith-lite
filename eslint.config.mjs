import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
export default ts.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      'next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  hooks.configs.flat.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { 'react-hooks/set-state-in-effect': 'off', 'react-hooks/refs': 'off' },
  },
);
