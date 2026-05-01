import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RotateCcw } from "lucide-react";

import { ChessBoardView } from "../components/Board/ChessBoardView";
import { PromotionDialog } from "../components/Board/PromotionDialog";
import { NicknameEditor } from "../components/Nickname/NicknameEditor";
import { NicknameGate } from "../components/Nickname/NicknameGate";
import { GameStatusBanner } from "../components/Move/GameStatusBanner";
import { LastMoveCard } from "../components/Move/LastMoveCard";
import { MoveConfirmationPanel } from "../components/Move/MoveConfirmationPanel";
import { SharePanel } from "../components/Share/SharePanel";
import {
  getGameStatus,
  requiresPromotion,
  STARTING_FEN,
  tryMove,
} from "../domain/chess/chessService";
import type { AppliedMove } from "../domain/chess/moveTypes";
import { createPublishedState, type PublishedStateV1 } from "../domain/state/publishedState";
import { decodePublishedState, encodePublishedState } from "../domain/state/urlCodec";
import { NoopBranchPersistenceAdapter } from "../persistence/NoopBranchPersistenceAdapter";
import { buildShareUrl } from "../sharing/shareUrl";
import { readNickname } from "../storage/localNicknameStore";
import { BadLinkPage } from "./BadLinkPage";

type PromotionRequest = {
  from: string;
  to: string;
};

const persistence = new NoopBranchPersistenceAdapter();

export function PlayPage() {
  const { payload } = useParams();
  const navigate = useNavigate();
  const decoded = useMemo(() => (payload ? decodePublishedState(payload) : null), [payload]);
  const routeState = decoded?.ok ? decoded.state : null;
  const [nickname, setNickname] = useState<string | null>(() => readNickname());
  const [fen, setFen] = useState(routeState?.fen ?? STARTING_FEN);
  const [pendingMove, setPendingMove] = useState<AppliedMove | null>(null);
  const [confirmedMove, setConfirmedMove] = useState<AppliedMove | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [promotionRequest, setPromotionRequest] = useState<PromotionRequest | null>(null);
  const justPublishedPayload = useRef<string | null>(null);

  useEffect(() => {
    setFen(routeState?.fen ?? STARTING_FEN);
    setPendingMove(null);
    setPromotionRequest(null);
    if (payload !== justPublishedPayload.current) {
      setConfirmedMove(null);
      setShareUrl(null);
    }
  }, [payload, routeState?.fen]);

  const status = useMemo(() => getGameStatus(fen), [fen]);

  const applyMove = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      const result = tryMove(fen, from, to, promotion);

      if (!result.ok) {
        return false;
      }

      setFen(result.move.afterFen);
      setPendingMove(result.move);
      setConfirmedMove(null);
      setShareUrl(null);
      return true;
    },
    [fen],
  );

  function handleMove(from: string, to: string): boolean {
    if (!nickname || pendingMove || confirmedMove || status.isFinal) {
      return false;
    }

    if (requiresPromotion(fen, from, to)) {
      setPromotionRequest({ from, to });
      return false;
    }

    return applyMove(from, to);
  }

  function cancelPendingMove() {
    if (pendingMove) {
      setFen(pendingMove.beforeFen);
    }

    setPendingMove(null);
    setPromotionRequest(null);
  }

  async function publishMove() {
    if (!confirmedMove || !nickname) {
      return;
    }

    const childState = createPublishedState({
      fen: confirmedMove.afterFen,
      publishedBy: nickname,
      lastMove: {
        san: confirmedMove.san,
        uci: confirmedMove.uci,
      },
    });
    const encoded = encodePublishedState(childState);
    const nextShareUrl = buildShareUrl(encoded);

    await persistence.publishBranch({
      parentFen: confirmedMove.beforeFen,
      childState,
      shareUrl: nextShareUrl,
    });

    justPublishedPayload.current = encoded;
    setShareUrl(nextShareUrl);
    navigate(`/${encoded}`);
  }

  function continueLocally() {
    justPublishedPayload.current = null;
    setConfirmedMove(null);
    setPendingMove(null);
    setShareUrl(null);
  }

  if (decoded && !decoded.ok) {
    return (
      <BadLinkPage
        reason={
          decoded.reason === "unsupported-version"
            ? "This link was created by a newer version of Branch Chess."
            : undefined
        }
      />
    );
  }

  const activeMove = confirmedMove ?? pendingMove;
  const boardDisabled = !nickname || Boolean(pendingMove) || Boolean(confirmedMove) || status.isFinal;

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="brand" to="/">
          <span className="brand-mark" aria-hidden="true">
            <img src={`${import.meta.env.BASE_URL}branch-chess-icon.png`} alt="" />
          </span>
          <span>
            <strong>Branch Chess</strong>
            <small>URL-branching chess</small>
          </span>
        </Link>
        <NicknameEditor nickname={nickname} onNickname={setNickname} />
      </header>

      <section className="play-layout">
        <div className="board-column">
          <GameStatusBanner status={status} />
          <ChessBoardView
            disabled={boardDisabled}
            fen={fen}
            onMove={handleMove}
            pendingMove={activeMove}
          />
        </div>

        <aside className="side-panel" aria-label="Game controls">
          <LastMoveCard state={routeState} />
          {status.isFinal ? (
            <section className="side-panel-card">
              <div className="card-kicker">Final position</div>
              <p className="muted">{status.label}</p>
              <Link className="button primary full-width" to="/">
                <RotateCcw aria-hidden="true" size={18} />
                Start new board
              </Link>
            </section>
          ) : null}
          <MoveConfirmationPanel
            move={pendingMove}
            nickname={nickname ?? ""}
            onCancel={cancelPendingMove}
            onConfirm={() => {
              setConfirmedMove(pendingMove);
              setPendingMove(null);
            }}
          />
          <SharePanel
            move={confirmedMove}
            nickname={nickname ?? ""}
            onContinue={continueLocally}
            onPublish={publishMove}
            shareUrl={shareUrl}
          />
          {!activeMove && !status.isFinal ? (
            <section className="side-panel-card quiet">
              <div className="card-kicker">Current branch</div>
              <p className="muted">Drag a legal piece for {status.sideToMove}.</p>
            </section>
          ) : null}
        </aside>
      </section>

      <PromotionDialog
        onCancel={() => setPromotionRequest(null)}
        onChoose={(piece) => {
          if (promotionRequest) {
            applyMove(promotionRequest.from, promotionRequest.to, piece);
            setPromotionRequest(null);
          }
        }}
        open={Boolean(promotionRequest)}
      />
      <NicknameGate nickname={nickname} onNickname={setNickname} />
    </main>
  );
}
