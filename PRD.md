# PRD: URL-Branching Chess App

**Version:** 1.0
**Date:** 1 May 2026
**Working title:** Branch Chess
**Target:** Static GitHub Pages project
**Primary goal:** Build a polished public toy where every legal chess move creates a shareable URL, and every recipient can continue the game from that URL, creating an implicit branching tree of games.

The real goal here is not “build chess.” The real goal is **social, asynchronous, branchable chess with almost no infrastructure**. So this PRD keeps v1 URL-only, simple to ship, and cleanly designed so a backend can be added later without rewriting the product.

---

## 1. Product summary

The app lets a user open a static web app, enter a nickname, make one legal chess move by dragging a piece, confirm the move, and publish a URL containing the resulting board state. The user can copy the URL or post it to X/Twitter. Another user opens that URL, sees the board in the encoded state, enters or reuses their nickname, makes the next legal move, and publishes a new URL.

Each URL is a branch. There is no global tree index in v1. Branching exists because many users can independently continue from the same shared position.

The app will be a React + TypeScript single-page app built with Vite and deployed to GitHub Pages. Vite builds static output into `dist`, and GitHub Pages can publish either from a branch or via GitHub Actions. Hash routing is the right routing choice because the route state stays after `#`, which React Router and MDN both document as client-side URL state not sent to the server. ([vitejs][1])

---

## 2. Locked product decisions

| Area            | Decision                                                        |
| --------------- | --------------------------------------------------------------- |
| App style       | Polished public toy                                             |
| Hosting         | Static GitHub Pages project                                     |
| Game state      | Compact encoded FEN + metadata in URL                           |
| Move history    | Not stored in URL                                               |
| Tree model      | URL-only implicit branching                                     |
| Backend         | No backend in v1, but include clean persistence adapter         |
| Chess rules     | Enforce legal chess moves                                       |
| Move input      | Drag/drop only                                                  |
| Move publishing | Drag legal move → confirm → publish                             |
| Promotion       | Show promotion picker                                           |
| Nickname        | Stored locally and embedded in shared URL metadata as publisher |
| Sharing         | Copy URL + X/Twitter share button                               |
| Routing         | Hash route                                                      |

Important constraint: because v1 stores only the current FEN and metadata, the app cannot reliably detect threefold repetition. It should enforce legal movement, check, checkmate, stalemate, castling, en passant, promotion, and halfmove clock behavior, but **automatic threefold repetition claims are out of scope for v1**.

---

## 3. Goals and non-goals

### Goals

1. A new user can open the default URL, enter a nickname, make the first legal chess move, and publish a shareable URL.
2. A recipient can open the URL and see the exact encoded chess position.
3. The recipient can continue the game by making one legal move and publishing a new URL.
4. Every published URL is independent and durable as long as the app understands the URL schema.
5. The app feels fun, polished, and low-friction on desktop and mobile.
6. The codebase is structured so persistence can be added later through an adapter.

### Non-goals for v1

The first version will not include accounts, authentication, a global tree browser, backend storage, sibling branch discovery, comments, real-time multiplayer, AI opponents, engine analysis, PGN export, full game history, moderation workflows, or text-based move input.

---

## 4. Target users

### Casual chess sharer

Wants to send a move to a friend without creating an account. Success means they can create a link in under a minute.

### Social media participant

Sees a position on X/Twitter and wants to make the next move. Success means the URL opens directly into a playable board state.

### Curious branch explorer

Enjoys the idea that many people can fork the same game. In v1, this user can manually follow shared links but cannot browse the global branch tree.

---

## 5. User stories

### US-01: Enter nickname

As a user, I want to enter a nickname when I first open the app, so my published move has a human label.

Acceptance criteria:

* If no local nickname exists, show nickname prompt before allowing a move.
* Nickname is saved to `localStorage`.
* Nickname is sanitized before storage and display.
* User can edit nickname later.
* Opening a shared URL must not overwrite the local nickname with the previous publisher’s nickname.

Browser `localStorage` is suitable for this preference because it stores key/value data across browser sessions for the same origin. ([MDN Web Docs][2])

### US-02: Start from default board

As a user, I want the default URL to show a fresh chess board, so I can start a new branch.

Acceptance criteria:

* Default route loads standard chess starting position.
* App indicates White to move.
* Board orientation defaults to side-to-move at the bottom.
* User can only drag legal pieces for the side to move.

### US-03: Open shared board state

As a recipient, I want a shared URL to open directly to the encoded board state.

Acceptance criteria:

* URL route format is:

```text
https://<owner>.github.io/<repo>/#/p/<encoded-state>
```

* App decodes state from `<encoded-state>`.
* App validates schema version, FEN, nickname metadata, last move metadata, and timestamp.
* Valid state loads the board.
* Invalid state shows a friendly “Bad game link” screen with option to start a new board.
* App must never crash on malformed, oversized, or malicious URL payloads.

### US-04: Make legal move by dragging

As a user, I want to drag a piece to make the next legal move.

Acceptance criteria:

* User can drag only pieces belonging to the side to move.
* Illegal moves snap back.
* Legal moves enter a pending confirmation state.
* App highlights source and target square after a pending legal move.
* App shows current game status: side to move, check, checkmate, stalemate, or draw-relevant status.
* For promotions, app shows a promotion picker before confirming the move.

Use `chess.js` as the rules engine. It is a TypeScript chess library for move generation, validation, FEN handling, check/checkmate/stalemate, and draw detection, and it is tested in Node.js and modern browsers. ([GitHub][3])

### US-05: Confirm move

As a user, I want to confirm my move before publishing, so I do not accidentally share a wrong move.

Acceptance criteria:

* After a legal drag, show confirmation panel or modal.
* Confirmation copy: “Publish this move?” with move details.
* Show publisher nickname, move notation, and resulting side to move.
* User can cancel, which restores the board to the previous FEN.
* User can confirm, which locks the move and enables publishing.

### US-06: Publish URL

As a user, I want to publish the board state into a URL.

Acceptance criteria:

* Publish constructs a new encoded URL from the resulting FEN and metadata.
* Metadata includes schema version, FEN, publishing nickname, last move, and timestamp.
* App navigates to the new hash route after publish.
* App shows copy and X/Twitter share actions.
* Published URL is deterministic for the payload but timestamp means two identical moves at different times may produce different URLs.
* URL must be safe to paste into chat, email, Teams, Slack, and X/Twitter.

### US-07: Copy share link

As a user, I want to copy the generated URL.

Acceptance criteria:

* Copy button uses Clipboard API where available.
* If Clipboard API fails, show selectable URL in a text field.
* Success message appears after copy.
* The visible URL matches the current hash route.

### US-08: Share to X/Twitter

As a user, I want to post the branch link on X/Twitter.

Acceptance criteria:

* X/Twitter button opens a prefilled post composer in a new window/tab.
* App does not post directly through the X API.
* App does not require X authentication inside the chess app.
* App does not track whether the user actually posted.
* Share text includes nickname, move, and link.

Direct posting through X API is out of scope because X’s create-post API requires an authenticated POST request with a text/media payload; v1 should only open a browser share/composer URL. ([X Developer Platform][4])

### US-09: Handle game over

As a user, I want final positions to be clear.

Acceptance criteria:

* If a move results in checkmate, the final URL can still be published.
* On opening a final URL, board is visible but moves are disabled.
* Banner shows result: checkmate, stalemate, or draw-relevant status.
* User can start a new tree from the default starting position.
* Branching from earlier positions is possible only by using earlier URLs.

---

## 6. UX flow

### Default URL flow

```text
Open app
→ If no local nickname: prompt for nickname
→ Show default board
→ User drags legal move
→ If promotion: show promotion picker
→ Show confirm move UI
→ User confirms
→ User presses Publish
→ App creates encoded URL
→ App navigates to encoded URL
→ Show Copy URL and Share on X
```

### Shared URL flow

```text
Open encoded URL
→ Decode and validate state
→ If invalid: show Bad Link screen
→ If valid: show board in encoded state
→ If no local nickname: prompt for nickname
→ User drags legal move for side to move
→ Confirm
→ Publish new URL
→ Copy or share
```

### Bad link flow

```text
Open malformed URL
→ Decode fails or schema validation fails
→ Show "This game link could not be opened"
→ Show "Start new board" button
→ Do not attempt to repair silently
```

---

## 7. Screens and components

### 7.1 Landing / Play screen

The app can use a single main screen. The board is central. Around it:

* Header with app name and nickname.
* Status banner: “White to move”, “Black is in check”, “Checkmate”, etc.
* Chess board.
* Last move card when loaded from a shared link.
* Confirm move panel when a move is pending.
* Share panel after publish.

### 7.2 Nickname prompt

Fields:

* Nickname input
* Continue button
* Small privacy note: “Your nickname is included in links you publish.”

Validation:

* Trim whitespace.
* Collapse repeated spaces.
* 1–24 visible characters.
* Reject empty nickname.
* Escape display everywhere.
* Allow letters, numbers, spaces, hyphen, underscore, and simple emoji only if implementation can reliably count/display them. Otherwise keep ASCII for v1.

Storage key:

```text
branchChess.nickname
```

### 7.3 Board

Recommended board package: `react-chessboard`. It is a React chessboard component with drag-and-drop, responsive board behavior, custom pieces, styling, arrows, and animation support. ([npm][5])

Board behavior:

* Orientation defaults to side-to-move at bottom.
* Dragging non-side-to-move pieces disabled.
* Illegal target squares rejected.
* Legal target square enters pending state.
* During pending state, board is locked until user confirms or cancels.
* Optional but recommended: highlight legal destination squares when a piece is picked up.

### 7.4 Promotion picker

Trigger:

* A pawn legal move reaches final rank.

Options:

* Queen
* Rook
* Bishop
* Knight

Default:

* No auto-queen.
* User must explicitly pick a piece.
* After promotion selection, move enters confirmation state.

### 7.5 Confirm move panel

Content:

```text
Thomas, publish this move?
Move: e4
From: e2
To: e4
Result: Black to move
```

Buttons:

* Confirm
* Cancel

Confirm does not automatically copy/share. It simply locks the move and enables publish.

### 7.6 Publish/share panel

States:

Before publish:

* Button: “Publish this branch”

After publish:

* Generated URL visible or expandable.
* Button: “Copy URL”
* Button: “Post on X”
* Optional button: “Make another move” if the same user wants to continue locally.

X/Twitter text template:

```text
{nickname} played {moveSan}. Your move ♟️
```

The URL should be attached separately as the URL parameter where supported, or appended to text if the chosen intent endpoint requires it.

---

## 8. URL and state model

### 8.1 Route contract

Default app:

```text
/
```

Playable encoded state:

```text
/#/p/<payload>
```

Examples:

```text
https://thomasrohde.github.io/branch-chess/
https://thomasrohde.github.io/branch-chess/#/p/N4Ig...
```

Hash routing is required for v1 because GitHub Pages serves static files and does not provide app-specific server routing. The fragment after `#` is handled client-side, and React Router’s `HashRouter` stores location in the hash so it is not sent to the server. ([React Router][6])

### 8.2 Domain model

Use developer-friendly internal names:

```ts
export type PublishedStateV1 = {
  version: 1;
  fen: string;
  publishedBy: string;
  lastMove: {
    uci: string;
    san: string;
  } | null;
  createdAt: string; // ISO-8601 UTC
};
```

Use compact serialized keys in the URL payload:

```ts
export type UrlPayloadV1 = {
  v: 1;
  f: string;      // FEN
  by: string;     // publishing nickname
  u?: string;     // last move UCI, e.g. "e2e4" or "e7e8q"
  san?: string;   // last move SAN, e.g. "e4", "Nf3", "Qxe7#"
  at: string;     // ISO timestamp
};
```

Example before encoding:

```json
{
  "v": 1,
  "f": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "by": "Thomas",
  "u": "e2e4",
  "san": "e4",
  "at": "2026-05-01T10:30:00.000Z"
}
```

### 8.3 Encoding

Recommended codec:

```text
JSON.stringify(payload)
→ lz-string compressToEncodedURIComponent
→ place result in /#/p/<payload>
```

`lz-string` provides `compressToEncodedURIComponent`, which produces URI-safe compressed text and pairs with `decompressFromEncodedURIComponent`, making it a practical fit for compact URL payloads. ([Pieroxy][7])

### 8.4 Validation

All decoded URL data is untrusted. Validate using Zod before using it in the app. Zod is a TypeScript-first schema validation library for parsing unknown input into typed data. ([Zod][8])

Validation rules:

```ts
v: exactly 1
f: string, max 128 chars initially, must load as legal FEN in chess.js
by: string, sanitized, 1–24 chars
u: optional string, max 8 chars
san: optional string, max 16 chars
at: valid ISO timestamp string
payload length: reject if > 4096 chars before decoding
decoded JSON length: reject if > 2048 chars
```

If validation fails:

* Do not render board from payload.
* Do not write anything to localStorage.
* Show Bad Link screen.

### 8.5 Why FEN, not piece placement only

FEN preserves the state needed to continue legal chess: piece placement, side to move, castling availability, en passant target square, halfmove clock, and fullmove number. Plain piece placement would break legal castling and en passant behavior.

### 8.6 Versioning

The payload includes `v: 1`.

Future versions may add:

* `parent` state hash
* `gameId`
* move history
* backend branch ID
* variant type
* board theme

The decoder must route unsupported versions to a “This link was created by a newer version” error screen.

---

## 9. Chess rules requirements

### In scope

* Standard chess only.
* Legal piece movement.
* Side-to-move enforcement.
* Check detection.
* Checkmate detection.
* Stalemate detection.
* Castling.
* En passant.
* Promotion with picker.
* Halfmove clock in FEN.
* Fullmove number in FEN.

### Out of scope

* Threefold repetition detection.
* Full PGN reconstruction.
* Move history.
* Chess variants.
* Engine evaluation.
* AI move suggestions.
* Clocks/timers.

### Rule engine behavior

Implementation should treat `chess.js` as the source of truth:

* Create `new Chess(fen)` from current state.
* On drag, attempt move using source square, target square, and optional promotion.
* If invalid, reject and snap back.
* If valid, store:

  * `beforeFen`
  * `afterFen`
  * move UCI
  * move SAN
  * game status after move
* On cancel, restore `beforeFen`.
* On confirm/publish, use `afterFen`.

---

## 10. Persistence adapter design

There is no backend in v1. Still, create a persistence adapter now so future backend work is isolated.

### Interface

```ts
export type PublishBranchInput = {
  parentFen: string;
  childState: PublishedStateV1;
  shareUrl: string;
};

export type PublishBranchResult =
  | { kind: "local-only" }
  | { kind: "saved"; branchId: string };

export interface BranchPersistenceAdapter {
  publishBranch(input: PublishBranchInput): Promise<PublishBranchResult>;
}
```

### v1 implementation

```ts
export class NoopBranchPersistenceAdapter implements BranchPersistenceAdapter {
  async publishBranch(): Promise<PublishBranchResult> {
    return { kind: "local-only" };
  }
}
```

The important detail is that the adapter receives both `parentFen` and `childState`. Even though the URL stores only the child state, a future backend can use the parent and child FENs to construct a real tree.

---

## 11. Technical architecture

### 11.1 Recommended stack

```text
React
TypeScript
Vite
React Router HashRouter
chess.js
react-chessboard
lz-string
zod
Vitest
React Testing Library
Playwright
GitHub Actions
GitHub Pages
```

### 11.2 Suggested source structure

```text
src/
  app/
    App.tsx
    router.tsx
    config.ts
  pages/
    PlayPage.tsx
    BadLinkPage.tsx
  components/
    Board/
      ChessBoardView.tsx
      PromotionDialog.tsx
    Nickname/
      NicknameGate.tsx
      NicknameEditor.tsx
    Move/
      MoveConfirmationPanel.tsx
      GameStatusBanner.tsx
      LastMoveCard.tsx
    Share/
      SharePanel.tsx
      CopyUrlButton.tsx
      XShareButton.tsx
  domain/
    chess/
      chessService.ts
      moveTypes.ts
      fen.ts
    state/
      publishedState.ts
      urlPayload.ts
      urlCodec.ts
      validators.ts
    nickname/
      nickname.ts
  persistence/
    BranchPersistenceAdapter.ts
    NoopBranchPersistenceAdapter.ts
  storage/
    localNicknameStore.ts
  sharing/
    shareUrl.ts
    xShare.ts
  tests/
```

### 11.3 Core modules

`chessService.ts`

Responsibilities:

* Load FEN.
* Validate moves.
* Detect promotion need.
* Produce after-move FEN.
* Produce UCI and SAN notation.
* Return game status.

`urlCodec.ts`

Responsibilities:

* Convert domain state to compact URL payload.
* Compress payload.
* Decompress payload.
* Validate decoded payload.
* Convert payload back to domain state.

`localNicknameStore.ts`

Responsibilities:

* Read nickname.
* Write nickname.
* Clear nickname.
* Handle localStorage unavailable errors gracefully.

`shareUrl.ts`

Responsibilities:

* Build absolute URL from current origin, base path, hash route, and encoded payload.
* Avoid hardcoded domain.
* Keep route compatible with GitHub Pages project paths.

`xShare.ts`

Responsibilities:

* Build X/Twitter composer URL.
* URL-encode text and share URL.
* Open in new tab with `noopener,noreferrer`.
* Keep base URL configurable and manually test before release.

---

## 12. Deployment requirements

### GitHub Pages

Use GitHub Actions deployment for the Vite build. GitHub’s Pages docs support publishing via GitHub Actions, and Vite’s static deployment docs state that `npm run build` outputs to `dist` by default. ([GitHub Docs][9])

### Vite config

For a project page:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/<repo-name>/",
  plugins: [react()],
});
```

For local development, Vite dev server should continue to work at `/`.

### GitHub Actions workflow

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/deploy-pages@v4
```

---

## 13. Privacy and safety requirements

GitHub Pages sites are publicly available on the internet, even when the repository is private under eligible plans, so the app must not put secrets or sensitive user data in the static app or shared URL. ([GitHub Docs][9])

Requirements:

* Nickname is public when included in a shared URL.
* Show a short warning near publish: “Your nickname is included in this link.”
* Do not collect email, account IDs, IPs, or analytics in v1.
* Do not use cookies.
* Do not send data to a backend in v1.
* Sanitize nickname before display.
* Treat URL payload as hostile input.
* Never use `dangerouslySetInnerHTML` for nickname, move text, or decoded payload.
* Reject oversized payloads.
* Show graceful error on decode failure.
* Use `rel="noopener noreferrer"` for X/Twitter external links.

---

## 14. Accessibility requirements

The product decision is drag/drop only, so v1 will not be fully accessible as a chess input experience. That is a conscious tradeoff.

Still required:

* Nickname prompt must be keyboard accessible.
* Promotion picker must be keyboard accessible.
* Confirmation panel must be keyboard accessible.
* Copy/share buttons must have accessible labels.
* Game status must be available as text, not color only.
* Error screens must be readable without visual board context.
* Color contrast should meet normal UI expectations.
* Focus should move logically when modals open and close.

Future accessibility enhancement:

* Add coordinate/text move input as an alternative to drag/drop.

---

## 15. Performance requirements

Target behavior:

* App loads quickly on mobile.
* Board interaction feels immediate.
* URL decode and chess validation should complete instantly for normal payloads.
* Avoid heavy chess engines or WASM in v1.
* Lazy-load non-critical decorative assets if any.
* Keep bundle small enough that GitHub Pages static hosting feels snappy.

Suggested release checks:

* Lighthouse Performance target: 90+ on desktop, 80+ on mobile.
* No console errors on default route, valid shared route, or invalid shared route.
* Encoded URL target length: ideally under 1,200 characters for normal positions.

---

## 16. Error handling

### Invalid encoded state

Show:

```text
This game link could not be opened.
The link may be broken, outdated, or incomplete.
```

Actions:

* Start new board
* Copy current bad URL for debugging, optional in dev mode only

### Invalid FEN

Same as invalid encoded state. Do not try to partially load.

### localStorage unavailable

Continue session with in-memory nickname. Show no scary error; just do not persist nickname.

### Clipboard failure

Show URL in a selectable text input and instruct user to copy manually.

### X/Twitter share failure

External share button simply opens a new tab. If blocked by browser, keep copy URL visible as fallback.

---

## 17. Acceptance test matrix

| ID    | Scenario                           | Expected result                                                  |
| ----- | ---------------------------------- | ---------------------------------------------------------------- |
| AT-01 | Open default URL                   | Standard starting board shown                                    |
| AT-02 | No nickname in storage             | Nickname prompt shown                                            |
| AT-03 | Enter valid nickname               | Nickname saved and prompt closes                                 |
| AT-04 | Drag illegal move                  | Piece snaps back; no confirmation                                |
| AT-05 | Drag legal move                    | Confirmation panel appears                                       |
| AT-06 | Cancel pending move                | Board returns to previous FEN                                    |
| AT-07 | Confirm and publish                | URL changes to `/#/p/<payload>`                                  |
| AT-08 | Copy URL                           | Clipboard receives current URL or fallback shown                 |
| AT-09 | Open published URL in new tab      | Same board state appears                                         |
| AT-10 | Open malformed payload             | Bad Link screen appears                                          |
| AT-11 | Open valid checkmate payload       | Board shown; moves disabled; result banner shown                 |
| AT-12 | Promotion move                     | Promotion picker appears                                         |
| AT-13 | Choose promotion piece             | Correct promoted piece appears after confirmation                |
| AT-14 | Shared URL with previous publisher | Previous publisher shown as last mover; local nickname unchanged |
| AT-15 | localStorage unavailable           | App remains usable for current session                           |
| AT-16 | Oversized payload                  | Bad Link screen appears; app does not freeze                     |

---

## 18. Testing plan

### Unit tests

`urlCodec`

* Encodes and decodes valid state.
* Rejects unsupported version.
* Rejects invalid JSON.
* Rejects oversized payload.
* Rejects invalid FEN.
* Preserves nickname, SAN, UCI, timestamp.

`nickname`

* Trims whitespace.
* Rejects empty string.
* Enforces max length.
* Escapes unsafe content through React rendering.

`chessService`

* Accepts legal moves.
* Rejects illegal moves.
* Handles castling.
* Handles en passant.
* Handles promotion.
* Detects checkmate.
* Detects stalemate.

### Component tests

* Nickname gate.
* Promotion picker.
* Move confirmation panel.
* Share panel.
* Bad link page.

### E2E tests with Playwright

* Fresh game to published URL.
* Published URL opened in second browser context.
* Promotion flow.
* Bad link flow.
* Copy fallback, if Clipboard API is mocked unavailable.
* Mobile viewport drag/drop smoke test.

---

## 19. Implementation milestones

### Milestone 1: Project setup

Deliverables:

* Vite + React + TypeScript project.
* GitHub Pages deployment workflow.
* Hash routing.
* Basic app shell.
* Test framework installed.

Done when:

* Default page deploys successfully to GitHub Pages.
* CI runs tests and build.

### Milestone 2: URL state codec

Deliverables:

* `PublishedStateV1`
* `UrlPayloadV1`
* Zod validation
* LZ-string encoding/decoding
* Bad link screen

Done when:

* Valid test payload opens board route.
* Invalid payload never crashes app.

### Milestone 3: Chess board and legal move flow

Deliverables:

* Board component.
* chess.js integration.
* Legal drag/drop moves.
* Pending move state.
* Confirm/cancel.
* Promotion picker.

Done when:

* User can make legal moves and cancel or confirm.
* Illegal moves are blocked.

### Milestone 4: Publish and sharing

Deliverables:

* Publish button.
* URL construction.
* Navigation to new hash route.
* Copy button.
* X/Twitter share button.

Done when:

* Published link can be opened in a separate browser and continued.

### Milestone 5: Polish and game states

Deliverables:

* Game status banner.
* Last move card.
* Check/checkmate/stalemate display.
* Mobile responsiveness.
* Friendly empty/error states.

Done when:

* App feels like a polished toy, not a prototype.

### Milestone 6: Hardening

Deliverables:

* E2E tests.
* Payload size guards.
* localStorage failure handling.
* Accessibility pass for modals and controls.
* Final release smoke test.

Done when:

* All acceptance tests pass.
* No console errors in normal flows.

---

## 20. Developer notes and edge cases

### Board orientation

Default to side-to-move at bottom. This makes each recipient feel like it is “their turn.”

### Last move metadata

Store both UCI and SAN:

* UCI is deterministic and compact.
* SAN is nicer for display and social copy.

Example:

```json
{
  "u": "g1f3",
  "san": "Nf3"
}
```

### Publishing final positions

A final move should still be publishable. The recipient should see the final board and result but cannot continue from that URL.

### No full game reconstruction

Because only current FEN is stored, the app cannot show full history, PGN, or ancestry. That is intentional for v1.

### Future backend compatibility

When backend persistence is added, the app should call:

```ts
adapter.publishBranch({
  parentFen,
  childState,
  shareUrl
});
```

The no-op adapter returns immediately in v1. A future adapter can save parent-child edges and make the implicit URL tree visible.

---

## 21. Suggested backlog after v1

Priority order:

1. Global branch tree index.
2. Sibling move discovery from the same FEN.
3. PGN/move-history mode.
4. Optional text move input for accessibility.
5. Board themes and custom piece sets.
6. Web Share API for mobile.
7. Lightweight moderation if public branch discovery is added.
8. Analytics only if privacy posture is revisited.
9. Engine evaluation or puzzle mode.
10. Chess variants.

---

## 22. Definition of done

The product is v1-ready when:

* A user can start from the default URL, enter nickname, make a legal move, confirm it, publish it, copy it, and share it.
* A second user can open the shared URL and continue legally from that state.
* Promotion, castling, en passant, checkmate, and stalemate behave correctly.
* Invalid URLs fail gracefully.
* Nickname is persisted locally and embedded only as the publisher in generated URLs.
* GitHub Pages deployment works from `main`.
* The app has no backend dependency.
* The persistence adapter exists and is no-op.
* All acceptance tests pass.
* The app feels polished on desktop and mobile.

[1]: https://vite.dev/guide/static-deploy "Deploying a Static Site | Vite"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage "Window: localStorage property - Web APIs | MDN"
[3]: https://github.com/jhlywa/chess.js/ "GitHub - jhlywa/chess.js: A TypeScript chess library for chess move generation/validation, piece placement/movement, and check/checkmate/draw detection · GitHub"
[4]: https://docs.x.com/x-api/posts/manage-tweets/quickstart "Quickstart - X"
[5]: https://www.npmjs.com/package/react-chessboard?utm_source=chatgpt.com "react-chessboard"
[6]: https://reactrouter.com/api/declarative-routers/HashRouter "HashRouter  | React Router"
[7]: https://pieroxy.net/blog/pages/lz-string/index.html "lz-string: JavaScript compression, fast! - pieroxy.net"
[8]: https://zod.dev/ "Intro | Zod"
[9]: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site "Configuring a publishing source for your GitHub Pages site - GitHub Docs"
