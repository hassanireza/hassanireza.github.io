import { useCallback, useEffect, useRef, useState } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import { AssetResolver } from "../../lib/asset";
import type { CreativeCode } from "../../types/creative";
import "./CodeViewer.css";

interface CodeViewerProps {
  code: CreativeCode;
}

const sourceCache = new Map<string, string>();

async function loadSource(src: string): Promise<string> {
  const cached = sourceCache.get(src);
  if (cached !== undefined) return cached;
  const res = await fetch(AssetResolver.resolve(src));
  if (!res.ok) throw new Error(`Failed to load ${src}`);
  const text = await res.text();
  sourceCache.set(src, text);
  return text;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

type Engine = "loading" | "monaco" | "plain";

/**
 * Read-only source viewer. Fetches the file, then lazily loads Monaco so the
 * editor (about a megabyte) only costs anything once someone opens code.
 * If Monaco cannot load for any reason the source is still shown as plain
 * monospaced text, so the code is never out of reach.
 */
export default function CodeViewer({ code }: CodeViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const [text, setText] = useState<string | null>(() => sourceCache.get(code.src) ?? null);
  const [failed, setFailed] = useState(false);
  const [engine, setEngine] = useState<Engine>("loading");
  const [wrap, setWrap] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (text !== null) return;
    let off = false;
    loadSource(code.src)
      .then((t) => {
        if (!off) setText(t);
      })
      .catch(() => {
        if (!off) setFailed(true);
      });
    return () => {
      off = true;
    };
  }, [code.src, text]);

  useEffect(() => {
    const host = hostRef.current;
    if (text === null || !host) return;
    let disposed = false;
    let instance: MonacoEditor.IStandaloneCodeEditor | null = null;

    import("./monacoSetup")
      .then(({ monaco, THEME }) => {
        if (disposed) return;
        instance = monaco.editor.create(host, {
          value: text,
          language: code.language,
          theme: THEME,
          readOnly: true,
          domReadOnly: true,
          automaticLayout: true,
          minimap: { enabled: false },
          fontFamily: '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
          fontSize: 13,
          lineHeight: 21,
          fontLigatures: false,
          tabSize: 4,
          detectIndentation: false,
          renderLineHighlight: "none",
          renderWhitespace: "none",
          guides: { indentation: true, highlightActiveIndentation: true, bracketPairs: true },
          bracketPairColorization: { enabled: true },
          stickyScroll: { enabled: true, maxLineCount: 3 },
          folding: true,
          foldingHighlight: false,
          showFoldingControls: "mouseover",
          lineNumbersMinChars: 3,
          padding: { top: 16, bottom: 24 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
            // Never trap the page scroll while the pointer is over the editor.
            alwaysConsumeMouseWheel: false,
          },
          contextmenu: false,
          wordWrap: "off",
          accessibilitySupport: "auto",
          ariaLabel: `${code.filename}, read-only source`,
        });
        editorRef.current = instance;
        setEngine("monaco");
      })
      .catch(() => {
        if (!disposed) setEngine("plain");
      });

    return () => {
      disposed = true;
      instance?.dispose();
      editorRef.current = null;
    };
  }, [text, code.language, code.filename]);

  useEffect(() => {
    editorRef.current?.updateOptions({ wordWrap: wrap ? "on" : "off" });
  }, [wrap, engine]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1700);
    return () => window.clearTimeout(t);
  }, [copied]);

  const onCopy = useCallback(async () => {
    if (text !== null && (await copyText(text))) setCopied(true);
  }, [text]);

  const onDownload = useCallback(() => {
    if (text === null) return;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = code.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [text, code.filename]);

  const lines = text === null ? 0 : text.split("\n").length;

  return (
    <div className="cv">
      <div className="cv-bar">
        <div className="cv-file">
          <span className="cv-dot" aria-hidden="true" />
          <span className="cv-name">{code.filename}</span>
          {lines > 0 && <span className="cv-lines">{lines} lines</span>}
        </div>
        <div className="cv-actions">
          <button
            type="button"
            className={`cv-btn${wrap ? " is-on" : ""}`}
            onClick={() => setWrap((w) => !w)}
            aria-pressed={wrap}
            disabled={text === null || engine === "plain"}
          >
            Wrap
          </button>
          <button type="button" className="cv-btn" onClick={onCopy} disabled={text === null}>
            <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
          </button>
          <button type="button" className="cv-btn" onClick={onDownload} disabled={text === null}>
            Download
          </button>
        </div>
      </div>

      <div className="cv-stage">
        <div ref={hostRef} className="cv-host" hidden={engine === "plain"} />

        {engine === "plain" && text !== null && (
          <pre className="cv-plain" tabIndex={0}>
            <code>{text}</code>
          </pre>
        )}

        {engine === "loading" && !failed && (
          <div className="cv-status" role="status">
            <span className="cv-spinner" aria-hidden="true" />
            {text === null ? "Fetching source" : "Starting editor"}
          </div>
        )}

        {failed && (
          <div className="cv-status is-error" role="alert">
            The source could not be loaded.
          </div>
        )}
      </div>
    </div>
  );
}
