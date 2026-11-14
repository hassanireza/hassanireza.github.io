import { IconCheck, IconCopy, IconLink } from "./Icons";

interface Props {
  label: string;
  copied: boolean;
  onCopy: () => void;
  icon?: "copy" | "link";
  compact?: boolean;
  className?: string;
}

export default function CopyButton({ label, copied, onCopy, icon = "copy", compact, className }: Props) {
  return (
    <button
      type="button"
      className={`gb-copy${copied ? " is-copied" : ""}${compact ? " is-compact" : ""}${className ? " " + className : ""}`}
      onClick={onCopy}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? <IconCheck /> : icon === "link" ? <IconLink /> : <IconCopy />}
      <span className="gb-copy-text">{copied ? "Copied" : compact ? "" : label}</span>
    </button>
  );
}
