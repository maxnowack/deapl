module.exports = {
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    allowImportExportEverywhere: true,
  },
  plugins: [
    'prefer-object-spread',
    '@typescript-eslint',
    'sort-class-members',
  ],
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
      },
      node: {
        extensions: ['.js', '.ts', '.json'],
      },
    },
    'import/extensions': [
      '.ts',
    ],
  },
  rules: {
    /*
     * Typescript
     */
    'import/extensions': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/unbound-method': 'off',
    '@typescript-eslint/member-delimiter-style': ['error', {
      multiline: {
        delimiter: 'comma',
        requireLast: true,
      },
      singleline: {
        delimiter: 'comma',
        requireLast: false,
      },
    }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {
      vars: 'all',
      args: 'after-used',
      ignoreRestSiblings: true,
    }],
    /*
     * Airbnb
     */
    // Overrides
    'arrow-parens': ['error', 'as-needed', { requireForBlockBody: true }],
    'func-names': 'error', // Changed from 'warn' to 'error'.
    'import/no-absolute-path': 'off', // Turned off because we use absolute paths instead of '../'.
    'implicit-arrow-linebreak': 'off', // Turned of because of bullshit
    'no-alert': 'error', // Changed from 'warn' to 'error'.
    'no-console': 'off', // Changed from 'warn' to 'error'.
    'no-constant-condition': 'error', // Changed from 'warn' to 'error'.
    'no-underscore-dangle': ['error', { // Make some exceptions for often used fields
      allow: [
        '_id',
        '_aggregated',
        '_details',
      ],
    }],
    semi: ['error', 'never'], // Changed from 'always' to 'never', because we never use semicolons.
    // Additions
    'no-warning-comments': 'warn',
    'import/order': ['error', {
      groups: [
        'internal',
        'builtin',
        'external',
        'parent',
        'sibling',
        'index',
      ],
      'newlines-between': 'never',
    }],
    /*
     * Extentions
     */
    'no-use-before-define': ['error', { functions: false }],
    'object-curly-newline': 'off',
    'max-len': [
      2,
      {
        code: 100,
        ignoreComments: true,
        ignoreStrings: true,
        ignoreUrls: true,
        ignoreTemplateLiterals: true,
        ignorePattern: "mf\\s*\\(\\s*(['\"])(.*?)\\1\\s*,\\s*.*?\\s*,?\\s*(['\"])(.*?)\\3,?.*?\\)",
      },
    ],
    'prefer-object-spread/prefer-object-spread': 'error',
    'sort-class-members/sort-class-members': ['error', {
      accessorPairPositioning: 'getThenSet',
      order: [
        'displayName',
        'propTypes',
        'contextTypes',
        'childContextTypes',
        'mixins',
        'statics',
        'defaultProps',
        'state',
        '[static-properties]',
        '[static-methods]',
        '[properties]',
        '[conventional-private-properties]',
        'constructor',
        'componentWillMount',
        'UNSAFE_componentWillMount',
        'componentDidMount',
        'componentWillReceiveProps',
        'UNSAFE_componentWillReceiveProps',
        'shouldComponentUpdate',
        'componentWillUpdate',
        'UNSAFE_componentWillUpdate',
        'componentDidUpdate',
        'componentWillUnmount',
        '/^get(?!(InitialState$|DefaultProps$|ChildContext$)).+$/',
        '[getters]',
        '/^set(?!(InitialState$|DefaultProps$|ChildContext$)).+$/',
        '[setters]',
        '/^handle.+$/',
        '/^on.+$/',
        '[methods]',
        '[conventional-private-methods]',
        '[everything-else]',
        '/^render.+$/',
        'render',
      ],
      stopAfterFirstProblem: false,
    }],
    'object-shorthand': ['error', 'always'],
  },
}
