/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['./eslint-base.js'],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    'no-console': 'warn',
  },
}
