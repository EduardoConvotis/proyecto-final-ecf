// ESLint flat config — frontend. Incluye eslint-plugin-tailwindcss (Principio VIII)
// y prohíbe `any` sin justificación (Principio I).
import tseslint from 'typescript-eslint';
import tailwind from 'eslint-plugin-tailwindcss';

export default tseslint.config(
  {
    files: ['src/**/*.ts'],
    extends: [...tseslint.configs.recommended, ...tailwind.configs['flat/recommended']],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  { ignores: ['dist/', '.angular/', 'src/app/core/api/'] },
);
