/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin';

export default defineConfig({
  optimizeDeps: {
    include: [
      // Stitch packages are excluded from optimizeDeps by the StyleX unplugin
      // (so their uncompiled StyleX code reaches the Babel transform). But their
      // peer deps still need pre-bundling so Vite can serve them as ESM and
      // convert any CJS transitive deps. The `>` syntax tells Vite to pre-bundle
      // these even though their parent is excluded.
      '@bonterratech/stitch-extension > react-aria-components',
      '@bonterratech/stitch-extension > react-aria',
      '@bonterratech/stitch-extension > react-stately',
      '@bonterratech/stitch-extension > @react-aria/form',
      '@bonterratech/stitch-extension > @react-aria/i18n',
      '@bonterratech/stitch-extension > @react-aria/label',
      '@bonterratech/stitch-extension > @react-aria/toast',
      '@bonterratech/stitch-extension > @react-stately/form',
      '@bonterratech/stitch-extension > @react-stately/toast',
      '@bonterratech/stitch-extension > @react-stately/data',
      '@bonterratech/stitch-extension > @fortawesome/react-fontawesome',
      '@bonterratech/stitch-extension > @fortawesome/fontawesome-svg-core',
    ],
  },
  plugins: [
    stylex.vite({
      dev: process.env.NODE_ENV !== 'production',
      useCSSLayers: true,
      runtimeInjection: false,
      externalPackages: [
        '@bonterratech/stitch-extension',
        '@bonterratech/stitch-tokens',
      ],
    } as Record<string, unknown>),
    react(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    css: true,
    server: {
      deps: {
        inline: [
          '@bonterratech/stitch-extension',
          '@bonterratech/stitch-tokens',
          '@stylexjs/stylex',
        ],
      },
    },
  },
});
