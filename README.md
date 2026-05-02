# Branch Chess

[![Deploy GitHub Pages](https://github.com/ThomasRohde/chess/actions/workflows/pages.yml/badge.svg)](https://github.com/ThomasRohde/chess/actions/workflows/pages.yml)
![React](https://img.shields.io/badge/React-18-1f7660)
![TypeScript](https://img.shields.io/badge/TypeScript-5-1f7660)
![Vite](https://img.shields.io/badge/Vite-6-1f7660)
![License](https://img.shields.io/badge/License-MIT-1f7660)

Branch Chess is URL-branching chess. Make one legal move, publish it, and the current board becomes a compact share link. Anyone who opens that link can continue from the same position and publish the next branch.

It is a static React app with no backend, accounts, cookies, analytics, or server-side storage. The GitHub Pages build is configured for `/chess/`.

<p align="center">
  <img src="docs/branch-chess-screenshot.png" alt="Branch Chess showing a published e4 branch with black to move" width="960">
</p>

## Live Demo

[Open Branch Chess on GitHub Pages](https://thomasrohde.github.io/chess/)

Shared positions use hash routes, so a branch URL looks like this:

```text
https://thomasrohde.github.io/chess/#/<packed-position>
```

## Highlights

- Legal chess rules powered by `chess.js`.
- Drag-and-drop and click-to-move board interaction.
- One-move publish flow: move, confirm, publish, share.
- Compact Base64URL payloads stored entirely in the URL fragment.
- Canonical FEN internally, packed binary state externally.
- Promotion picker, check/checkmate/stalemate/draw status, and bad-link handling.
- Copy URL, post-to-X composer links, and generated board image sharing/downloads.
- Local nickname storage only; the nickname is included in links you publish.

## How It Works

1. Start from the initial board or open a branch URL.
2. Choose a nickname.
3. Make one legal move.
4. Confirm and publish the move.
5. Share the generated URL.
6. The next player opens that branch and continues the game tree.

Each published URL restores the playable position, side to move, castling rights, en-passant state, move counters, publisher nickname, timestamp, and latest move metadata.

## Quick Start

Requirements:

- Node.js 22
- npm

Install dependencies:

```bash
npm ci
```

Start the development server:

```bash
npm run dev
```

Vite serves the app at a local `/chess/` base path, usually:

```text
http://127.0.0.1:5173/chess/
```

## Scripts

```bash
npm run dev       # Start the local Vite server
npm run test      # Run unit and component tests with Vitest
npm run test:e2e  # Run Playwright end-to-end tests
npm run build     # Type-check and build the static site
npm run preview   # Preview the production build locally
```

If Playwright browsers are not installed on your machine yet:

```bash
npx playwright install chromium
```

## URL State

Branch Chess keeps FEN as the semantic source of truth and packs shareable state into a binary payload before encoding it as Base64URL without padding. That keeps links short and safe inside URL fragments.

The payload includes:

- Payload version marker
- Side to move
- Castling rights
- En-passant file
- 64-square occupancy and piece masks
- Halfmove and fullmove counters
- Created-at timestamp
- Publisher nickname
- Last move in SAN and UCI

Malformed, oversized, or unsupported payloads are routed to a friendly bad-link screen instead of crashing the app.

## Project Structure

```text
src/
  app/             Router and app entry
  components/      Board, move, nickname, and share UI
  domain/          Chess rules, nickname rules, and URL state codecs
  pages/           Play and bad-link pages
  persistence/     Persistence adapter boundary; v1 is local-only
  sharing/         Share URL, X composer URL, and board image generation
  storage/         Local nickname storage
tests/e2e/         Playwright browser coverage
docs/              README assets
.github/workflows  GitHub Pages deployment workflow
```

## Deployment

Deployment is handled by [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

On pushes to `master` and manual workflow dispatches, GitHub Actions:

1. Installs dependencies with `npm ci`.
2. Installs Playwright Chromium.
3. Runs unit and component tests.
4. Runs Playwright end-to-end tests.
5. Builds the static site.
6. Uploads `dist/` to GitHub Pages.

In the repository settings, set Pages source to **GitHub Actions**.

## V1 Scope

Branch Chess intentionally stays small: no backend, user accounts, global branch tree, PGN export, clocks, chat, AI opponent, or analytics.

A link restores the current playable position and latest published move. It does not restore full move history, so exact threefold-repetition claims are outside the v1 scope.

## License

Branch Chess is released under the [MIT License](LICENSE).
