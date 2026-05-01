import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Chessboard } from "react-chessboard";

import {
  canDragPiece,
  getGameStatus,
  getLegalDestinations,
} from "../../domain/chess/chessService";
import type { AppliedMove } from "../../domain/chess/moveTypes";

type ChessBoardViewProps = {
  fen: string;
  disabled: boolean;
  pendingMove: AppliedMove | null;
  onMove: (from: string, to: string) => boolean;
};

export function ChessBoardView({ fen, disabled, pendingMove, onMove }: ChessBoardViewProps) {
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const status = useMemo(() => getGameStatus(fen), [fen]);
  const activeSource = dragSource ?? selectedSource;
  const legalDestinations = useMemo(
    () => (activeSource ? getLegalDestinations(fen, activeSource) : []),
    [activeSource, fen],
  );

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};

    for (const square of legalDestinations) {
      styles[square] = {
        background:
          "radial-gradient(circle at center, rgba(31, 118, 86, 0.42) 0 18%, transparent 19%)",
      };
    }

    if (selectedSource) {
      styles[selectedSource] = {
        backgroundColor: "rgba(58, 126, 202, 0.42)",
      };
    }

    if (pendingMove) {
      styles[pendingMove.from] = {
        backgroundColor: "rgba(232, 179, 74, 0.62)",
      };
      styles[pendingMove.to] = {
        backgroundColor: "rgba(31, 118, 86, 0.55)",
      };
    }

    return styles;
  }, [legalDestinations, pendingMove, selectedSource]);

  function handleSquareSelection(square: string, piece?: string): void {
    if (disabled) {
      setSelectedSource(null);
      return;
    }

    if (piece && canDragPiece(fen, piece)) {
      setSelectedSource((current) => (current === square ? null : square));
      return;
    }

    if (!selectedSource) {
      return;
    }

    onMove(selectedSource, square);
    setSelectedSource(null);
  }

  return (
    <div className="board-shell" data-testid="board-shell">
      <Chessboard
        animationDuration={180}
        boardOrientation={status.sideToMove}
        customBoardStyle={{
          borderRadius: "8px",
          boxShadow: "0 18px 44px rgba(26, 30, 33, 0.18)",
        }}
        customDarkSquareStyle={{ backgroundColor: "#6a8f67" }}
        customLightSquareStyle={{ backgroundColor: "#f0e8d0" }}
        customSquareStyles={squareStyles}
        isDraggablePiece={({ piece }) => !disabled && canDragPiece(fen, piece)}
        onPieceClick={(piece, square) => handleSquareSelection(square, piece)}
        onPieceDragBegin={(_piece, sourceSquare) => setDragSource(sourceSquare)}
        onPieceDragEnd={() => {
          setDragSource(null);
          setSelectedSource(null);
        }}
        onPieceDrop={(sourceSquare, targetSquare) => {
          setDragSource(null);
          setSelectedSource(null);
          if (disabled) {
            return false;
          }

          return onMove(sourceSquare, targetSquare);
        }}
        onSquareClick={(square, piece) => {
          if (!piece) {
            handleSquareSelection(square);
          }
        }}
        position={fen}
      />
    </div>
  );
}
