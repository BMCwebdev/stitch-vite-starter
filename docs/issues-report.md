# Issues Report: Setting Up StyleX in a Vite App

**Date:** 2026-03-25
**Purpose:** Document the problems encountered while configuring StyleX to work in a Vite + React app that consumes an uncompiled StyleX design system from node_modules.

---

## Background

Stitch (our design system) ships uncompiled StyleX. The packages `@bonterratech/stitch-extension` and `@bonterratech/stitch-tokens` contain raw `stylex.create()`, `stylex.defineVars()`, etc. calls that must be compiled at build time in the consuming application. This works fine in Next.js via `transpilePackages` + Babel/PostCSS, but Vite required a different approach.

---

## Issue 1: Import Path for `@stylexjs/unplugin`

**Problem:** The StyleX docs suggest importing from `@stylexjs/unplugin/vite`, but v0.17.5 does not have that subpath export. The package only exports from the root.

**Error:**

```
error TS2307: Cannot find module '@stylexjs/unplugin/vite' or its corresponding type declarations.
```

**Root Cause:** The package exports a default `UnpluginInstance` from the root, with `.vite()`, `.webpack()`, `.rollup()` etc. methods. There is no `/vite` subpath.

**Solution:**

```typescript
// Wrong
import stylex from '@stylexjs/unplugin/vite';

// Correct
import stylex from '@stylexjs/unplugin';

export default defineConfig({
  plugins: [
    stylex.vite({
      /* options */
    }),
    react(),
  ],
});
```

---

## Issue 2: Missing `@types/node` for `process.env`

**Problem:** TypeScript couldn't find `process.env.NODE_ENV` in `vite.config.ts`.

**Error:**

```
error TS2580: Cannot find name 'process'. Do you need to install type definitions for node?
```

**Solution:** Install `@types/node` as a dev dependency:

```bash
pnpm add -D @types/node
```

---

## Issue 3: Missing `unplugin` Peer Dependency

**Problem:** `@stylexjs/unplugin` v0.17.5 declares `unplugin@^2.3.11` as a peer dependency, but pnpm doesn't auto-install peers.

**Symptoms:** The plugin failed silently or threw module resolution errors.

**Solution:**

```bash
pnpm add -D unplugin@^2.3.11
```

**Note:** `unplugin@3.0.0` was available at the time but doesn't satisfy the `^2.3.11` peer requirement. Installing v3 produces a peer dep warning and may cause runtime issues.

---

## Issue 4: `externalPackages` Not in TypeScript Types

**Problem:** The `externalPackages` option exists in the runtime code (line 194 of `lib/index.js`) but is NOT included in the TypeScript type definitions for v0.17.5. TypeScript complains if you pass it.

**Evidence:**

```typescript
// From lib/index.d.ts - UserOptions does NOT include externalPackages
type UserOptions = StyleXOptions & {
  useCSSLayers?: boolean;
  enableLTRRTLComments?: boolean;
  // ... no externalPackages
};
```

But in `lib/index.js`:

```javascript
// Line 194 - it IS accepted at runtime
externalPackages = [],
```

**Solution:** Cast the options to bypass the type check:

```typescript
stylex.vite({
  externalPackages: [
    '@bonterratech/stitch-extension',
    '@bonterratech/stitch-tokens',
  ],
} as Record<string, unknown>),
```

---

## Issue 5: Vitest Fails to Compile StyleX in Node Modules (The Big One)

**Problem:** The production build works perfectly — `externalPackages` correctly tells the unplugin to exclude those packages from Vite's `optimizeDeps` so they flow through the Babel transform pipeline. But Vitest tests fail with:

```
Error: Unexpected 'stylex.defineVars' call at runtime.
Styles must be compiled by '@stylexjs/babel-plugin'.
```

**Stack trace points to:** `@bonterratech/stitch-tokens/coreTokens.stylex.js` — the design tokens file that uses `stylex.defineVars()`.

**Root Cause:** Vitest's module resolution pre-bundles node_modules dependencies by default, bypassing the Vite plugin transform pipeline. Even though `externalPackages` configures Vite's `optimizeDeps.exclude`, Vitest has its own dependency handling that doesn't respect this.

**This is a known issue:** GitHub Issue [#1399](https://github.com/facebook/stylex/issues/1399) with an open PR [#1405](https://github.com/facebook/stylex/pull/1405) (as of March 2026).

### What We Tried

1. **`test.deps.optimizer.web.exclude`** — Did not work. The packages were excluded from optimization but still not transformed by the StyleX plugin.

2. **`test.deps.optimizer.web.include`** — Did not work. Pre-bundling runs but doesn't invoke the StyleX Babel transform.

3. **`test.deps.inline`** — Works but deprecated in Vitest v3.x. Shows warning: `"deps.inline" is deprecated. Use "server.deps.inline" instead.`

4. **`test.server.deps.inline`** — Initially failed, but only because the `unplugin` peer dependency hadn't been installed yet (Issue 3). After installing it, this approach works correctly.

5. **Mocking `@stylexjs/stylex`** — We considered and rejected this approach. Mocking masks the real problem and means tests don't exercise the actual styling pipeline.

### Final Solution

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    stylex.vite({
      externalPackages: [
        '@bonterratech/stitch-extension',
        '@bonterratech/stitch-tokens',
      ],
    } as Record<string, unknown>),
    react(),
  ],
  test: {
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
```

**Why this works:** `server.deps.inline` forces Vitest to process these packages through Vite's full transform pipeline (including the StyleX unplugin) rather than pre-bundling them. This means `stylex.defineVars()` and `stylex.create()` calls in Stitch packages get compiled by the Babel plugin before test code runs.

**Note:** `@stylexjs/stylex` itself must also be inlined — otherwise the Stitch packages import the pre-bundled (unpatched) version of StyleX which still throws on uncompiled calls.

---

## Issue 6: Plugin Order Matters

**Problem:** Not encountered as a bug (we got it right), but worth documenting: `stylex.vite()` MUST come before `react()` in the plugins array.

**Reason:** The StyleX plugin needs to transform files before React's Fast Refresh plugin processes them. If React's plugin runs first, it may wrap modules in HMR boundaries that prevent StyleX from seeing the raw `stylex.create()` calls.

```typescript
plugins: [
  stylex.vite({ /* ... */ }),  // MUST be first
  react(),
],
```

---

## Issue 7: Blank Page — CJS Dependency Not Pre-bundled (`use-sync-external-store`)

**Problem:** The dev server starts and serves the HTML, but the page is blank (empty `<div id="root">`). The browser console shows:

```
Uncaught SyntaxError: The requested module '…/use-sync-external-store/shim/index.js'
doesn't provide an export named: 'useSyncExternalStore'
```

**Root Cause:** The StyleX unplugin adds all `externalPackages` to `optimizeDeps.exclude` (line 430-434 of the unplugin source). When a package is excluded from Vite's dependency pre-bundling, Vite serves it un-bundled — as raw source. The problem cascades: `react-aria-components` (a dependency of Stitch) depends on `use-sync-external-store`, which is a **CommonJS** package. CJS packages can't be served raw as ES modules — they need Vite's pre-bundler to convert them to ESM.

So the chain is:

1. `externalPackages` excludes `@bonterratech/stitch-extension` from `optimizeDeps`
2. Stitch imports `react-aria-components`, which also gets served un-bundled
3. `react-aria-components` imports `use-sync-external-store/shim` (CJS)
4. Vite serves the CJS file directly → browser can't import named exports → crash

**Additionally:** With pnpm's strict hoisting, `use-sync-external-store` isn't even in the top-level `node_modules/` — it's nested in `.pnpm/`. So even if Vite tried to pre-bundle it, it couldn't find it.

**Solution:** Two changes:

1. Add `use-sync-external-store` as a **direct dependency** so pnpm hoists it:

   ```bash
   pnpm add use-sync-external-store
   ```

2. Explicitly include it in `optimizeDeps.include` so Vite pre-bundles it even though parent packages are excluded:
   ```typescript
   export default defineConfig({
     optimizeDeps: {
       include: ['use-sync-external-store', 'use-sync-external-store/shim'],
     },
     // ...
   });
   ```

**Key Insight:** When using `externalPackages` with the StyleX unplugin, you must manually add any **CJS transitive dependencies** to `optimizeDeps.include`. The unplugin's exclude cascades to sub-dependencies, breaking CJS packages that need the ESM conversion that pre-bundling provides.

---

## Summary Table

| Issue                                 | Severity         | Status                                         |
| ------------------------------------- | ---------------- | ---------------------------------------------- |
| Import path (`/vite` subpath)         | Build blocker    | Fixed — import from root                       |
| Missing `@types/node`                 | Build blocker    | Fixed — added dev dependency                   |
| Missing `unplugin` peer dep           | Silent failure   | Fixed — added `unplugin@^2.3.11`               |
| `externalPackages` missing from types | TypeScript error | Workaround — cast to `Record<string, unknown>` |
| Vitest doesn't compile node_modules   | Test blocker     | Fixed — `server.deps.inline`                   |
| Plugin order                          | Potential issue  | Correct from start                             |
| Blank page — CJS dep not pre-bundled  | Dev blocker      | Fixed — `optimizeDeps.include` + direct dep    |

## Lessons Learned

1. **The unplugin is newer and less documented than the Babel/PostCSS approach.** Type definitions lag behind runtime capabilities. The `externalPackages` option works but isn't typed.

2. **Vitest and Vite are not identical.** Just because Vite's dev/build handles something correctly doesn't mean Vitest will. Vitest has its own dependency resolution that requires separate configuration.

3. **Don't mock the compiler.** When StyleX throws "must be compiled," the answer is always to fix the compilation pipeline, not to mock StyleX. Mocking hides real integration problems.

4. **`externalPackages` has cascading side effects.** Excluding packages from `optimizeDeps` breaks their CJS transitive dependencies. You need to explicitly re-include CJS deps in `optimizeDeps.include`. pnpm's strict hoisting makes this worse — nested CJS packages must be added as direct dependencies to be resolvable.

5. **Blank page ≠ no content.** When the page is blank but the HTML is served, it's almost always a JavaScript module resolution error. Check the browser console first.

6. **Peer dependencies in pnpm are strict.** Unlike npm, pnpm won't auto-install peer deps. The `unplugin` peer dep had to be explicitly installed at the right version.
