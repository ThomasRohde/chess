import { FormEvent, useState } from "react";
import { Check, Pencil, X } from "lucide-react";

import { writeNickname } from "../../storage/localNicknameStore";

type NicknameEditorProps = {
  nickname: string | null;
  onNickname: (nickname: string) => void;
};

export function NicknameEditor({ nickname, onNickname }: NicknameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(nickname ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      const saved = writeNickname(value);
      onNickname(saved);
      setEditing(false);
    } catch {
      setError("Enter a nickname.");
    }
  }

  if (!editing) {
    return (
      <button
        className="nickname-button"
        onClick={() => {
          setValue(nickname ?? "");
          setEditing(true);
        }}
      >
        <Pencil aria-hidden="true" size={16} />
        {nickname ?? "Set nickname"}
      </button>
    );
  }

  return (
    <form className="nickname-form" onSubmit={handleSubmit}>
      <input
        aria-label="Nickname"
        autoFocus
        maxLength={32}
        onChange={(event) => {
          setValue(event.target.value);
          setError(null);
        }}
        value={value}
      />
      <button aria-label="Save nickname" className="icon-button" type="submit">
        <Check aria-hidden="true" size={16} />
      </button>
      <button
        aria-label="Cancel nickname edit"
        className="icon-button"
        onClick={() => {
          setEditing(false);
          setError(null);
        }}
        type="button"
      >
        <X aria-hidden="true" size={16} />
      </button>
      {error ? <span className="inline-error">{error}</span> : null}
    </form>
  );
}
