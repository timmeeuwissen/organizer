module.exports = {
  root: true,
  extends: [
    '@nuxtjs/eslint-config-typescript'
  ],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-var-requires': 'warn',
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'off',
    'vue/no-unused-components': 'warn',
    // Style rules — warn rather than error so CI doesn't block on pure style
    'require-await': 'warn',
    'no-return-assign': 'warn',
    'import/order': 'warn',
    'no-lonely-if': 'warn',
    'no-mixed-operators': 'warn',
    'func-call-spacing': 'warn',
    'n/handle-callback-err': 'warn',
    'no-useless-escape': 'warn',
    'no-void': 'warn',
    'brace-style': 'warn'
  },
  ignorePatterns: [
    'node_modules/',
    '.nuxt/',
    '.output/',
    'dist/',
    'coverage/',
    'scripts/'
  ]
}
