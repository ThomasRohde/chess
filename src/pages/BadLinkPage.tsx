import { Link } from "react-router-dom";
import { RotateCcw } from "lucide-react";

export function BadLinkPage({
  reason = "The link may be broken, outdated, or incomplete.",
}: {
  reason?: string;
}) {
  return (
    <main className="bad-link-page">
      <section className="bad-link-panel" aria-labelledby="bad-link-title">
        <p className="eyebrow">Branch Chess</p>
        <h1 id="bad-link-title">This game link could not be opened.</h1>
        <p>{reason}</p>
        <Link className="button primary" to="/">
          <RotateCcw aria-hidden="true" size={18} />
          Start new board
        </Link>
      </section>
    </main>
  );
}
