module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['frontend/**/*.{ts,tsx,js,jsx}'],
      env: { browser: true, node: false },
    },
    {
      files: ['backend/**/*.{ts,js}'],
      env: { node: true, browser: false },
    }
  ]
}
