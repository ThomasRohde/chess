import { useRef } from "react";
import { RefreshCw, RotateCcw, Share2 } from "lucide-react";

import type { AppliedMove } from "../../domain/chess/moveTypes";
import type { BoardImageInput, BoardImageResult } from "../../sharing/boardImage";
import { BoardImageButton } from "./BoardImageButton";
import { CopyUrlButton } from "./CopyUrlButton";
import { XShareButton } from "./XShareButton";

type SharePanelProps = {
  isPublishing?: boolean;
  nickname: string;
  move: AppliedMove | null;
  publishError?: string | null;
  shareUrl: string | null;
  onPublish: () => void;
  onContinue: () => void;
  onReloadPublishedUrl?: (shareUrl: string) => void;
  onShareBoardImage?: (input: BoardImageInput) => Promise<BoardImageResult> | BoardImageResult;
};

export function SharePanel({
  isPublishing = false,
  nickname,
  move,
  publishError = null,
  shareUrl,
  onPublish,
  onContinue,
  onReloadPublishedUrl = reloadPublishedUrl,
  onShareBoardImage,
}: SharePanelProps) {
  const shareUrlInputRef = useRef<HTMLInputElement>(null);

  if (!move) {
    return null;
  }

  if (!shareUrl) {
    return (
      <section className="side-panel-card" aria-label="Publish branch">
        <div className="card-kicker">Ready to publish</div>
        <p className="muted">Your nickname is included in this link.</p>
        {publishError ? (
          <p className="form-error" role="alert">
            {publishError}
          </p>
        ) : null}
        <button className="button primary full-width" disabled={isPublishing} onClick={onPublish}>
          <Share2 aria-hidden="true" size={18} />
          {isPublishing ? "Publishing..." : "Publish this branch"}
        </button>
      </section>
    );
  }

  return (
    <section className="side-panel-card" aria-label="Share branch">
      <div className="card-kicker">Published branch</div>
      <label className="share-url-field">
        <span>Current URL</span>
        <input
          readOnly
          onFocus={(event) => event.currentTarget.select()}
          ref={shareUrlInputRef}
          value={shareUrl}
        />
      </label>
      <div className="button-row wrap">
        <CopyUrlButton sourceInputRef={shareUrlInputRef} url={shareUrl} />
        <XShareButton nickname={nickname} moveSan={move.san} shareUrl={shareUrl} />
        <BoardImageButton
          fen={move.afterFen}
          lastMoveFrom={move.from}
          lastMoveSan={move.san}
          lastMoveTo={move.to}
          onShareBoardImage={onShareBoardImage}
          shareUrl={shareUrl}
          statusLabel={move.status.label}
        />
      </div>
      <button
        className="button primary full-width share-refresh-button"
        onClick={() => onReloadPublishedUrl(shareUrl)}
      >
        <RefreshCw aria-hidden="true" size={18} />
        Reload published URL
      </button>
      <button className="button secondary full-width share-continue-button" onClick={onContinue}>
        <RotateCcw aria-hidden="true" size={18} />
        Make another move
      </button>
    </section>
  );
}

function reloadPublishedUrl(shareUrl: string): void {
  const targetUrl = new URL(shareUrl, window.location.href).href;

  if (window.location.href === targetUrl) {
    window.location.reload();
    return;
  }

  window.location.assign(targetUrl);
}
