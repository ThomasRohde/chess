import { Clock3 } from "lucide-react";

import type { PublishedStateV1 } from "../../domain/state/publishedState";

type LastMoveCardProps = {
  state: PublishedStateV1 | null;
};

export function LastMoveCard({ state }: LastMoveCardProps) {
  if (!state?.lastMove) {
    return null;
  }

  return (
    <section className="side-panel-card" aria-label="Last published move">
      <div className="card-kicker">
        <Clock3 aria-hidden="true" size={16} />
        Last move
      </div>
      <p className="move-san">{state.lastMove.san}</p>
      <p className="muted">
        {state.publishedBy} published this branch{" "}
        <time dateTime={state.createdAt}>{formatTimestamp(state.createdAt)}</time>.
      </p>
    </section>
  );
}

function formatTimestamp(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "recently";
  }
}
