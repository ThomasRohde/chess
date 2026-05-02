# Branch Chess

[![Deploy GitHub Pages](https://github.com/ThomasRohde/chess/actions/workflows/pages.yml/badge.svg)](https://github.com/ThomasRohde/chess/actions/workflows/pages.yml)
![React](https://img.shields.io/badge/React-18-1f7660)
![TypeScript](https://img.shields.io/badge/TypeScript-5-1f7660)
![Vite](https://img.shields.io/badge/Vite-6-1f7660)

Branch Chess is URL-branching chess: make a legal move, publish it, and the board becomes a compact share link. Anyone who opens the link can continue from that exact position and publish a new branch.

The app is static, backend-free, and designed for GitHub Pages at `/chess/`.

![Branch Chess screenshot](docs/branch-chess-screenshot.png)

## Features

- Legal chess play powered by `chess.js`.
- Drag-and-drop and click-to-move board interaction.
- Promotion picker, move confirmation, final-game display, and bad-link handling.
- Compact binary Base64URL payloads in hash routes: `/#/<payload>`.
- Canonical FEN internally, packed URL state externally.
- Copyable branch URLs with clipboard fallback.
- X composer links and generated board-image sharing/download.
- No backend, accounts, cookies, analytics, or server-side persistence.

## Live Site

Configured for GitHub Pages:

```text
https://thomasrohde.github.io/chess/
```

The app uses hash routing, so shared positions look like:

```text
https://thomasrohde.github.io/chess/#/<packed-position>
```

## Quick Start

Requirements:

- Node.js 22
- npm

Install and run locally:

```bash
npm ci
npm run dev
```

Open the local URL Vite prints, usually:

```text
http://127.0.0.1:5173/chess/
```

## Scripts

```bash
npm run dev       # Start the local Vite server
npm run test      # Run unit and component tests
npm run test:e2e  # Run Playwright end-to-end tests
npm run build     # Type-check and build the static site
npm run preview   # Preview the production build locally
```

## How Branching Works

1. Start a fresh board or open a shared branch URL.
2. Choose a nickname. It is stored locally and included in links you publish.
3. Make one legal move.
4. Confirm and publish the move.
5. Share the generated URL. The next player opens that branch and continues.

Each published URL contains the current chess position, side to move, castling rights, en-passant file, counters, last move metadata, nickname, timestamp, and payload version.

## URL State

Branch Chess keeps FEN as the internal semantic representation, then encodes the shared URL with a compact binary packer:

- 3-bit payload version
- side to move
- castling rights
- en-passant file
- 64-bit occupancy map
- extracted color and piece masks
- halfmove and fullmove counters
- created-at timestamp
- publisher nickname
- last move SAN and UCI

The binary payload is encoded as Base64URL without padding, which keeps links compact and safe inside URL fragments.

## Project Structure

```text
src/
  components/      React UI for board, moves, nickname, and sharing
  domain/          Chess rules, status helpers, nickname rules, URL state codec
  pages/           Routed pages for play and bad-link states
  persistence/     Persistence adapter boundary; v1 is local-only
  sharing/         Share URL, X composer URL, and board image generation
  storage/         Local nickname storage with locked-down browser fallback
tests/e2e/         Playwright browser coverage
.github/workflows  GitHub Pages deployment workflow
```

## Deployment

GitHub Pages deployment is defined in `.github/workflows/pages.yml`.

The workflow runs on pushes to `master` and manual dispatch:

1. Install dependencies with `npm ci`.
2. Install Playwright Chromium.
3. Run unit/component tests.
4. Run Playwright E2E tests.
5. Build the static site.
6. Upload and deploy `dist` with GitHub Pages.

In the repository settings, set Pages source to **GitHub Actions**.

## V1 Scope

Branch Chess intentionally does not include a backend, user accounts, a global branch tree, move history, PGN export, AI, clocks, chat, or analytics.

A shared link restores the current playable position and the latest published move. It does not restore full repetition history, so exact threefold-repetition claims are outside v1 scope.

## License

Branch Chess is released under the [MIT License](LICENSE).
