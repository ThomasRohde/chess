import { Check, Undo2 } from "lucide-react";

import type { AppliedMove } from "../../domain/chess/moveTypes";

type MoveConfirmationPanelProps = {
  nickname: string;
  move: AppliedMove | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function MoveConfirmationPanel({
  nickname,
  move,
  onCancel,
  onConfirm,
}: MoveConfirmationPanelProps) {
  if (!move) {
    return null;
  }

  return (
    <section className="side-panel-card highlight" aria-label="Confirm move">
      <div className="card-kicker">Pending move</div>
      <h2>{nickname}, publish this move?</h2>
      <dl className="move-details">
        <div>
          <dt>Move</dt>
          <dd>{move.san}</dd>
        </div>
        <div>
          <dt>From</dt>
          <dd>{move.from}</dd>
        </div>
        <div>
          <dt>To</dt>
          <dd>{move.to}</dd>
        </div>
        <div>
          <dt>Result</dt>
          <dd>{move.status.label}</dd>
        </div>
      </dl>
      <div className="button-row">
        <button className="button primary" onClick={onConfirm}>
          <Check aria-hidden="true" size={18} />
          Confirm
        </button>
        <button className="button secondary" onClick={onCancel}>
          <Undo2 aria-hidden="true" size={18} />
          Cancel
        </button>
      </div>
    </section>
  );
}
