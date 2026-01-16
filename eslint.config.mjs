import js from '@eslint/js';
import next from '@next/eslint-plugin-next';
import globals from 'globals';

/**
 * ESLint Flat Config for Next.js (App Router) + TypeScript
 *
 * Notes:
 * - Next's recommended rules come from @next/eslint-plugin-next
 * - TypeScript-specific rules are handled by TypeScript tooling; this config keeps ESLint focused.
 */
export default [
  // Base JS recommended rules
  js.configs.recommended,

  // Next.js recommended + core web vitals rules
  {
    name: 'next/recommended',
    plugins: {
      '@next/next': next,
    },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
    },
  },

  // Project-wide language options
  {
    name: 'project/language-options',
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // Ignore generated output
  {
    name: 'project/ignores',
    ignores: ['.next/**', 'out/**', 'dist/**', 'node_modules/**'],
  },
];