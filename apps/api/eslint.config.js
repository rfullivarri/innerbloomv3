import tseslint from '@typescript-eslint/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  ...tseslint.configs['flat/recommended'],
  ...tseslint.configs['flat/stylistic'],
  eslintConfigPrettier,
  {
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
];
