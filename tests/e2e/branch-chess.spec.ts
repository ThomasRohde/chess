import { expect, test, type Page } from "@playwright/test";

import { createPublishedState } from "../../src/domain/state/publishedState";
import { encodePublishedState } from "../../src/domain/state/urlCodec";

const sharedBlackToMovePayload = encodePublishedState(
  createPublishedState({
    fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    publishedBy: "Ada",
    lastMove: { uci: "e2e4", san: "e4" },
    now: new Date("2026-05-01T10:30:00.000Z"),
  }),
);

test("fresh game can publish a branch URL", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("textbox", { name: "Nickname" }).fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await dragSquare(page, "e2", "e4");

  await expect(page.getByRole("heading", { name: /publish this move/i })).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: /publish this branch/i }).click();

  await expect(page).toHaveURL(/#\//);
  const publishedUrl = page.url();
  await expect(page.getByLabel("Share branch")).toBeVisible();
  await expect(page.getByLabel("Current URL")).toHaveValue(/\/chess\/#\/[A-Za-z0-9_-]+$/);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Share board image" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("branch-chess-e4.png");
  await expect(page.getByRole("button", { name: "Image downloaded" })).toBeVisible();

  await Promise.all([
    page.waitForLoadState("domcontentloaded"),
    page.getByRole("button", { name: "Reload published URL" }).click(),
  ]);

  await expect(page).toHaveURL(publishedUrl);
  await expect(page.getByText("Black to move.")).toBeVisible();
  await expect(page.getByLabel("Last published move")).toContainText("e4");
  await expect(page.getByLabel("Share branch")).toHaveCount(0);
});

test("shared black-to-move position supports click-to-move", async ({ page }) => {
  await page.goto(`./#/${sharedBlackToMovePayload}`);
  await page.getByRole("textbox", { name: "Nickname" }).fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.locator('[data-square="e7"]').click();
  await page.locator('[data-square="e5"]').click();

  const confirmMove = page.getByLabel("Confirm move");
  await expect(page.getByRole("heading", { name: /publish this move/i })).toBeVisible();
  await expect(confirmMove).toContainText("e5");
  await expect(confirmMove).toContainText("Frome7");
  await expect(confirmMove).toContainText("Toe5");
});

test("Fool's Mate can be played through published URLs", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("textbox", { name: "Nickname" }).fill("Ada");
  await page.getByRole("button", { name: "Continue" }).click();

  await publishMoveFromFreshUrl(page, "f2", "f3", "f3", "Black to move.");
  await publishMoveFromFreshUrl(page, "e7", "e5", "e5", "White to move.");
  await publishMoveFromFreshUrl(page, "g2", "g4", "g4", "Black to move.");
  await publishMoveFromFreshUrl(page, "d8", "h4", "Qh4#", "Checkmate.");

  await expect(page.locator(".status-banner")).toContainText("Checkmate.");
  await expect(page.getByText("Final position")).toBeVisible();
  await expect(page.getByLabel("Last published move")).toContainText("Qh4#");
});

test("malformed payload shows bad-link screen", async ({ page }) => {
  await page.goto("./#/p/not-valid");

  await expect(page.getByRole("heading", { name: /could not be opened/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /start new board/i })).toBeVisible();
});

async function publishMoveFromFreshUrl(
  page: Page,
  from: string,
  to: string,
  san: string,
  nextStatus: string,
) {
  await page.locator(`[data-square="${from}"]`).click();
  await page.locator(`[data-square="${to}"]`).click();

  const confirmMove = page.getByLabel("Confirm move");
  await expect(confirmMove).toBeVisible();
  await expect(confirmMove).toContainText(san);
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Publish this branch" }).click();

  await expect(page).toHaveURL(/#\//);
  await expect(page.getByLabel("Share branch")).toBeVisible();
  await expect(page.getByLabel("Current URL")).toHaveValue(/\/chess\/#\/[A-Za-z0-9_-]+$/);

  await Promise.all([
    page.waitForLoadState("domcontentloaded"),
    page.getByRole("button", { name: "Reload published URL" }).click(),
  ]);

  await expect(page.locator(".status-banner")).toContainText(nextStatus);
  await expect(page.getByLabel("Last published move")).toContainText(san);
  await expect(page.getByLabel("Share branch")).toHaveCount(0);
}

async function dragSquare(page: Page, from: string, to: string) {
  const board = page.getByTestId("board-shell");
  await board.scrollIntoViewIfNeeded();
  const box = await board.boundingBox();

  if (!box) {
    throw new Error("Board was not visible.");
  }

  const fromPoint = squareCenter(box, from);
  const toPoint = squareCenter(box, to);

  await page.mouse.move(fromPoint.x, fromPoint.y);
  await page.waitForTimeout(100);
  await page.mouse.down();
  await page.waitForTimeout(100);
  await page.mouse.move(toPoint.x, toPoint.y, { steps: 30 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(300);
}

function squareCenter(
  box: { x: number; y: number; width: number; height: number },
  square: string,
) {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = Number(square[1]);
  const size = Math.min(box.width, box.height);

  return {
    x: box.x + ((file + 0.5) * size) / 8,
    y: box.y + ((8 - rank + 0.5) * size) / 8,
  };
}
