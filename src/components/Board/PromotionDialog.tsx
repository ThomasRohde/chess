import { Crown, Shield, Sparkles, Sword } from "lucide-react";

type PromotionDialogProps = {
  open: boolean;
  onChoose: (piece: string) => void;
  onCancel: () => void;
};

const options = [
  { piece: "q", label: "Queen", icon: Crown },
  { piece: "r", label: "Rook", icon: Shield },
  { piece: "b", label: "Bishop", icon: Sparkles },
  { piece: "n", label: "Knight", icon: Sword },
];

export function PromotionDialog({ open, onChoose, onCancel }: PromotionDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-labelledby="promotion-title"
        aria-modal="true"
        className="modal-panel"
        role="dialog"
      >
        <h2 id="promotion-title">Choose promotion</h2>
        <div className="promotion-grid">
          {options.map(({ piece, label, icon: Icon }) => (
            <button className="promotion-option" key={piece} onClick={() => onChoose(piece)}>
              <Icon aria-hidden="true" size={24} />
              {label}
            </button>
          ))}
        </div>
        <button className="button secondary full-width" onClick={onCancel}>
          Cancel
        </button>
      </section>
    </div>
  );
}
