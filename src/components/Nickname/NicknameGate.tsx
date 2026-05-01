import { FormEvent, useState } from "react";
import { Check, User } from "lucide-react";

import { previewNickname, writeNickname } from "../../storage/localNicknameStore";

type NicknameGateProps = {
  nickname: string | null;
  onNickname: (nickname: string) => void;
};

export function NicknameGate({ nickname, onNickname }: NicknameGateProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (nickname) {
    return null;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      const saved = writeNickname(value);
      onNickname(saved);
    } catch {
      setError("Enter a nickname.");
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form
        aria-labelledby="nickname-title"
        aria-modal="true"
        className="modal-panel"
        onSubmit={handleSubmit}
        role="dialog"
      >
        <div className="modal-icon">
          <User aria-hidden="true" size={24} />
        </div>
        <h2 id="nickname-title">Choose nickname</h2>
        <label className="field-label" htmlFor="nickname-input">
          Nickname
        </label>
        <input
          autoComplete="nickname"
          autoFocus
          id="nickname-input"
          maxLength={32}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          placeholder="Thomas"
          value={value}
        />
        <p className="input-preview">
          Public as: <strong>{previewNickname(value) || "..."}</strong>
        </p>
        <p className="privacy-note">Your nickname is included in links you publish.</p>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="button primary full-width" type="submit">
          <Check aria-hidden="true" size={18} />
          Continue
        </button>
      </form>
    </div>
  );
}
