import { Chess } from "chess.js";

import { getGameStatus } from "../domain/chess/chessService";

export type BoardImageInput = {
  fen: string;
  lastMoveFrom: string;
  lastMoveSan: string;
  lastMoveTo: string;
  shareUrl: string;
  statusLabel: string;
};

export type BoardImageResult = "shared" | "downloaded";

type ShareCapableNavigator = Navigator & {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

const PIECE_SYMBOLS: Record<string, string> = {
  bB: "♝",
  bK: "♚",
  bN: "♞",
  bP: "♟",
  bQ: "♛",
  bR: "♜",
  wB: "♗",
  wK: "♔",
  wN: "♘",
  wP: "♙",
  wQ: "♕",
  wR: "♖",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"];

export async function shareOrDownloadBoardImage(input: BoardImageInput): Promise<BoardImageResult> {
  const blob = await renderBoardImageBlob(input);
  const filename = `branch-chess-${input.lastMoveSan.replace(/[^a-z0-9+#=-]/gi, "") || "board"}.png`;
  const file = new File([blob], filename, { type: "image/png" });
  const shareData: ShareData = {
    files: [file],
    text: `Branch Chess position after ${input.lastMoveSan}. Your move.`,
    title: "Branch Chess",
    url: input.shareUrl,
  };
  const shareNavigator = navigator as ShareCapableNavigator;

  if (shareNavigator.share && (!shareNavigator.canShare || shareNavigator.canShare(shareData))) {
    await shareNavigator.share(shareData);
    return "shared";
  }

  downloadBlob(blob, filename);
  return "downloaded";
}

export async function renderBoardImageBlob(input: BoardImageInput): Promise<Blob> {
  const chess = new Chess(input.fen);
  const board = chess.board();
  const status = getGameStatus(input.fen);
  const orientation = status.sideToMove;
  const files = orientation === "white" ? FILES : [...FILES].reverse();
  const ranks = orientation === "white" ? [...RANKS].reverse() : RANKS;
  const canvas = document.createElement("canvas");
  const width = 1200;
  const height = 1360;
  const padding = 72;
  const headerHeight = 184;
  const boardSize = width - padding * 2;
  const squareSize = boardSize / 8;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas rendering is unavailable.");
  }

  await document.fonts?.ready;

  ctx.fillStyle = "#f3f7f1";
  ctx.fillRect(0, 0, width, height);
  drawRoundedRect(ctx, 36, 36, width - 72, height - 72, 42, "#ffffff");

  ctx.fillStyle = "#1d2524";
  ctx.font = "800 52px Inter, Segoe UI, Arial, sans-serif";
  ctx.fillText("Branch Chess", padding, 112);
  ctx.fillStyle = "#60706b";
  ctx.font = "700 31px Inter, Segoe UI, Arial, sans-serif";
  ctx.fillText(`${input.lastMoveSan} · ${input.statusLabel}`, padding, 160);

  const boardX = padding;
  const boardY = padding + headerHeight;
  drawRoundedRect(ctx, boardX - 14, boardY - 14, boardSize + 28, boardSize + 28, 28, "#123c27");

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const square = `${files[col]}${ranks[row]}`;
      const isLight = (row + col) % 2 === 0;
      const x = boardX + col * squareSize;
      const y = boardY + row * squareSize;
      ctx.fillStyle = isLight ? "#f0e8d0" : "#6a8f67";
      ctx.fillRect(x, y, squareSize, squareSize);

      if (square === input.lastMoveFrom || square === input.lastMoveTo) {
        ctx.fillStyle = square === input.lastMoveTo ? "rgba(31, 118, 86, 0.5)" : "rgba(232, 179, 74, 0.58)";
        ctx.fillRect(x, y, squareSize, squareSize);
      }

      const piece = pieceAt(board, square);
      if (piece) {
        ctx.fillStyle = piece.startsWith("w") ? "#fffaf0" : "#0a0d0c";
        ctx.strokeStyle = piece.startsWith("w") ? "#0a0d0c" : "#fffaf0";
        ctx.lineWidth = 5;
        ctx.font = `700 ${Math.floor(squareSize * 0.7)}px "Segoe UI Symbol", "Noto Sans Symbols 2", serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const symbol = PIECE_SYMBOLS[piece];
        ctx.strokeText(symbol, x + squareSize / 2, y + squareSize / 2 + squareSize * 0.04);
        ctx.fillText(symbol, x + squareSize / 2, y + squareSize / 2 + squareSize * 0.04);
      }
    }
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 24px Inter, Segoe UI, Arial, sans-serif";
  ctx.fillStyle = "#60706b";
  for (let index = 0; index < 8; index += 1) {
    ctx.fillText(ranks[index], boardX - 36, boardY + index * squareSize + 44);
    ctx.fillText(files[index], boardX + index * squareSize + squareSize - 25, boardY + boardSize + 34);
  }

  ctx.fillStyle = "#1d2524";
  ctx.font = "700 28px Inter, Segoe UI, Arial, sans-serif";
  ctx.fillText("Open the branch and make the next move:", padding, height - 148);
  ctx.fillStyle = "#60706b";
  ctx.font = "600 25px Inter, Segoe UI, Arial, sans-serif";
  drawWrappedText(ctx, input.shareUrl, padding, height - 106, width - padding * 2, 32);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Board image could not be created."));
    }, "image/png");
  });
}

function pieceAt(board: ReturnType<Chess["board"]>, square: string): string | null {
  const fileIndex = FILES.indexOf(square[0]);
  const rankIndex = 8 - Number(square[1]);
  const piece = board[rankIndex]?.[fileIndex];

  return piece ? `${piece.color}${piece.type.toUpperCase()}` : null;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(/(\W+)/).filter(Boolean);
  let line = "";
  let currentY = y;

  for (const word of words) {
    const nextLine = `${line}${word}`;
    if (ctx.measureText(nextLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word.trimStart();
      currentY += lineHeight;
    } else {
      line = nextLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, currentY);
  }
}
