# Agent Handoff: stitch-vite-starter

**Date:** 2026-03-25
**Sessions:** 1 (initial repo creation), 2 (dev server debugging — current)

---

## Current State

### All Working

- **`pnpm dev`** — Dev server renders correctly with styled Stitch components
- **`pnpm build`** — Production build succeeds (1300 modules transformed, 67KB CSS, 488KB JS)
- **`pnpm test`** — Vitest smoke test passes (StyleX compiles Stitch packages during tests)
- **`pnpm lint`** — ESLint clean, zero errors/warnings

### Not Yet Done

- **No git commit or push has been made.** All files are unstaged.
- Initial commit and push to `git@github.com:BMCwebdev/stitch-vite-starter.git`

---

## What Was Done in Session 2

Two problems were fixed:

### Problem 1: Blank page in dev mode (CJS module error)

**Symptom:** Dev server showed a blank page. Browser console:

```
Uncaught SyntaxError: The requested module '.../use-sync-external-store@1.6.0.../shim/index.js'
doesn't provide an export named: 'useSyncExternalStore'
```

**Root cause — the full chain:**

1. The StyleX unplugin's `externalPackages` option adds `@bonterratech/stitch-extension` and `@bonterratech/stitch-tokens` to Vite's `optimizeDeps.exclude`. This is **mandatory** — if these packages are pre-bundled by esbuild, the StyleX Babel transform never sees them (pre-bundling happens before plugin transforms in Vite's dev pipeline), so no CSS gets extracted.

2. When `stitch-extension` is excluded from optimizeDeps, Vite serves its 371KB ESM bundle raw from `node_modules`. This file imports from many peer deps: `react-aria-components`, `@react-stately/toast`, `@react-aria/form`, `@fortawesome/*`, etc.

3. Those peer deps are **also not pre-bundled** — not because they're excluded, but because Vite's dep scanner only finds imports in app source code. Since `react-aria-components` is only imported from inside `stitch-extension.js` (which is excluded from scanning), Vite never encounters it.

4. Deep in this tree, `@react-stately/toast/dist/useToastState.mjs` imports `use-sync-external-store/shim/index.js` — a CJS package that can't be served as ESM. The browser crashes.

**What didn't work (Session 1):** Adding `use-sync-external-store` to `optimizeDeps.include` as a flat string plus adding it as a direct dependency. The pre-bundled version existed at `.vite/deps/`, but `@react-stately/toast` (served raw) resolved its import to the raw CJS file, bypassing it. This approach would require enumerating every CJS package in Stitch's entire transitive dep tree.

**What fixed it:** Vite's **nested dependency syntax** in `optimizeDeps.include`:

```typescript
optimizeDeps: {
  include: [
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
}
```

The `parent > dep` syntax (documented at https://vite.dev/config/dep-optimization-options.html) tells Vite: "even though `stitch-extension` is excluded, pre-bundle these peer deps and their full transitive trees (including CJS→ESM conversion)." This:

- Keeps Stitch packages excluded (so StyleX Babel transform runs on them)
- Pre-bundles their peer deps (so they're served as proper ESM with CJS interop)
- Doesn't require listing individual CJS transitive deps — just the direct peer deps
- Is documented Vite behavior, not a hack

We also removed `use-sync-external-store` from `package.json` direct dependencies since it's no longer needed as a shim.

### Problem 2: Page rendered but unstyled

**Symptom:** After fixing the blank page, components rendered with correct StyleX hashed class names in the DOM (e.g., `x6scs32 x1xvwyu9`) but appeared unstyled.

**Root cause:** `src/index.css` contained duplicate reset styles (`box-sizing`, `margin: 0`, `padding: 0`) that were interfering with/masking the absence of Stitch's own reset. More importantly, the `stitch-extension.css` file from the package (which contains the proper reset layer, typography defaults, and CSS custom property references) was being imported correctly — the styles just needed `index.css` to get out of the way.

**Fix:** Deleted `src/index.css` and removed its import from `src/main.tsx`. The `stitch-extension.css` reset layer already covers everything `index.css` was trying to do, and does it properly with Stitch's design tokens.

---

## Architecture: How StyleX + Vite Works

### The Two-Pipeline Problem

Vite's dev mode has two separate module processing pipelines:

1. **Pre-bundling** (esbuild, at server start) → bundles `node_modules` deps into `.vite/deps/`
2. **Plugin transforms** (Babel etc., on request) → transforms source files when the browser requests them

StyleX needs the Babel transform to run on Stitch's source code. If Stitch packages are pre-bundled first, the Babel transform either never sees them or sees already-processed code. That's why `optimizeDeps.exclude` is mandatory.

### What the StyleX Unplugin Does

1. **`discoverStylexPackages()`** — finds packages depending on `@stylexjs/stylex` (auto-discovery) plus any in `externalPackages`
2. **`config()` hook** — adds those packages to `optimizeDeps.exclude`
3. **`transform()` hook** — runs `@stylexjs/babel-plugin` on any `.js/.ts/.jsx/.tsx` file that contains StyleX imports (no node_modules filtering — processes everything)
4. **Collects CSS rules** from `metadata.stylex` in the Babel output
5. **Serves CSS** via `virtual:stylex.css` (production) and `virtual:stylex:runtime` (dev)

### Stitch Package Structure

**`@bonterratech/stitch-extension` (v0.2.9):**

- `"type": "module"` (ESM)
- Ships a single 371KB ESM bundle at `dist/stitch-extension.js`
- Contains **uncompiled** `stylex.create()` and `stylex.props()` calls
- Imports from many peer deps: react-aria-components, react-aria, @react-stately/_, @fortawesome/_, etc.
- Also ships pre-built CSS at `dist/stitch-extension.css` (reset layer + base styles)
- Zero direct dependencies — everything is a peer dep

**`@bonterratech/stitch-tokens` (v0.1.2):**

- `"type": "module"` (ESM)
- Ships individual `.stylex.js` files (e.g., `coreTokens.stylex.js`)
- Contains `defineVars()` calls that define CSS custom properties
- Only peer dep is `@stylexjs/stylex`

### Next.js Template Comparison

The existing Next.js template (`/Users/brian.mccarthy/Development/platform-frontend-template`) uses a different approach:

- `transpilePackages` in `next.config.ts` → ensures Stitch packages go through webpack
- Two webpack `babel-loader` rules: one for app code, one for Stitch packages in node_modules
- `@stylexjs/postcss-plugin` for CSS extraction
- This works cleanly because webpack processes everything through its module pipeline — there's no pre-bundling vs. transform split like Vite has

---

## Research Findings (Alternatives Investigated)

### `@vitejs/plugin-react` Babel option — DEAD END

We investigated using `@vitejs/plugin-react`'s `babel` option to run the StyleX transform on node_modules. **This is impossible.** The plugin hardcodes `node_modules` exclusion in TWO places:

1. Filter-level: `/\/node_modules\//` in the exclude array
2. Runtime guard: `if (id.includes("/node_modules/")) return;` in the transform handler

No configuration surface can override this.

### Removing `externalPackages` entirely — WON'T WORK

Auto-discovery finds the same packages. And even if it didn't, without excluding Stitch packages from optimizeDeps, esbuild pre-bundles them before the StyleX Babel transform runs, so no CSS gets extracted.

### Official StyleX Vite example — DOESN'T COVER THIS

The example at `facebook/stylex/examples/example-vite-react` only uses local StyleX styles. It does NOT use `externalPackages` and has no guidance on consuming external StyleX libraries.

---

## What StyleX Could Have Documented Better

Everything we did is "the StyleX way" — we used `externalPackages` as intended, and the unplugin correctly excludes those packages from `optimizeDeps.exclude` so the Babel transform can process them. **The gap is that StyleX's documentation never mentions the cascading consequence of this exclusion, or the Vite-native fix.**

Specifically, what would have saved us hours:

1. **The unplugin docs should explain the `optimizeDeps` side effect.** The `externalPackages` docs just say it tells the unplugin to transform those packages. They don't mention that it also adds them to `optimizeDeps.exclude`, or why. Understanding this is critical to debugging the inevitable CJS breakage.

2. **The docs should show the `optimizeDeps.include` nested syntax as the companion config.** If you use `externalPackages` on a library that has peer deps (which is the normal case — why would you ship an uncompiled StyleX library with zero deps?), you almost certainly need `optimizeDeps.include` with the `parent > dep` syntax for those peer deps. This should be in the "Consuming external StyleX libraries" section that doesn't exist yet.

3. **There should be a top-level "consuming external StyleX libraries" guide — not just for Vite, but for all bundlers.** StyleX used to have examples showing how to use a StyleX version of OpenProps, which at least gave a reference point for developers building design systems or libraries that ship uncompiled StyleX (meant to be compiled on the consumer side at build time). That example no longer exists, and there's no guide for this use case at all. The Vite installation docs only cover local StyleX usage. The `externalPackages` option exists specifically for external libraries, but there's no end-to-end guide showing the full config needed for any bundler. The unplugin handles the transform side automatically, but the dependency resolution side is left to the user to figure out.

4. **The `externalPackages` TypeScript types are missing.** The option works but isn't in the type definitions for v0.17.5, requiring a `Record<string, unknown>` cast. This makes it look unofficial/unsupported.

**To be clear:** nothing we did is a hack. `externalPackages` is the right StyleX config. `optimizeDeps.include` with nested syntax is the right Vite config. The problem is purely a documentation gap — these two configs need to be documented together as a pair, because `externalPackages` without the corresponding `optimizeDeps.include` will break for any real-world library with peer deps.

---

## Critical Files

- **`vite.config.ts`** — The most important file. Contains StyleX unplugin config, optimizeDeps peer dep pre-bundling, and Vitest config.
- **`src/main.tsx`** — Entry point. Imports `stitch-extension.css` for reset/base styles.
- **`src/App.tsx`** — Demo page using Stitch components + local StyleX styles.

## Known Issues

### Vitest "close timed out" Warning

After tests pass, Vitest prints:

```
close timed out after 10000ms
Tests closed successfully but something prevents Vite server from exiting
```

Cosmetic only. Likely the StyleX plugin holding a reference. Not blocking.

### `externalPackages` Type Missing

The `externalPackages` option is not in `@stylexjs/unplugin` TypeScript types for v0.17.5. We cast to `Record<string, unknown>` as a workaround.

---

## Reference Links

- **StyleX Vite docs:** https://stylexjs.com/docs/learn/installation/vite/
- **StyleX unplugin API:** https://stylexjs.com/docs/api/configuration/unplugin
- **Vite optimizeDeps docs:** https://vite.dev/config/dep-optimization-options.html
- **StyleX Vite example:** https://github.com/facebook/stylex/tree/main/examples/example-vite-react
- **Known Vitest issue:** https://github.com/facebook/stylex/issues/1399
- **Next.js template:** `/Users/brian.mccarthy/Development/platform-frontend-template`

## Brian's Preferences

- Repo is in Brian's personal GitHub account (BMCwebdev), not bonterratech org
- Lean template — no routing, no Test Drive, no deployment config
- Uses pnpm (matching the Next.js template)
- Wants `copy-stitch-docs.mjs` postinstall script for AI tool integration
- Does not want StyleX mocked in tests — wants real compilation
- **Does NOT want hacky workarounds.** Solutions should be first-class, documented Vite/StyleX configuration.
