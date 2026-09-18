/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    // Each workspace package will override this in its own .eslintrc
    // or we reference the nearest tsconfig from each file's location.
    tsconfigRootDir: __dirname,
    project: true, // auto-detect tsconfig.json in each package
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:prettier/recommended',
  ],
  rules: {
    // Prettier integration
    'prettier/prettier': ['error', { endOfLine: 'auto' }],

    // TypeScript
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',

    // General
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-debugger': 'error',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.next/',
    'coverage/',
    '**/generated/',
    '*.js',
    '*.cjs',
    '*.mjs',
  ],
  overrides: [
    {
      // Allow console and relaxed checks in scripts, seeders, and tests
      files: [
        '**/server.ts',
        '**/config/**/*.ts',
        '**/prisma/seed.ts',
        '**/tests/**/*.ts',
        '**/*.test.ts',
      ],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
