import { useCallback, useEffect, useRef, useState } from "react";

function legacyCopy(text: string): boolean {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** Clipboard helper with a short-lived "copied" key and a toast message. */
export function useClipboard() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef(0);

  const copy = useCallback(async (key: string, text: string, message: string) => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = legacyCopy(text);
    }
    window.clearTimeout(timer.current);
    if (ok) {
      setCopiedKey(key);
      setToast(message);
    } else {
      setCopiedKey(null);
      setToast("Copy was blocked by the browser. Select the text instead.");
    }
    timer.current = window.setTimeout(() => {
      setCopiedKey(null);
      setToast(null);
    }, 1900);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { copy, copiedKey, toast };
}
