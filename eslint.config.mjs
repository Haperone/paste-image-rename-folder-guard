import tseslint from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default [
  { ignores: ['node_modules/**', 'main.js', 'dist/**', '.test-build/**', 'tests/**', '**/*.mjs', 'package*.json', 'tsconfig.json', 'versions.json'] },
  ...tseslint.configs.recommendedTypeChecked.map(config => ({ ...config, files: ['src/**/*.ts'] })),
  ...obsidianmd.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: { parserOptions: { project: './tsconfig.json', tsconfigRootDir: import.meta.dirname } },
    rules: { 'no-console': ['error', { allow: ['error', 'warn'] }] }
  }
];
