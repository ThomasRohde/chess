import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Check, Copy } from "lucide-react";

type CopyUrlButtonProps = {
  url: string;
  sourceInputRef?: RefObject<HTMLInputElement>;
};

export function CopyUrlButton({ url, sourceInputRef }: CopyUrlButtonProps) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState(false);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fallback) {
      fallbackInputRef.current?.focus();
      fallbackInputRef.current?.select();
    }
  }, [fallback]);

  async function handleCopy() {
    const didCopy = await copyText(url, sourceInputRef?.current ?? null);

    if (didCopy) {
      setCopied(true);
      setFallback(false);
    } else {
      setFallback(true);
    }
  }

  return (
    <div className="copy-block">
      <button className="button secondary" onClick={handleCopy}>
        {copied ? <Check aria-hidden="true" size={18} /> : <Copy aria-hidden="true" size={18} />}
        {copied ? "Copied" : "Copy URL"}
      </button>
      {fallback ? (
        <label className="fallback-copy">
          <span>Copy link manually</span>
          <input
            readOnly
            onFocus={(event) => event.currentTarget.select()}
            ref={fallbackInputRef}
            value={url}
          />
        </label>
      ) : null}
    </div>
  );
}

async function copyText(text: string, sourceInput: HTMLInputElement | null): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back to a temporary selectable field below.
    }
  }

  if (sourceInput && copyFromInput(sourceInput)) {
    return true;
  }

  return copyWithLegacySelection(text);
}

function copyFromInput(input: HTMLInputElement): boolean {
  input.focus();
  input.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  }
}

function copyWithLegacySelection(text: string): boolean {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textArea);
  }
}
