'use strict';

// Flat config, self-contained on purpose: no @eslint/js or globals package, so
// eslint stays the only lint devDependency. The rule list is the correctness
// half of eslint:recommended plus a few style rules the codebase already
// follows.

const nodeGlobals = {
  require: 'readonly',
  module: 'writable',
  exports: 'writable',
  process: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly'
};

// lib/eva.js, lib/process-all.js, lib/render-element.js and lib/create-element.js
// run in the browser
const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  DOMParser: 'readonly'
};

const mochaGlobals = {
  describe: 'readonly',
  it: 'readonly',
  before: 'readonly',
  after: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly'
};

const rules = {
  // correctness
  'no-cond-assign': 'error',
  'no-constant-condition': 'error',
  'no-dupe-args': 'error',
  'no-dupe-keys': 'error',
  'no-duplicate-case': 'error',
  'no-empty': 'error',
  'no-fallthrough': 'error',
  'no-func-assign': 'error',
  'no-irregular-whitespace': 'error',
  'no-obj-calls': 'error',
  'no-redeclare': 'error',
  'no-self-assign': 'error',
  'no-sparse-arrays': 'error',
  'no-undef': 'error',
  'no-unreachable': 'error',
  'no-unsafe-negation': 'error',
  'use-isnan': 'error',
  'valid-typeof': 'error',
  // the { skin: _skinName, ...overrides } idiom relies on ignoreRestSiblings
  'no-unused-vars': ['error', {
    args: 'after-used',
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    ignoreRestSiblings: true
  }],
  // style the codebase already follows
  eqeqeq: ['error', 'smart'],
  'no-var': 'error',
  'prefer-const': 'error'
};

module.exports = [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['lib/**/*.js', 'bin/**/*.js', 'skins/**/*.js', 'scripts/**/*.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...nodeGlobals, ...browserGlobals }
    },
    linterOptions: { reportUnusedDisableDirectives: true },
    rules
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...nodeGlobals, ...mochaGlobals }
    },
    linterOptions: { reportUnusedDisableDirectives: true },
    rules
  }
];
