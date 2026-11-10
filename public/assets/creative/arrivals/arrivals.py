"""ARRIVALS - a typographic motion piece, rendered entirely in code.

    Nothing on screen just appears. It arrives, and how it arrives is the message.

Five beats, each one performed with a different arrival mechanic taken from the
reference reel (hairline rule grids, slamming bars, grain-edged sweeps, slit rows,
vertical blinds, rotated-outline moire) plus a few kinetic-type techniques
(tracking collapse, per-letter rise, glyph scramble, motion-blur slide, flash
exposure, noise dissolve, slice glitch). Strictly the brand system: void ground,
bone type, silver/ash rules; Cormorant Garamond italic for display, Jost for body,
JetBrains Mono for annotation. Square 1:1, 30 fps, 27 s.

    python arrivals.py --save arrivals.mp4              # 1080x1080 final
    python arrivals.py --save arrivals.mp4 --size 720   # faster draft
    python arrivals.py --still 14.2 --out frame.png     # one frame at t seconds
    python arrivals.py --sheet sheet.png                # contact sheet of key moments
    python arrivals.py --preview --size 540             # live preview window

Needs: numpy, scipy, pillow, ffmpeg on PATH (video), matplotlib (preview only).
Fonts are read from ./fonts (included, SIL OFL); the image from ./assets.
"""
import argparse
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter1d

HERE = Path(__file__).resolve().parent


def HEX(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255


# ----------------------------------------------------------------- brand
VOID, CHARCOAL, DEEP = HEX("#08090b"), HEX("#0d1013"), HEX("#12161a")
BONE, FOG, ASH = HEX("#e6e3da"), HEX("#9aa3a8"), HEX("#565f64")
SILVER, BRIGHT = HEX("#7c8891"), HEX("#c9cfd2")
RAMP_G = np.array([0, .16, .40, .64, .85, 1.0], np.float32)
RAMP_C = np.stack([VOID, DEEP, ASH, SILVER, BRIGHT, BONE])


@dataclass(frozen=True)
class Config:
    size: int = 1080
    fps: int = 30
    duration: float = 27.0
    seed: int = 2718


# --------------------------------------------------------------- easing
def clamp(x):
    return np.clip(x, 0.0, 1.0)


def prog(t, a, b):
    return float(clamp((t - a) / (b - a)))


def eo(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def eio(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def eexp(x):
    x = clamp(x)
    return 1.0 if x >= 1 else 1 - 2 ** (-10 * x)


def eback(x):
    x = clamp(x)
    c1 = 1.70158
    c3 = c1 + 1
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


# ------------------------------------------------------------------ text
CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/\\|<>+=*#%&"


def glyph(font, ch, pad=3):
    l, t, r, b = font.getbbox(ch, anchor="ls")
    if r <= l or b <= t:
        return None
    im = Image.new("L", (r - l + 2 * pad, b - t + 2 * pad), 0)
    ImageDraw.Draw(im).text((-l + pad, -t + pad), ch, font=font, fill=255, anchor="ls")
    return np.asarray(im, np.float32) / 255.0, l - pad, t - pad


def paste_max(dst, src, x, y, a=1.0):
    x, y = int(round(x)), int(round(y))
    h, w = src.shape
    H, W = dst.shape
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, W), min(y + h, H)
    if x1 <= x0 or y1 <= y0:
        return
    d = dst[y0:y1, x0:x1]
    np.maximum(d, src[y0 - y:y1 - y, x0 - x:x1 - x] * a, out=d)


class Fonts:
    def __init__(self, fonts_dir):
        d = Path(fonts_dir)

        def find(*names):
            for n in names:
                if (d / n).exists():
                    return str(d / n)
            return None
        self.serif = find("CormorantGaramond-Italic[wght].ttf")
        self.sans = find("Jost[wght].ttf")
        self.mono = find("JetBrainsMono[wght].ttf")
        missing = [n for n, p in (("Cormorant", self.serif), ("Jost", self.sans), ("JetBrains Mono", self.mono)) if not p]
        if missing:
            sys.exit(f"missing fonts in {d}: {', '.join(missing)}")
        self._c = {}

    def get(self, kind, size, wght):
        key = (kind, int(size), wght)
        if key not in self._c:
            f = ImageFont.truetype(getattr(self, kind), int(size))
            try:
                f.set_variation_by_axes([wght])
            except Exception:
                pass
            self._c[key] = f
        return self._c[key]


class Word:
    """A word laid out glyph by glyph so every letter can be animated on its own."""

    def __init__(self, S, fonts, text, kind, size, x, baseline, wght=500, align="left", fit=None):
        font = fonts.get(kind, size, wght)
        if fit:
            size = size * fit / font.getlength(text)
            font = fonts.get(kind, size, wght)
        self.size, self.font, self.text, self.S = size, font, text, S
        total = font.getlength(text)
        x0 = x if align == "left" else (x - total if align == "right" else x - total / 2)
        self.baseline, self.x0, self.width = baseline, x0, total
        self.letters = []
        for i, ch in enumerate(text):
            g = glyph(font, ch)
            adv = font.getlength(text[:i + 1]) - font.getlength(ch)
            if g is None:
                self.letters.append(None)
                continue
            m, ox, oy = g
            self.letters.append(dict(m=m, x=x0 + adv + ox, y=baseline + oy, cx=x0 + adv + font.getlength(ch) / 2, i=i, ch=ch))
        L = [l for l in self.letters if l]
        self.box = (int(min(l["x"] for l in L)), int(min(l["y"] for l in L)),
                    int(max(l["x"] + l["m"].shape[1] for l in L)), int(max(l["y"] + l["m"].shape[0] for l in L)))
        self._full = None

    @property
    def full(self):
        if self._full is None:
            self._full = self.render()
        return self._full

    def render(self, dx=None, dy=None, a=None):
        cv = np.zeros((self.S, self.S), np.float32)
        for k, l in enumerate(self.letters):
            if not l:
                continue
            ax = 1.0 if a is None else a[k]
            if ax <= 0:
                continue
            paste_max(cv, l["m"], l["x"] + (0 if dx is None else dx[k]), l["y"] + (0 if dy is None else dy[k]), ax)
        return cv


# ----------------------------------------------------------------- frame
class Frame:
    def __init__(self, S):
        self.S = S
        self.img = np.empty((S, S, 3), np.float32)

    def clear(self):
        self.img[:] = VOID

    def ink(self, mask, color, a=1.0, box=None):
        if box is not None:
            x0, y0, x1, y1 = box
            m = mask[y0:y1, x0:x1] * a
            sub = self.img[y0:y1, x0:x1]
            sub += (np.asarray(color, np.float32) - sub) * m[..., None]
        else:
            m = mask * a
            self.img += (np.asarray(color, np.float32) - self.img) * m[..., None]

    def rect(self, x0, y0, x1, y1, color, a=1.0):
        S = self.S
        x0, y0, x1, y1 = max(int(x0), 0), max(int(y0), 0), min(int(x1), S), min(int(y1), S)
        if x1 <= x0 or y1 <= y0 or a <= 0:
            return
        sub = self.img[y0:y1, x0:x1]
        sub += (np.asarray(color, np.float32) - sub) * a


# ------------------------------------------------------------------ piece
class Piece:
    def __init__(self, cfg, image, fonts_dir):
        self.cfg = cfg
        S = cfg.size
        self.S = S
        self.u = S / 1080.0
        u = self.u
        rng = np.random.default_rng(cfg.seed)
        self.rng = rng
        self.fonts = Fonts(fonts_dir)
        self.M = int(96 * u)
        self.N = rng.random((S, S)).astype(np.float32)             # static grain threshold
        self.N2 = rng.random((S, S)).astype(np.float32)
        self.Nbig = rng.random((S, S * 2)).astype(np.float32)      # dynamic grain source
        self.row1 = self._smooth_noise(S, 5, rng)
        self.row2 = self._smooth_noise(S, 5, rng)
        self.xg = np.arange(S, dtype=np.float32)[None, :]
        self.yg = np.arange(S, dtype=np.float32)[:, None]
        vy, vx = np.mgrid[0:S, 0:S].astype(np.float32)
        r = np.hypot(vx / S - .5, vy / S - .5)
        self.vig = (1 - .55 * np.clip((r - .35) / .5, 0, 1) ** 1.6).astype(np.float32)[..., None]
        f = self.fonts
        M = self.M
        self.w_nothing = Word(S, f, "Nothing", "serif", 300 * u, M, 455 * u, wght=500, fit=888 * u)
        self.w_onscreen = Word(S, f, "on screen", "serif", 200 * u, S - M, 690 * u, wght=400, align="right", fit=520 * u)
        self.w_just = Word(S, f, "just", "serif", 190 * u, M, 440 * u, wght=400)
        self.w_appears = Word(S, f, "appears.", "serif", 200 * u, M, 760 * u, wght=500, fit=888 * u)
        self.w_it_arrives = Word(S, f, "It arrives,", "serif", 200 * u, 150 * u, 880 * u, wght=500, fit=740 * u)
        self.w_and = Word(S, f, "and", "sans", 64 * u, M, 200 * u, wght=300)
        self.w_how = Word(S, f, "how", "serif", 470 * u, M - 10 * u, 640 * u, wght=500)
        self.w_it = Word(S, f, "it", "sans", 110 * u, S - M, 370 * u, wght=300, align="right")
        self.w_arrives = Word(S, f, "arrives", "serif", 200 * u, M, 940 * u, wght=500, fit=888 * u)
        self.w_is_the = Word(S, f, "is the", "sans", 76 * u, M, 360 * u, wght=300)
        self.w_message = Word(S, f, "message.", "serif", 200 * u, M, 640 * u, wght=500, fit=888 * u)
        # annotation glyphs (mono)
        mono = f.get("mono", 21 * u, 400)
        self.mono_masks = {c: glyph(mono, c) for c in "0123456789:"}
        self.mono_adv = mono.getlength("0")
        sm = {}
        for sz in (64 * u, 80 * u):
            sm[int(sz)] = {c: glyph(f.get("mono", sz, 400), c) for c in CHARSET}
        self.scr = sm
        self._load_plate(image)

    @staticmethod
    def _smooth_noise(n, sigma, rng):
        a = gaussian_filter1d(rng.standard_normal(n), sigma)
        return (a / np.abs(a).max()).astype(np.float32)

    def _load_plate(self, path):
        u, S = self.u, self.S
        self.P = int(888 * u)
        pp = int(self.P * 1.14)
        im = Image.open(path).convert("L")
        w, h = im.size
        box = (int(w * .157), int(h * .007), int(w * .157) + int(w * .764), int(h * .007) + int(w * .764))
        im = im.crop(box).resize((pp, pp), Image.LANCZOS)
        g = np.asarray(im, np.float32) / 255
        lo, hi = np.percentile(g, 0.5), np.percentile(g, 99.8)
        g = np.clip((g - lo) / (hi - lo), 0, 1) ** 0.72 * 1.12
        g = np.clip(g, 0, 1)
        self.plate = np.stack([np.interp(g, RAMP_G, RAMP_C[:, i]) for i in range(3)], -1).astype(np.float32)
        self.pp = pp

    # ------------------------------------------------------------- tools
    def dyn_noise(self, f):
        o = (f * 131) % self.S
        return self.Nbig[:, o:o + self.S]

    def vrule(self, F, x, y0, y1, color, a=1.0, w=None):
        w = max(1, int(round(self.u))) if w is None else w
        F.rect(x, y0, x + w, y1, color, a)

    def hrule(self, F, y, x0, x1, color, a=1.0, w=None):
        w = max(1, int(round(self.u))) if w is None else w
        F.rect(x0, y, x1, y + w, color, a)

    def grain_band(self, f, xc, width, amp=24, spread=46):
        u = self.u
        left = xc - width / 2 + self.row1[:, None] * amp * u
        right = xc + width / 2 + self.row2[:, None] * amp * u
        x = self.xg
        core = clamp((x - left) / (3 * u)) * clamp((right - x) / (3 * u))
        out = np.maximum(left - x, x - right) / (spread * u)
        fall = clamp(1 - out)
        grain = (self.dyn_noise(f) < .62 * fall ** 1.6).astype(np.float32)
        return np.maximum(core, grain * (1 - core))

    def reveal_noise(self, field, N=None):
        return (field > (self.N if N is None else N)).astype(np.float32)

    def scramble_glyph(self, kind_size, ch_idx):
        d = self.scr[kind_size]
        return d[CHARSET[ch_idx % len(CHARSET)]]

    def put_scramble(self, cv, cx, baseline, idx, size_key):
        g = self.scramble_glyph(size_key, idx)
        if g is None:
            return
        m, ox, oy = g
        paste_max(cv, m, cx - m.shape[1] / 2, baseline + oy)

    def glitch(self, img, seed, amount=1.0):
        rr = np.random.default_rng(seed)
        S, u = self.S, self.u
        for _ in range(int(7 * amount) + 1):
            y0 = int(rr.integers(0, S - 60))
            h = int(rr.integers(8, 70) * u)
            dx = int(rr.integers(-110, 110) * u)
            img[y0:y0 + h] = np.roll(img[y0:y0 + h], dx, axis=1)

    def mesh(self, F, T, t0, t1, box, seed=7, fade=1.0, n=34):
        """Rotated outline rectangles converging on a box (the moire reference)."""
        S, u = self.S, self.u
        rr = np.random.default_rng(seed)
        cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
        bw, bh = box[2] - box[0], box[3] - box[1]
        p = prog(T, t0, t1)
        if p <= 0 or fade <= 0:
            return
        canv = [Image.new("L", (S, S), 0) for _ in range(4)]
        for k in range(n):
            ph = eio(clamp(p * 1.35 - rr.random() * .35))
            ang0 = rr.uniform(-.75, .75)
            sc0 = rr.uniform(.55, 1.6)
            jx, jy = rr.uniform(-1, 1, 2) * 200 * u * (1 - ph)
            ang = ang0 * (1 - ph)
            w = bw * (1 + (sc0 - 1) * (1 - ph)) * (1 + .25 * (1 - ph))
            h = bh * (1 + (sc0 - 1) * (1 - ph)) * (1 + .6 * (1 - ph))
            c, s = np.cos(ang), np.sin(ang)
            pts = [(cx + jx + c * dx - s * dy, cy + jy + s * dx + c * dy)
                   for dx, dy in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2), (-w / 2, -h / 2))]
            ImageDraw.Draw(canv[k % 4]).line(pts, fill=int(110 + 60 * ph), width=max(1, int(round(u))))
        acc = sum(np.asarray(c, np.float32) for c in canv) / 255.0
        F.ink(clamp(acc * .55), BRIGHT, fade)

    def blinds(self, F, T, t0, dur, x0, y0, P, view, K=22, reverse=False, flash=True, alpha=1.0):
        """Vertical bars that open from the centre line while the image slides inside them."""
        u = self.u
        kw = P / K
        for k in range(K):
            d = abs(k - (K - 1) / 2) / ((K - 1) / 2)
            s = t0 + d * 0.9
            p = prog(T, s, s + dur)
            if reverse:
                p = 1 - p
            if p <= 0:
                continue
            e = eo(p)
            xa, xb = int(k * kw), int((k + 1) * kw) - (1 if k < K - 1 else 0)
            half = int(e * P / 2)
            ra, rb = P // 2 - half, P // 2 + half
            off = int((1 - e) ** 2 * (170 * u) * (1 if k % 2 else -1))
            seg = np.roll(view[:, xa:xb], off, axis=0)[ra:rb]
            br = 1 + (.7 * (1 - e) if flash else 0)
            sub = F.img[y0 + ra:y0 + rb, x0 + xa:x0 + xb]
            sub += (np.clip(seg * br, 0, 1) - sub) * alpha
            if p < 1:   # leading edges as bright hairlines
                F.rect(x0 + xa, y0 + ra, x0 + xb, y0 + ra + max(1, int(u)), BRIGHT, .9 * alpha)
                F.rect(x0 + xa, y0 + rb - max(1, int(u)), x0 + xb, y0 + rb, BRIGHT, .9 * alpha)

    # ---------------------------------------------------------- overlays
    def chrome(self, F, f, T):
        u, S, M = self.u, self.S, self.M
        a = eo(prog(T, .3, 1.0)) * (1 - eio(prog(T, 26.3, 27.0)))
        if a <= 0:
            return
        L, tk, ins = int(30 * u), max(1, int(round(u))), int(40 * u)
        for (x, y, sx, sy) in ((ins, ins, 1, 1), (S - ins, ins, -1, 1), (ins, S - ins, 1, -1), (S - ins, S - ins, -1, -1)):
            F.rect(min(x, x + sx * L), y if sy == 1 else y - tk, max(x, x + sx * L), (y + tk) if sy == 1 else y, BONE, .45 * a)
            F.rect(x if sx == 1 else x - tk, min(y, y + sy * L), (x + tk) if sx == 1 else x, max(y, y + sy * L), BONE, .45 * a)
        # timecode (mm:ss:ff)
        s = f"{int(T // 60):02d}:{int(T % 60):02d}:{int((T % 1) * self.cfg.fps):02d}"
        cv = np.zeros((S, S), np.float32)
        tx0 = S - ins - int(len(s) * self.mono_adv) - int(4 * u)
        for i, ch in enumerate(s):
            g = self.mono_masks[ch]
            if g:
                paste_max(cv, g[0], tx0 + i * self.mono_adv, S - ins - int(14 * u) + g[2])
        F.ink(cv, ASH, .95 * a, box=(tx0 - 4, S - ins - int(40 * u), S - ins, S - ins))
        # scene index (scrambles to its value at each beat start)
        beats = [(0.8, "01"), (5.6, "02"), (10.6, "03"), (16.6, "04"), (21.8, "05")]
        cur = max([b for b in beats if T >= b[0]], key=lambda b: b[0], default=None)
        if cur:
            lab = cur[1]
            cv = np.zeros((S, S), np.float32)
            for i, ch in enumerate(lab):
                if T < cur[0] + .45 and (f // 2) % 3:
                    ch = "0123456789"[(f * 7 + i * 3) % 10]
                g = self.mono_masks[ch]
                paste_max(cv, g[0], ins + int(4 * u) + i * self.mono_adv, S - ins - int(14 * u) + g[2])
            F.ink(cv, FOG, .9 * a, box=(ins, S - ins - int(40 * u), ins + int(80 * u), S - ins))

    # ------------------------------------------------------------ beats
    def beat1(self, F, f, T):
        u, S, M = self.u, self.S, self.M
        # hairline rules draw down the frame, then retract
        xs = np.linspace(M, S - M, 13).astype(int)
        for i, x in enumerate(xs):
            p = eo(prog(T, .8 + .045 * i, 1.8 + .045 * i))
            out = eio(prog(T, 5.2 + .03 * i, 5.9 + .03 * i))
            y0, y1 = int(out * S), int(p * S)
            if y1 > y0:
                self.vrule(F, x, y0, y1, FOG if i % 4 == 0 else SILVER, .8 if i % 4 == 0 else .45)
        # bars slam in, then retract to hairlines
        if 1.95 <= T < 2.55:
            q = 1.0 if T < 2.1 else 1 - eio(prog(T, 2.1, 2.5))
            for x in (M - int(14 * u), S - M - int(14 * u)):
                F.rect(x, 0, x + int(28 * u), S, BONE, q)
        # grain-edged sweep reveals the words in its wake
        xc = -90 * u + (S + 180 * u) * eio(prog(T, 2.35, 4.7))
        thr = clamp(1.3 * eio(prog(T, 5.0, 5.9)) - .3 * (self.yg / S))
        for w in (self.w_nothing, self.w_onscreen):
            x0, y0, x1, y1 = w.box
            field = (xc - self.xg[:, x0:x1] + 70 * u) / (120 * u)
            keep = (self.N2[y0:y1, x0:x1] > thr[y0:y1]).astype(np.float32)
            m = w.full[y0:y1, x0:x1] * self.reveal_noise(field, self.N[y0:y1, x0:x1]) * keep
            sub = F.img[y0:y1, x0:x1]
            sub += (BONE - sub) * m[..., None]
        if 2.35 <= T < 4.85:
            fa = eio(prog(T, 2.35, 2.7)) * (1 - eio(prog(T, 4.5, 4.85)))
            band = self.grain_band(f, xc, 70 * u)
            core = self.grain_band(f, xc, 7 * u, amp=6, spread=14)
            F.ink(band, FOG, .55 * fa)
            F.ink(core, BONE, .95 * fa)

    def beat2(self, F, f, T):
        u, S, M = self.u, self.S, self.M
        # slit rows: outlined bars with a grey core block (reference rows)
        rows = 7
        ys = np.linspace(150 * u, S - 150 * u, rows)
        for i, y in enumerate(ys):
            st = 5.7 + .09 * i
            p = eo(prog(T, st, st + .9)) * (1 - eio(prog(T, 7.0 + .05 * i, 7.8 + .05 * i)))
            if p <= 0:
                continue
            wr, h = 888 * u * p, int(16 * u)
            xa, xb = int(S / 2 - wr / 2), int(S / 2 + wr / 2)
            y = int(y)
            self.hrule(F, y, xa, xb, SILVER, .9)
            self.hrule(F, y + h, xa, xb, SILVER, .9)
            self.vrule(F, xa, y - int(5 * u), y + h + int(5 * u), SILVER, .9)
            self.vrule(F, xb - 1, y - int(5 * u), y + h + int(5 * u), SILVER, .9)
            cb = 130 * u * eo(prog(T, st + .35, st + 1.0)) * p
            F.rect(S / 2 - cb / 2, y + 2, S / 2 + cb / 2, y + h, ASH, .95)
        # "just": tracking collapse
        wj = self.w_just
        if T >= 6.6:
            p = eio(prog(T, 6.7, 7.9))
            fl = (self.w_just.letters)
            ps = [l["cx"] for l in fl if l]
            cxm = np.mean(ps)
            dx = [((l["cx"] - cxm) * 3.2 * (1 - p)) if l else 0 for l in fl]
            ex = 1 - eio(prog(T, 9.25, 9.9))
            self._ink_word(F, wj, dx=dx, a=[p ** .8 * ex] * len(fl))
        # "appears.": letters rise from under the baseline, with overshoot
        wa = self.w_appears
        n = len(wa.letters)
        dy, al = [], []
        for k in range(n):
            st = 7.3 + .06 * k
            p = prog(T, st, st + .6)
            dy.append((1 - eback(p)) * wa.size * .95)
            al.append(1.0 if p > 0 else 0.0)
        # exit: per-letter scramble then lift away
        scr = np.zeros((S, S), np.float32)
        for k, l in enumerate(wa.letters):
            if not l:
                continue
            q = prog(T, 9.3 + .055 * k, 9.3 + .055 * k + .55)
            if q > 0:
                al[k] = max(0.0, 1 - q * 3)
                dy[k] -= q * 30 * u
                if q < .85:
                    self.put_scramble(scr, l["cx"], wa.baseline - q * 30 * u, f // 2 + k * 5, int(80 * u))
        if T >= 7.3:
            cv = wa.render(dy=dy, a=al)
            cut = int(wa.baseline + .30 * wa.size)
            cv[cut:] = 0
            x0, y0, x1, y1 = wa.box
            y1 = min(self.S, int(y1 + 140 * u))
            F.ink(cv, BONE, 1.0, box=(x0, y0, x1, y1))
            if scr.any():
                F.ink(scr, FOG, .9)
        # strike-through rule: arrives, then is wiped away
        xs0 = M
        xs1 = S - M
        y = int(wa.baseline - .27 * wa.size)
        pa = eo(prog(T, 8.75, 9.2))
        pb = eio(prog(T, 9.9, 10.5))
        if pa > 0:
            self.hrule(F, y, int(xs0 + (xs1 - xs0) * pb), int(xs0 + (xs1 - xs0) * pa), BONE, 1.0, w=int(4 * u))

    def _ink_word(self, F, w, dx=None, dy=None, a=None, color=BONE):
        cv = w.render(dx=dx, dy=dy, a=a)
        F.ink(cv, color, 1.0, box=(max(0, w.box[0] - int(500 * self.u)), w.box[1] - 4, min(self.S, w.box[2] + int(500 * self.u)), w.box[3] + 4))

    def beat3(self, F, f, T):
        u, S, M = self.u, self.S, self.M
        P = self.P
        x0 = y0 = int(96 * u)
        pan = np.sin(T * .35) * 18 * u
        ox = int((self.pp - P) / 2 + pan * .6)
        oy = int((self.pp - P) / 2 + (1 - prog(T, 10.4, 16.6)) * 30 * u)
        view = self.plate[oy:oy + P, ox:ox + P].copy()
        # shade the lower third so the type sits in the dark
        g = np.linspace(0, 1, P, dtype=np.float32)[:, None]
        view *= (1 - .78 * clamp((g - .45) / .5) ** 1.3)[..., None]
        # slow slit-scan wobble while it arrives
        self.blinds(F, T, 10.6, 1.0, x0, y0, P, view, reverse=False)
        close = prog(T, 15.7, 16.6)
        if close > 0:
            # blinds closing: repaint the black over the plate, bars shrinking
            F.img[y0:y0 + P, x0:x0 + P] = VOID
            self.blinds(F, T, 15.7, 0.8, x0, y0, P, view, reverse=True, flash=False)
        # moire mesh converges on the line of type
        wb = self.w_it_arrives
        bx = (wb.box[0] - int(26 * u), wb.box[1] - int(26 * u), wb.box[2] + int(26 * u), wb.box[3] + int(26 * u))
        self.mesh(F, T, 12.3, 14.0, bx, fade=1 - eio(prog(T, 14.0, 14.6)) * .75)
        # the line wipes in with a grain edge once the mesh has locked
        if T > 13.4:
            sx0, sy0, sx1, sy1 = wb.box
            wp = eio(prog(T, 13.6, 14.5))
            field = (sx0 - 40 * u + (sx1 - sx0 + 120 * u) * wp - self.xg[:, sx0:sx1]) / (90 * u)
            thr = clamp(1.2 * eio(prog(T, 15.6, 16.5)) - .2 * (self.yg / S))
            keep = (self.N2[sy0:sy1, sx0:sx1] > thr[sy0:sy1]).astype(np.float32)
            m = wb.full[sy0:sy1, sx0:sx1] * self.reveal_noise(field, self.N[sy0:sy1, sx0:sx1]) * keep
            sub = F.img[sy0:sy1, sx0:sx1]
            ex = 1 + .5 * np.exp(-(T - 14.5) * 3.0) if T > 14.5 else 1.0
            sub += (np.clip(BONE * ex, 0, 1) - sub) * m[..., None]
            # locked frame rule around the type
            fa = eio(prog(T, 14.0, 14.6)) * (1 - eio(prog(T, 15.6, 16.2)))
            if fa > 0:
                bx0, by0, bx1, by1 = bx
                t = max(1, int(u))
                F.rect(bx0, by0, bx1, by0 + t, BONE, .55 * fa)
                F.rect(bx0, by1 - t, bx1, by1, BONE, .55 * fa)
                F.rect(bx0, by0, bx0 + t, by1, BONE, .55 * fa)
                F.rect(bx1 - t, by0, bx1, by1, BONE, .55 * fa)

    def beat4(self, F, f, T):
        u, S, M = self.u, self.S, self.M
        a_in = eo(prog(T, 16.7, 17.6))
        a_out = 1 - eio(prog(T, 21.1, 21.9))
        ga = a_in * a_out
        # faint field of rules with travelling ticks
        if ga > 0:
            for i, y in enumerate(np.linspace(M, S - M, 9).astype(int)):
                self.hrule(F, y, M, int(M + (S - 2 * M) * eo(prog(T, 16.7 + .04 * i, 17.9))) , ASH, .28 * a_out)
            for i, x in enumerate(np.linspace(M, S - M, 9).astype(int)):
                self.vrule(F, x, M, int(M + (S - 2 * M) * eo(prog(T, 16.8 + .04 * i, 18.0))), ASH, .28 * a_out)
            tx = int(M + ((T * 160 * u) % (S - 2 * M)))
            F.rect(tx - 2, M - 3, tx + 3, M + 4, BONE, .8 * a_out)
            ty = int(M + (S - 2 * M) - ((T * 120 * u) % (S - 2 * M)))
            F.rect(S - M - 3, ty - 2, S - M + 4, ty + 3, BONE, .8 * a_out)
        thr = clamp(1.3 * eio(prog(T, 21.1, 21.9)) - .3 * (self.yg / S))
        # "and": glyph scramble resolves left to right
        w = self.w_and
        q = [prog(T, 16.9 + .18 * k, 17.15 + .18 * k) for k in range(3)]
        scr = np.zeros((S, S), np.float32)
        dn = [1.0 if q[k] >= 1 else 0.0 for k in range(3)]
        for k, l in enumerate(w.letters):
            if l and 0 < q[k] < 1:
                self.put_scramble(scr, l["cx"], w.baseline, f * 3 + k * 11, int(64 * u))
        cv = w.render(a=dn)
        # "how": thin slats open across the word
        w2 = self.w_how
        x0b, y0b, x1b, y1b = w2.box
        slats = 18
        sw = (x1b - x0b) / slats
        mask = np.zeros((y1b - y0b, x1b - x0b), np.float32)
        for k in range(slats):
            st = 17.7 + .035 * abs(k - slats / 2)
            p = eo(prog(T, st, st + .55))
            if p <= 0:
                continue
            hh = int(p * (y1b - y0b) / 2)
            ya, yb = (y1b - y0b) // 2 - hh, (y1b - y0b) // 2 + hh
            mask[ya:yb, int(k * sw):int((k + 1) * sw) + 1] = 1
        cv2 = np.zeros((S, S), np.float32)
        cv2[y0b:y1b, x0b:x1b] = w2.full[y0b:y1b, x0b:x1b] * mask
        # "it": a flash bar exposes it
        w3 = self.w_it
        ex = 1.0
        cv3 = np.zeros((S, S), np.float32)
        if T >= 18.85:
            cv3 = w3.full.copy()
            ex = 1 + 1.6 * np.exp(-(T - 18.85) * 5)
        if 18.78 <= T < 18.95:
            bx0, by0, bx1, by1 = w3.box
            F.rect(bx0 - int(20 * u), 0, bx1 + int(20 * u), S, BONE, .95 * a_out)
        # "arrives": letters slide in from alternating sides with motion blur
        w4 = self.w_arrives
        n = len(w4.letters)
        dx, al = [], []
        maxv = 0.0
        for k in range(n):
            st = 19.55 + .06 * k
            p = prog(T, st, st + .9)
            e = eexp(p)
            side = -1 if k % 2 else 1
            dx.append(side * (1 - e) * 760 * u)
            al.append(1.0 if p > 0 else 0.0)
            maxv = max(maxv, (1 - e) * 760 * u)
        cv4 = w4.render(dx=dx, a=al) if T >= 19.55 else np.zeros((S, S), np.float32)
        if maxv > 4 * u and cv4.any():
            cv4 = gaussian_filter1d(cv4, max(.1, maxv * .035), axis=1)
        for cvx, col, mult in ((cv, BONE, 1.0), (cv2, BONE, 1.0), (cv3, BONE, ex), (cv4, BONE, 1.0)):
            m = cvx * (self.N2 > thr)
            if m.any():
                F.ink(m, np.clip(col * mult, 0, 1), 1.0)
        if scr.any():
            F.ink(scr, FOG, .9)

    def beat5(self, F, f, T):
        u, S, M = self.u, self.S, self.M
        out = 1 - eio(prog(T, 26.2, 27.0))
        # two framing hairlines draw down the centre
        for x, d in ((int(S * .34), 0), (int(S * .66), .12)):
            p = eo(prog(T, 21.9 + d, 22.9 + d))
            ret = eio(prog(T, 26.0 + d, 26.8))
            if p > 0:
                self.vrule(F, x, int(ret * S), int(p * S), SILVER, .85 * out)
        # "is the": tracking narrows into place
        w = self.w_is_the
        p = eio(prog(T, 22.5, 23.6))
        ps = [l["cx"] for l in w.letters if l]
        cxm = np.mean(ps)
        dx = [((l["cx"] - cxm) * 2.4 * (1 - p)) if l else 0 for l in w.letters]
        self._ink_word(F, w, dx=dx, a=[p ** .7 * out] * len(w.letters), color=FOG)
        # "message.": a bar slams across, then opens a slit that reveals the word
        wm = self.w_message
        x0, y0, x1, y1 = wm.box
        yc = (y0 + y1) // 2
        if 23.3 <= T < 23.55:
            F.rect(0, y0 - int(30 * u), S, y1 + int(30 * u), BONE, .96)
        p = eio(prog(T, 23.55, 24.9))
        if p > 0:
            half = p * ((y1 - y0) / 2 + 30 * u)
            ra, rb = int(yc - half), int(yc + half)
            ra, rb = max(ra, 0), min(rb, S)
            ex = 1 + 1.4 * np.exp(-(T - 23.55) * 2.4)
            m = wm.full[ra:rb, x0:x1]
            dyn = self.dyn_noise(f)[ra:rb, x0:x1]
            edge = clamp((half - np.abs(self.yg[ra:rb] - yc)) / (22 * u))
            m = m * (edge > dyn * .9)
            sub = F.img[ra:rb, x0:x1]
            sub += (np.clip(BONE * ex, 0, 1) - sub) * (m * out)[..., None]
            if p < 1:
                self.hrule(F, ra, x0, x1, BRIGHT, .9, w=max(1, int(u)))
                self.hrule(F, rb - 1, x0, x1, BRIGHT, .9, w=max(1, int(u)))

    # ------------------------------------------------------------ render
    def frame(self, f):
        T = f / self.cfg.fps
        F = Frame(self.S)
        F.clear()
        if T >= .8:
            if T < 5.9:
                self.beat1(F, f, T)
            if 5.6 <= T < 10.9:
                self.beat2(F, f, T)
            if 10.5 <= T < 17.0:
                self.beat3(F, f, T)
            if 16.5 <= T < 22.1:
                self.beat4(F, f, T)
            if T >= 21.6:
                self.beat5(F, f, T)
        self.chrome(F, f, T)
        img = F.img
        for gt in (5.62, 10.62, 16.62, 21.82):
            if gt <= T < gt + .1:
                self.glitch(img, f, 1.0)
        rng = np.random.default_rng(self.cfg.seed + f)
        img *= self.vig
        img += rng.standard_normal((self.S, self.S, 1)).astype(np.float32) * .013
        return (np.clip(img, 0, 1) * 255 + .5).astype(np.uint8)


# ------------------------------------------------------------------ driver
def main():
    ap = argparse.ArgumentParser(description="ARRIVALS typographic motion piece")
    ap.add_argument("--save", help="output .mp4")
    ap.add_argument("--still", type=float, help="render one frame at this time (s)")
    ap.add_argument("--out", default="frame.png", help="png path for --still")
    ap.add_argument("--sheet", help="write a contact sheet png of key moments")
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--size", type=int, default=1080)
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--image", default=str(HERE / "assets" / "voidrunner.webp"))
    ap.add_argument("--fonts", default=str(HERE / "fonts"))
    args = ap.parse_args()
    cfg = Config(size=args.size, fps=args.fps)
    piece = Piece(cfg, args.image, args.fonts)
    n = int(round(cfg.duration * cfg.fps))

    if args.still is not None:
        Image.fromarray(piece.frame(int(round(args.still * cfg.fps)))).save(args.out)
        print("saved", args.out)
    if args.sheet:
        times = [2.0, 3.4, 4.4, 6.4, 7.8, 9.2, 11.4, 13.2, 14.8, 18.0, 19.0, 20.2, 22.6, 23.4, 24.4, 25.6]
        tiles = [Image.fromarray(piece.frame(int(t * cfg.fps))).resize((360, 360), Image.LANCZOS) for t in times]
        sheet = Image.new("RGB", (360 * 4, 360 * 4))
        for i, im in enumerate(tiles):
            sheet.paste(im, ((i % 4) * 360, (i // 4) * 360))
        sheet.save(args.sheet)
        print("saved", args.sheet)
    if args.save:
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
               "-s", f"{cfg.size}x{cfg.size}", "-r", str(cfg.fps), "-i", "-",
               "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
               "-movflags", "+faststart", args.save]
        pipe = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        for f in range(n):
            pipe.stdin.write(piece.frame(f).tobytes())
            if f % 30 == 0:
                print(f"frame {f}/{n}", flush=True)
        pipe.stdin.close()
        pipe.wait()
        print("saved", args.save)
    if args.preview or not (args.save or args.still is not None or args.sheet):
        import matplotlib.pyplot as plt
        from matplotlib.animation import FuncAnimation
        print("pre-rendering preview...")
        cache = [piece.frame(f) for f in range(n)]
        fig = plt.figure(figsize=(7, 7), facecolor="black")
        ax = fig.add_axes([0, 0, 1, 1])
        ax.set_axis_off()
        im = ax.imshow(cache[0])
        anim = FuncAnimation(fig, lambda i: (im.set_data(cache[i % n]), [im])[1], frames=n,
                             interval=1000 / cfg.fps, blit=True)
        plt.show()


if __name__ == "__main__":
    main()
