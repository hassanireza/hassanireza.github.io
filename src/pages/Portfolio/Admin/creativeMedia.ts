import type { ConvertedImage } from "./imageToWebp";

/**
 * Browser-side media helpers for the Creative Coding admin: read a video's
 * size and length, grab a poster frame from it, and turn files into the
 * base64 payload the GitHub Contents API wants. Nothing leaves the browser
 * until the form is saved.
 */

export const MAX_UPLOAD_MB = 25;
const POSTER_MAX_WIDTH = 1080;

export interface VideoProbe {
  file: File;
  url: string;
  width: number;
  height: number;
  duration: number;
  /** Detached element used to seek and capture frames. */
  el: HTMLVideoElement;
}

export function probeVideo(file: File): Promise<VideoProbe> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("video");
    el.muted = true;
    el.playsInline = true;
    el.preload = "auto";
    el.onloadedmetadata = () => {
      if (!el.videoWidth || !el.videoHeight) {
        URL.revokeObjectURL(url);
        reject(new Error("no video track"));
        return;
      }
      resolve({ file, url, width: el.videoWidth, height: el.videoHeight, duration: el.duration || 0, el });
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    el.src = url;
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(((reader.result as string) ?? "").split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const fileToBase64 = blobToBase64;

async function canvasToConverted(canvas: HTMLCanvasElement): Promise<ConvertedImage> {
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("WebP encoding failed."))), "image/webp", 0.86);
  });
  return {
    blob,
    base64: await blobToBase64(blob),
    previewUrl: URL.createObjectURL(blob),
    width: canvas.width,
    height: canvas.height,
  };
}

/** Grabs one frame of the video at `time` seconds, at the video's own aspect ratio. */
export async function captureFrame(probe: VideoProbe, time: number): Promise<ConvertedImage> {
  const { el } = probe;
  const t = Math.min(Math.max(0, time), Math.max(0, probe.duration - 0.05));
  if (Math.abs(el.currentTime - t) > 0.01) {
    await new Promise<void>((resolve) => {
      el.onseeked = () => resolve();
      el.currentTime = t;
    });
  }
  const w = Math.min(POSTER_MAX_WIDTH, probe.width);
  const h = Math.round((w * probe.height) / probe.width);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  ctx.drawImage(el, 0, 0, w, h);
  return canvasToConverted(canvas);
}

/** An uploaded image as WebP, keeping its own aspect ratio (no 16:9 crop). */
export async function imageToWebpKeepRatio(file: File): Promise<ConvertedImage> {
  const bitmap = await createImageBitmap(file);
  const w = Math.min(POSTER_MAX_WIDTH, bitmap.width);
  const h = Math.round((w * bitmap.height) / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvasToConverted(canvas);
}

export const LANGUAGES: { id: string; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "cpp", label: "C / C++ / GLSL" },
  { id: "rust", label: "Rust" },
  { id: "go", label: "Go" },
  { id: "java", label: "Java" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "shell", label: "Shell" },
  { id: "markdown", label: "Markdown" },
  { id: "yaml", label: "YAML" },
  { id: "plaintext", label: "Plain text" },
];

const EXT_LANG: Record<string, string> = {
  py: "python",
  js: "javascript",
  mjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  c: "cpp",
  h: "cpp",
  cpp: "cpp",
  hpp: "cpp",
  glsl: "cpp",
  frag: "cpp",
  vert: "cpp",
  rs: "rust",
  go: "go",
  java: "java",
  html: "html",
  css: "css",
  sh: "shell",
  md: "markdown",
  yml: "yaml",
  yaml: "yaml",
  txt: "plaintext",
};

export function languageForFilename(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_LANG[ext] ?? null;
}

/** Keeps a code filename safe to use as a repo path segment. */
export function safeFilename(name: string): string {
  return name.trim().replace(/[^\w.-]+/g, "_").replace(/^\.+/, "");
}
