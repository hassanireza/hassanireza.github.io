/**
 * Monaco, trimmed to what a read-only source viewer needs.
 *
 * This module is only ever reached through a dynamic import() from
 * CodeViewer, so none of it (about a megabyte of editor code plus one
 * worker) is downloaded until a visitor actually opens a piece's code.
 * Importing "monaco-editor" itself would pull in every language and every
 * editor feature; instead the core API is loaded and just the features used
 * here are registered: folding, find, sticky scroll, bracket matching,
 * clipboard, smart select, and a handful of language grammars (Python first).
 */
import * as monaco from "monaco-editor/editor/editor.api.js";
import "monaco-editor/editor/browser/coreCommands.js";
import "monaco-editor/editor/browser/widget/codeEditor/codeEditorWidget.js";
import "monaco-editor/features/codicon/register.js";
import "monaco-editor/features/folding/register.js";
import "monaco-editor/features/find/register.js";
import "monaco-editor/features/stickyScroll/register.js";
import "monaco-editor/features/bracketMatching/register.js";
import "monaco-editor/features/clipboard/register.js";
import "monaco-editor/features/contextmenu/register.js";
import "monaco-editor/features/wordHighlighter/register.js";
import "monaco-editor/features/tokenization/register.js";
import "monaco-editor/features/smartSelect/register.js";
import "monaco-editor/languages/definitions/python/register.js";
// More grammars so the admin can attach code in other languages. Each one is
// a tiny registration stub; its grammar loads only when a file of that
// language is actually opened.
import "monaco-editor/languages/definitions/javascript/register.js";
import "monaco-editor/languages/definitions/typescript/register.js";
import "monaco-editor/languages/definitions/cpp/register.js";
import "monaco-editor/languages/definitions/rust/register.js";
import "monaco-editor/languages/definitions/go/register.js";
import "monaco-editor/languages/definitions/java/register.js";
import "monaco-editor/languages/definitions/html/register.js";
import "monaco-editor/languages/definitions/css/register.js";
import "monaco-editor/languages/definitions/shell/register.js";
import "monaco-editor/languages/definitions/markdown/register.js";
import "monaco-editor/languages/definitions/yaml/register.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";

self.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};

export const THEME = "basin";

/**
 * "Black oil" theme: the Abyssal Liturgy surfaces and text colors, with a
 * muted chromatic accent per token class (the same restrained spectrum as
 * the flare beads in the Scrying Basin piece) so Python still reads at a
 * glance without breaking the site's near-monochrome palette.
 */
monaco.editor.defineTheme(THEME, {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "", foreground: "c9cfd2" },
    { token: "comment", foreground: "66727a", fontStyle: "italic" },
    { token: "keyword", foreground: "b9a8dc" },
    { token: "keyword.flow", foreground: "b9a8dc" },
    { token: "string", foreground: "9fcfae" },
    { token: "string.escape", foreground: "c5e3cf" },
    { token: "number", foreground: "dcb98a" },
    { token: "number.float", foreground: "dcb98a" },
    { token: "number.hex", foreground: "dcb98a" },
    { token: "type.identifier", foreground: "dccfa6" },
    { token: "tag", foreground: "e0a3a3" },
    { token: "identifier", foreground: "c9cfd2" },
    { token: "delimiter", foreground: "8a959c" },
    { token: "delimiter.parenthesis", foreground: "8a959c" },
    { token: "delimiter.square", foreground: "8a959c" },
    { token: "delimiter.curly", foreground: "8a959c" },
    { token: "operator", foreground: "8fb8d8" },
  ],
  colors: {
    "editor.background": "#0b0d10",
    "editor.foreground": "#c9cfd2",
    "editor.lineHighlightBackground": "#00000000",
    "editor.lineHighlightBorder": "#00000000",
    "editor.selectionBackground": "#7c889140",
    "editor.inactiveSelectionBackground": "#7c889122",
    "editor.selectionHighlightBackground": "#7c88911f",
    "editor.wordHighlightBackground": "#7c88911f",
    "editor.findMatchBackground": "#c9cfd244",
    "editor.findMatchHighlightBackground": "#c9cfd222",
    "editorCursor.foreground": "#e6e3da",
    "editorLineNumber.foreground": "#4b545a",
    "editorLineNumber.activeForeground": "#9aa3a8",
    "editorIndentGuide.background1": "#1a1f24",
    "editorIndentGuide.activeBackground1": "#3a444b",
    "editorBracketMatch.background": "#7c889126",
    "editorBracketMatch.border": "#7c889166",
    "editorBracketHighlight.foreground1": "#c9cfd2",
    "editorBracketHighlight.foreground2": "#b9a8dc",
    "editorBracketHighlight.foreground3": "#8fb8d8",
    "editorBracketHighlight.foreground4": "#dcb98a",
    "editorBracketHighlight.foreground5": "#9fcfae",
    "editorBracketHighlight.foreground6": "#e0a3a3",
    "editorGutter.background": "#0b0d10",
    "editorStickyScroll.background": "#0f1317",
    "editorStickyScrollHover.background": "#141a1f",
    "editorWidget.background": "#12161a",
    "editorWidget.border": "#2a3238",
    "input.background": "#0b0d10",
    "input.border": "#2a3238",
    "focusBorder": "#7c889199",
    "scrollbar.shadow": "#00000000",
    "scrollbarSlider.background": "#7c889126",
    "scrollbarSlider.hoverBackground": "#7c889145",
    "scrollbarSlider.activeBackground": "#7c889166",
    "editorOverviewRuler.border": "#00000000",
  },
});

export { monaco };
