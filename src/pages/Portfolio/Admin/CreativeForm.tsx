import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useGitHubAuth } from "../../../lib/admin/useGitHubAuth";
import { GitHubApiError, getFile, getFileSha, putBinaryFile, putTextFile } from "../../../lib/admin/githubApi";
import { repoPath, workDir } from "../../../lib/admin/creativeAssets";
import { slugifyId, type ConvertedImage } from "./imageToWebp";
import {
  LANGUAGES,
  MAX_UPLOAD_MB,
  captureFrame,
  fileToBase64,
  imageToWebpKeepRatio,
  languageForFilename,
  probeVideo,
  safeFilename,
  type VideoProbe,
} from "./creativeMedia";
import { coverOf, type CreativeCover, type CreativeWork } from "../../../types/creative";

const DESC_LIMIT = 140;

interface CreativeFormProps {
  works: CreativeWork[];
  editing: CreativeWork | null;
  onCancelEdit: () => void;
  onSubmit: (work: CreativeWork) => Promise<void>;
}

type CoverChoice = "auto" | CreativeCover;

const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

function specsToText(work: CreativeWork): string {
  return (work.specs ?? []).map((s) => `${s.label}: ${s.value}`).join("\n");
}

function parseSpecs(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf(":");
      return i === -1
        ? { label: line, value: "" }
        : { label: line.slice(0, i).trim(), value: line.slice(i + 1).trim() };
    })
    .filter((s) => s.label && s.value);
}

/**
 * Add or edit a Creative Coding work: the video, its poster, an optional
 * preview loop, and the source code. Everything is uploaded to
 * public/assets/creative/<id>/ as real commits, then the work is added to
 * creative-coding.json (by the dashboard), so the site picks it up on the
 * next deploy like every other admin change.
 */
export default function CreativeForm({ works, editing, onCancelEdit, onSubmit }: CreativeFormProps) {
  const { getToken } = useGitHubAuth();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [year, setYear] = useState("");
  const [tags, setTags] = useState("");
  const [cover, setCover] = useState<CoverChoice>("auto");
  const [about, setAbout] = useState("");
  const [specs, setSpecs] = useState("");
  const [run, setRun] = useState("");

  const [video, setVideo] = useState<VideoProbe | null>(null);
  const [existingVideo, setExistingVideo] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [existingPreview, setExistingPreview] = useState<string | null>(null);
  const [poster, setPoster] = useState<ConvertedImage | null>(null);
  const [existingPoster, setExistingPoster] = useState<string | null>(null);
  const [posterTime, setPosterTime] = useState(0);

  const [codeText, setCodeText] = useState("");
  const [codeName, setCodeName] = useState("");
  const [language, setLanguage] = useState("python");
  const [existingCodeSrc, setExistingCodeSrc] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);

  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoInput = useRef<HTMLInputElement>(null);
  const previewInput = useRef<HTMLInputElement>(null);
  const posterInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const captureSeq = useRef(0);

  function reset() {
    setTitle("");
    setDesc("");
    setYear("");
    setTags("");
    setCover("auto");
    setAbout("");
    setSpecs("");
    setRun("");
    setVideo(null);
    setExistingVideo(null);
    setPreviewFile(null);
    setExistingPreview(null);
    setPoster(null);
    setExistingPoster(null);
    setPosterTime(0);
    setCodeText("");
    setCodeName("");
    setLanguage("python");
    setExistingCodeSrc(null);
    setError(null);
  }

  useEffect(() => {
    if (!editing) {
      reset();
      return;
    }
    setTitle(editing.title);
    setDesc(editing.desc);
    setYear(editing.year ? String(editing.year) : "");
    setTags((editing.tags ?? []).join(", "));
    setCover(editing.cover ?? "auto");
    setAbout((editing.about ?? []).join("\n\n"));
    setSpecs(specsToText(editing));
    setRun(editing.run ?? "");
    setVideo(null);
    setExistingVideo(editing.video);
    setPreviewFile(null);
    setExistingPreview(editing.preview ?? null);
    setPoster(null);
    setExistingPoster(editing.poster);
    setCodeName(editing.code.filename);
    setLanguage(editing.code.language);
    setExistingCodeSrc(editing.code.src);
    setError(null);

    // Pull the current source into the editor box.
    const token = getToken();
    if (!token) return;
    let off = false;
    setCodeLoading(true);
    getFile(token, repoPath(editing.code.src))
      .then((f) => {
        if (!off) setCodeText(f?.content ?? "");
      })
      .catch(() => {
        if (!off) setError("Could not load the current source code from the repo.");
      })
      .finally(() => {
        if (!off) setCodeLoading(false);
      });
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  async function handleVideo(file: File | undefined) {
    if (!file) return;
    if (!VIDEO_TYPES[file.type]) {
      setError("Use an H.264 MP4 or a WebM video. (MOV and HEVC files do not play in most browsers.)");
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`That video is ${mb(file.size)} MB. Keep it under ${MAX_UPLOAD_MB} MB (re-encode with a higher CRF or a shorter loop).`);
      return;
    }
    setError(null);
    setBusy("Reading video…");
    try {
      const probe = await probeVideo(file);
      const t = Math.min(1, probe.duration / 4);
      const frame = await captureFrame(probe, t);
      setVideo(probe);
      setPosterTime(t);
      setPoster(frame);
    } catch {
      setError("Couldn't read that video. Try re-exporting it as H.264 MP4.");
    } finally {
      setBusy(null);
    }
  }

  async function handleScrub(t: number) {
    setPosterTime(t);
    if (!video) return;
    const seq = ++captureSeq.current;
    try {
      const frame = await captureFrame(video, t);
      if (seq === captureSeq.current) setPoster(frame);
    } catch {
      /* keep the previous frame */
    }
  }

  async function handlePosterFile(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      setError("Poster must be a PNG, JPG, or WebP image.");
      return;
    }
    setError(null);
    try {
      setPoster(await imageToWebpKeepRatio(file));
    } catch {
      setError("Couldn't process that image.");
    }
  }

  function handlePreview(file: File | undefined) {
    if (!file) return;
    if (!VIDEO_TYPES[file.type]) return setError("The preview loop must be an MP4 or WebM.");
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return setError(`Preview is ${mb(file.size)} MB. Keep it under ${MAX_UPLOAD_MB} MB.`);
    setError(null);
    setPreviewFile(file);
  }

  async function handleCodeFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 1024 * 1024) return setError("Source files over 1 MB are not supported.");
    setError(null);
    setCodeText(await file.text());
    setCodeName(safeFilename(file.name));
    const lang = languageForFilename(file.name);
    if (lang) setLanguage(lang);
  }

  function onVideoDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleVideo(e.dataTransfer.files[0]);
  }

  async function put(token: string, path: string, base64: string, message: string) {
    const sha = await getFileSha(token, path).catch(() => null);
    await putBinaryFile(token, path, base64, message, sha ?? undefined);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("Give the work a name.");
    if (!desc.trim()) return setError("Add a short description.");
    if (!video && !existingVideo) return setError("Add the video.");
    if (!poster && !existingPoster) return setError("A poster image is required.");
    const fileName = safeFilename(codeName);
    if (!fileName) return setError("Give the code file a name, e.g. sketch.py.");
    if (!codeText.trim()) return setError("Paste the source code or choose a file.");

    const id = editing?.id ?? slugifyId(title);
    if (!editing && works.some((w) => w.id === id)) return setError("A work with that name already exists.");

    const token = getToken();
    if (!token) return setError("Your session expired - sign in again.");

    const dir = workDir(id);
    try {
      let videoPath = existingVideo ?? "";
      let previewPath = existingPreview ?? undefined;
      let posterPath = existingPoster ?? "";
      let width = editing?.width ?? 0;
      let height = editing?.height ?? 0;

      if (video) {
        const ext = VIDEO_TYPES[video.file.type];
        videoPath = `${dir}/${id}.${ext}`;
        setBusy(`Uploading video (${mb(video.file.size)} MB)…`);
        await put(token, repoPath(videoPath), await fileToBase64(video.file), `Upload video for creative work: ${title}`);
        width = video.width;
        height = video.height;
      }

      if (previewFile) {
        const ext = VIDEO_TYPES[previewFile.type];
        previewPath = `${dir}/${id}-preview.${ext}`;
        setBusy("Uploading preview loop…");
        await put(token, repoPath(previewPath), await fileToBase64(previewFile), `Upload preview for creative work: ${title}`);
      }

      if (poster) {
        posterPath = `${dir}/poster.webp`;
        setBusy("Uploading poster…");
        await put(token, repoPath(posterPath), poster.base64, `Upload poster for creative work: ${title}`);
      }

      const codeSrc = `${dir}/${fileName}`;
      setBusy("Uploading code…");
      const codeSha = await getFileSha(token, repoPath(codeSrc)).catch(() => null);
      await putTextFile(token, repoPath(codeSrc), codeText, `Upload code for creative work: ${title}`, codeSha ?? undefined);

      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const aboutList = about
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
      const specList = parseSpecs(specs);
      const yearNum = Number.parseInt(year, 10);

      const work: CreativeWork = {
        id,
        title: title.trim(),
        desc: desc.trim(),
        ...(Number.isFinite(yearNum) ? { year: yearNum } : {}),
        poster: posterPath,
        video: videoPath,
        ...(previewPath ? { preview: previewPath } : {}),
        width,
        height,
        ...(cover !== "auto" ? { cover } : {}),
        ...(tagList.length ? { tags: tagList } : {}),
        ...(aboutList.length ? { about: aboutList } : {}),
        ...(specList.length ? { specs: specList } : {}),
        ...(run.trim() ? { run: run.trim() } : {}),
        code: { src: codeSrc, filename: fileName, language },
      };

      setBusy("Saving to the portfolio…");
      await onSubmit(work);
      if (!editing) reset();
    } catch (err) {
      const message = err instanceof GitHubApiError ? err.message : null;
      setError(message ? `Save failed: ${message}` : "Save failed - check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  const effectiveWidth = video?.width ?? editing?.width ?? 0;
  const effectiveHeight = video?.height ?? editing?.height ?? 0;
  const autoCover: CreativeCover | null =
    effectiveWidth && effectiveHeight
      ? coverOf({ width: effectiveWidth, height: effectiveHeight } as CreativeWork)
      : null;
  const posterSrc =
    poster?.previewUrl ?? (existingPoster ? `${import.meta.env.BASE_URL}${existingPoster}` : null);
  const saving = busy !== null;

  return (
    <form className="admin-card admin-form" onSubmit={handleSubmit}>
      <div className="admin-card-head">
        <h2>{editing ? "Edit Creative Work" : "Add Creative Work"}</h2>
        {editing && (
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onCancelEdit}>
            Cancel edit
          </button>
        )}
      </div>

      <label className="admin-field">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Scrying Basin" maxLength={80} />
      </label>

      <label className="admin-field">
        <span>
          Short description <em>({desc.length}/{DESC_LIMIT})</em>
        </span>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value.slice(0, DESC_LIMIT))}
          rows={2}
          placeholder="One or two lines shown on the tile"
        />
      </label>

      <div className="admin-field">
        <span>Video</span>
        <div
          className={`admin-dropzone${dragOver ? " drag-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onVideoDrop}
          onClick={() => videoInput.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && videoInput.current?.click()}
        >
          {video ? (
            <video src={video.url} className="admin-dropzone-preview" controls muted loop playsInline onClick={(e) => e.stopPropagation()} />
          ) : existingVideo ? (
            <video
              src={`${import.meta.env.BASE_URL}${existingVideo}`}
              className="admin-dropzone-preview"
              controls
              muted
              loop
              playsInline
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="admin-dropzone-empty">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 1.5a.75.75 0 0 1 .75.75v7.19l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V2.25A.75.75 0 0 1 8 1.5ZM2 12.5a.75.75 0 0 1 .75.75v.25c0 .28.22.5.5.5h9.5a.5.5 0 0 0 .5-.5v-.25a.75.75 0 0 1 1.5 0v.25A2 2 0 0 1 12.75 15h-9.5A2 2 0 0 1 1.25 13v-.25a.75.75 0 0 1 .75-.75Z" />
              </svg>
              <p>Drag &amp; drop a video, or click to browse</p>
              <p className="admin-hint">H.264 MP4 or WebM, up to {MAX_UPLOAD_MB} MB. Any aspect ratio.</p>
            </div>
          )}
        </div>
        <input ref={videoInput} type="file" accept="video/mp4,video/webm" hidden onChange={(e) => handleVideo(e.target.files?.[0])} />
        {(video || existingVideo) && (
          <p className="admin-hint">
            {effectiveWidth} &times; {effectiveHeight}
            {video ? ` · ${video.duration.toFixed(1)} s · ${mb(video.file.size)} MB` : " · current video"}
            {" · "}
            <button type="button" className="admin-link-btn" onClick={() => videoInput.current?.click()}>
              Replace
            </button>
          </p>
        )}
      </div>

      <div className="admin-field">
        <span>Poster</span>
        <div className="admin-creative-poster">
          <div className="admin-creative-poster-box">
            {posterSrc ? <img src={posterSrc} alt="" /> : <p className="admin-hint">Choose a video first, or upload an image.</p>}
          </div>
          <div className="admin-creative-poster-controls">
            {video && video.duration > 0 && (
              <label className="admin-hint">
                Frame at {posterTime.toFixed(1)} s
                <input
                  type="range"
                  min={0}
                  max={video.duration}
                  step={0.1}
                  value={posterTime}
                  onChange={(e) => handleScrub(Number(e.target.value))}
                />
              </label>
            )}
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => posterInput.current?.click()}>
              Upload image instead
            </button>
          </div>
        </div>
        <input ref={posterInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => handlePosterFile(e.target.files?.[0])} />
      </div>

      <div className="admin-field">
        <span>
          Tile preview loop <em>(optional)</em>
        </span>
        <div className="admin-field-row">
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => previewInput.current?.click()}>
            {previewFile ? "Change file" : existingPreview ? "Replace preview" : "Choose file"}
          </button>
          <span className="admin-hint">
            {previewFile ? `${previewFile.name} (${mb(previewFile.size)} MB)` : existingPreview ? "Current preview in use" : "Skipped: tiles play the full video"}
          </span>
        </div>
        <p className="admin-hint">A small, silent 540px loop makes the grid load faster. Optional.</p>
        <input ref={previewInput} type="file" accept="video/mp4,video/webm" hidden onChange={(e) => handlePreview(e.target.files?.[0])} />
      </div>

      <label className="admin-field">
        <span>Tile cover</span>
        <select value={cover} onChange={(e) => setCover(e.target.value as CoverChoice)}>
          <option value="auto">
            Auto{autoCover ? ` (${autoCover === "square" ? "1:1 square" : "16:9 wide"} for this video)` : ""}
          </option>
          <option value="wide">16:9 wide (3 per row)</option>
          <option value="square">1:1 square (4 to 5 per row)</option>
        </select>
      </label>

      <div className="admin-field">
        <span>Source code</span>
        <div className="admin-field-row">
          <input value={codeName} onChange={(e) => setCodeName(e.target.value)} placeholder="sketch.py" aria-label="Code filename" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Code language"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => codeInput.current?.click()}>
            Open file
          </button>
        </div>
        <textarea
          className="admin-code-input"
          value={codeLoading ? "Loading current source…" : codeText}
          onChange={(e) => setCodeText(e.target.value)}
          readOnly={codeLoading}
          rows={12}
          spellCheck={false}
          wrap="off"
          placeholder="Paste your code here, or use Open file"
        />
        <p className="admin-hint">
          {codeText ? `${codeText.split("\n").length} lines` : "Shown on the site in a syntax-highlighted viewer."}
          {existingCodeSrc && codeName && !existingCodeSrc.endsWith(`/${safeFilename(codeName)}`) ? " The old file is removed when you save." : ""}
        </p>
        <input ref={codeInput} type="file" hidden onChange={(e) => handleCodeFile(e.target.files?.[0])} />
      </div>

      <label className="admin-field">
        <span>
          Tags <em>(comma separated, optional)</em>
        </span>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Python, NumPy, Generative" />
      </label>

      <label className="admin-field">
        <span>
          About <em>(optional, blank line between paragraphs)</em>
        </span>
        <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={5} />
      </label>

      <label className="admin-field">
        <span>
          Specs <em>(optional, one per line as &ldquo;Label: value&rdquo;)</em>
        </span>
        <textarea value={specs} onChange={(e) => setSpecs(e.target.value)} rows={3} placeholder={"Output: 1080 x 1080, 30 fps\nLoop: 6 s, seamless"} />
      </label>

      <div className="admin-field-row admin-field-split">
        <label className="admin-field">
          <span>
            Run command <em>(optional)</em>
          </span>
          <input value={run} onChange={(e) => setRun(e.target.value)} placeholder="python sketch.py --save out.mp4" />
        </label>
        <label className="admin-field admin-field-narrow">
          <span>
            Year <em>(optional)</em>
          </span>
          <input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="2026" />
        </label>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {busy && (
        <p className="admin-status" role="status">
          {busy}
        </p>
      )}

      <button type="submit" className="admin-btn admin-btn-primary" disabled={saving || codeLoading}>
        {saving ? "Saving…" : editing ? "Save Changes" : "Publish Work"}
      </button>
    </form>
  );
}
