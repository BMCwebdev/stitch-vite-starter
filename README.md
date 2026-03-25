# Stitch Vite Starter

A Vite + React template with the [Stitch](https://github.com/bonterratech/stitch) design system pre-configured and ready to use.

## Prerequisites

- **Node.js** 18.19.0 or later
- **pnpm** 9.15.4 or later
- **GitHub Personal Access Token** with `read:packages` scope (for `@bonterratech` packages)
- **FontAwesome token** (for icon packages)

## Setup

### 1. Configure registry tokens

Add the following to your **user-level** `~/.npmrc` (not the project `.npmrc`):

```ini
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT
//npm.fontawesome.com/:_authToken=YOUR_FONTAWESOME_TOKEN
```

### 2. Install dependencies

```bash
pnpm install
```

This will also copy Stitch AI documentation assets to `stitch-ai-assets/`.

### 3. Start developing

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) to see the app.

## Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `pnpm dev`        | Start the Vite dev server            |
| `pnpm build`      | Type-check and build for production  |
| `pnpm preview`    | Preview the production build locally |
| `pnpm test`       | Run tests with Vitest                |
| `pnpm test:watch` | Run tests in watch mode              |
| `pnpm lint`       | Lint with ESLint                     |
| `pnpm prettier`   | Format code with Prettier            |

## How It Works

- **Stitch components** are imported from `@bonterratech/stitch-extension`
- **Design tokens** come from `@bonterratech/stitch-tokens` (used by Stitch internally)
- **StyleX** handles all styling — configured via `@stylexjs/unplugin` in `vite.config.ts`
- The StyleX plugin's `externalPackages` option ensures Stitch's uncompiled StyleX in `node_modules` is compiled at build time

## Resources

- [Stitch Storybook](https://main.d2txqofa7g657p.amplifyapp.com/) — Component API and examples
- [Stitch Design Guidelines](https://zeroheight.com/635ad7a5d/p/0424a6-stitch-design-system) — Design documentation
- [Stitch Repository](https://github.com/bonterratech/stitch) — Source code
