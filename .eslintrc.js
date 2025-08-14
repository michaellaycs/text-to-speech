module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  plugins: [
    '@typescript-eslint'
  ],
  rules: {
    // TypeScript specific
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    
    // General
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off'
  },
  ignorePatterns: [
    'dist/',
    'build/',
    'node_modules/',
    'coverage/',
    '*.js' // Ignore JS files in favor of TS
  ],
  overrides: [
    // Frontend specific rules
    {
      files: ['apps/web/**/*.{ts,tsx}'],
      extends: [
        'plugin:react-hooks/recommended',
        'plugin:react-refresh/recommended'
      ],
      env: {
        browser: true,
        node: false
      },
      rules: {
        'react-hooks/exhaustive-deps': 'warn',
        'react-refresh/only-export-components': 'warn'
      }
    },
    // Backend specific rules
    {
      files: ['apps/api/**/*.ts'],
      env: {
        node: true,
        browser: false
      },
      rules: {
        'no-console': 'off' // Allow console in backend for logging
      }
    },
    // Test files
    {
      files: ['**/*.test.{ts,tsx}', '**/tests/**/*.{ts,tsx}'],
      env: {
        jest: true
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off'
      }
    }
  ]
};