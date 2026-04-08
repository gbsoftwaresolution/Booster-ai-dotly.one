/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    './eslint-base.js',
    'next/core-web-vitals',
  ],
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
}
