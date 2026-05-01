import { AlertTriangle, CircleDot, Trophy } from "lucide-react";

import type { GameStatus } from "../../domain/chess/moveTypes";

type GameStatusBannerProps = {
  status: GameStatus;
};

export function GameStatusBanner({ status }: GameStatusBannerProps) {
  const Icon = status.isFinal ? Trophy : status.kind === "check" ? AlertTriangle : CircleDot;

  return (
    <section className={`status-banner ${status.kind}`} aria-live="polite">
      <Icon aria-hidden="true" size={19} />
      <span>{status.label}</span>
    </section>
  );
}
