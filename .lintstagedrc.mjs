import path from 'path';

const buildEslintCommand = (filenames) =>
  `eslint --fix ${filenames
    .map((f) => path.relative(process.cwd(), f))
    .join(' ')}`;

const buildTestCommand = (filenames) =>
  `vitest run --reporter=verbose ${filenames
    .map((f) => path.relative(process.cwd(), f))
    .join(' ')}`;

export default {
  '*.{js,jsx,ts,tsx}': [buildEslintCommand],
  '**/*.{ts?(x),md,html}': () => 'pnpm prettier',
  '**/*.(unit|test).{j,t}s?(x)': [buildTestCommand],
};
