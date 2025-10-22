import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

// Sanitize globals to remove keys with leading/trailing whitespace
const sanitizedBrowserGlobals = Object.fromEntries(
  Object.entries(globals.browser).filter(([key]) => key.trim() === key)
);

export default [
  { ignores: ['dist', '../payroll-backend/**', '../Biometric_connect/**', '**/.venv/**', '**/*.cjs'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...sanitizedBrowserGlobals,
        logger: 'readonly', // Add logger as a known global
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  // Backend files override (Node.js environment)
  {
    files: ['payroll-backend/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.node,
        logger: 'readonly',
      },
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
]
