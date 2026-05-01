import type { MouseEvent } from "react";
import { ExternalLink } from "lucide-react";

import { buildXShareUrl } from "../../sharing/xShare";

type XShareButtonProps = {
  nickname: string;
  moveSan: string;
  shareUrl: string;
};

export function XShareButton({ nickname, moveSan, shareUrl }: XShareButtonProps) {
  const xShareUrl = buildXShareUrl({ nickname, moveSan, shareUrl });

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    try {
      const composerWindow = window.open(xShareUrl, "_blank", "noopener,noreferrer");

      if (composerWindow) {
        composerWindow.focus();
        return;
      }
    } catch {
      // Fall through to same-tab navigation when the browser blocks popups.
    }

    window.location.assign(xShareUrl);
  }

  return (
    <a
      className="button secondary"
      href={xShareUrl}
      onClick={handleClick}
      rel="noopener noreferrer"
      target="_blank"
    >
      <ExternalLink aria-hidden="true" size={18} />
      Post on X
    </a>
  );
}
