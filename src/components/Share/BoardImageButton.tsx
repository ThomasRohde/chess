import { useState } from "react";
import { Download } from "lucide-react";

import {
  shareOrDownloadBoardImage,
  type BoardImageInput,
  type BoardImageResult,
} from "../../sharing/boardImage";

type BoardImageButtonProps = BoardImageInput & {
  onShareBoardImage?: (input: BoardImageInput) => Promise<BoardImageResult> | BoardImageResult;
};

type ExportState = "idle" | "working" | "shared" | "downloaded" | "error";

const LABELS: Record<ExportState, string> = {
  downloaded: "Image downloaded",
  error: "Image unavailable",
  idle: "Share board image",
  shared: "Image shared",
  working: "Preparing image",
};

export function BoardImageButton({
  fen,
  lastMoveFrom,
  lastMoveSan,
  lastMoveTo,
  onShareBoardImage = shareOrDownloadBoardImage,
  shareUrl,
  statusLabel,
}: BoardImageButtonProps) {
  const [exportState, setExportState] = useState<ExportState>("idle");

  async function handleClick() {
    setExportState("working");

    try {
      const result = await onShareBoardImage({
        fen,
        lastMoveFrom,
        lastMoveSan,
        lastMoveTo,
        shareUrl,
        statusLabel,
      });
      setExportState(result);
    } catch {
      setExportState("error");
    }
  }

  return (
    <button
      className="button secondary"
      disabled={exportState === "working"}
      onClick={handleClick}
      type="button"
    >
      <Download aria-hidden="true" size={18} />
      {LABELS[exportState]}
    </button>
  );
}
