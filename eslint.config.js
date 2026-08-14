import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import pluginPrettier from 'eslint-plugin-prettier'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'mock-server/**', 'scripts/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  prettier,
  {
    files: ['**/*.{ts,tsx,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
      },
    },
    plugins: {
      prettier: pluginPrettier,
    },
    rules: {
      // 显式传入选项，避免 monorepo 下 IDE 工作目录不同导致读到默认 printWidth:80
      'prettier/prettier': [
        'warn',
        {
          semi: false,
          singleQuote: true,
          trailingComma: 'all',
          printWidth: 180,
          endOfLine: 'lf',
        },
      ],
      'vue/multi-word-component-names': 'off',
      // TS 可选 props 默认为 undefined，不必强制 withDefaults
      'vue/require-default-prop': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
)
