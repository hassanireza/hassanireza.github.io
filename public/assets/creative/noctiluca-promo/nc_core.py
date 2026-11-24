"""NOCTILUCA promo - render core.

Canvas (uint8 luminance + warm accent), kinetic type engine, point-cloud particle system with
exact critically damped springs, ridge-line wave surface, and the post chain (bloom, streaks,
chromatic split, grain, vignette). Everything is authored in a 1920x1080 design space and scaled
by `G.u`, so the same code renders a 480x270 draft or the 1920x1080 master.
"""
import re
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


cv2.setNumThreads(1)
HERE = Path(__file__).resolve().parent
TAU = 2 * np.pi

# ------------------------------------------------------------------ brand (tokens.css / ART_DIRECTION.md)
def HEX(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32)

VOID, DEEP, ASH, FOG = HEX("#08090b"), HEX("#12161a"), HEX("#7f8589"), HEX("#9aa3a8")
SILVER, BRIGHT, BONE = HEX("#7c8891"), HEX("#c9cfd2"), HEX("#e6e3da")
CHAMP = HEX("#d9b9a6")          # warm champagne rose: logo / flashes only

RAMP_G = np.array([0, .10, .30, .55, .80, 1.0], np.float32)
RAMP_C = np.stack([VOID, DEEP, ASH * .75, SILVER, BRIGHT, BONE])
LUT = np.stack([np.interp(np.linspace(0, 1, 256), RAMP_G, RAMP_C[:, c]) for c in range(3)], -1).astype(np.uint8)


class G:                      # global render geometry
    W, H, u, fps = 1920, 1080, 1.0, 30
    dw, dh = 1920.0, 1080.0


def setup(width, height=None):
    """16:9 (1920x1080 design space) or portrait 9:16 (1080x1920 design space)."""
    G.W = int(width)
    G.H = int(height) if height else int(round(width * 9 / 16))
    G.u = G.W / (1920.0 if G.W >= G.H else 1080.0)
    G.dw, G.dh = G.W / G.u, G.H / G.u


# ------------------------------------------------------------------ easing
def clamp(x, a=0.0, b=1.0):
    return np.clip(x, a, b)

def prog(t, a, b):
    return float(np.clip((t - a) / (b - a), 0, 1)) if b != a else float(t >= a)

def eo(x):
    x = clamp(x); return 1 - (1 - x) ** 3

def eo5(x):
    x = clamp(x); return 1 - (1 - x) ** 5

def eio(x):
    x = clamp(x); return x * x * (3 - 2 * x)

def eexp(x):
    x = clamp(x); return np.where(x >= 1, 1.0, 1 - 2 ** (-10 * x))

def ei(x):
    x = clamp(x); return x ** 3

def lerp(a, b, k):
    return a + (b - a) * k


# ------------------------------------------------------------------ event envelopes
class Env:
    """Per-frame envelopes from the shared score. `since` = seconds since the last event."""

    def __init__(self, nframes, events, fps=30):
        self.ev = events
        self.n = nframes
        self.t = np.arange(nframes) / fps
        self.cache = {}

    def times(self, name, kind=None):
        key = (name, kind if not isinstance(kind, (list, tuple)) else tuple(kind))
        if key not in self.cache:
            lst = [(t, s) for t, s, x in self.ev[name] if kind is None or (x in (kind if isinstance(kind, (list, tuple)) else [kind]))]
            self.cache[key] = (np.array([a for a, _ in lst]), np.array([b for _, b in lst]))
        return self.cache[key]

    def since(self, name, i, kind=None):
        ts, ss = self.times(name, kind)
        if len(ts) == 0:
            return 99.0, 0.0
        t = self.t[i] + 1e-6
        k = np.searchsorted(ts, t, side="right") - 1
        if k < 0:
            return 99.0, 0.0
        return float(t - ts[k]), float(ss[k])

    def pulse(self, name, i, decay=0.15, kind=None):
        d, s = self.since(name, i, kind)
        return float(s * np.exp(-d / decay))

    def count(self, name, i, kind=None):
        ts, _ = self.times(name, kind)
        return int(np.searchsorted(ts, self.t[i] + 1e-6, side="right"))

    def index_since(self, name, i, kind=None):
        """index (0-based) of the last event, -1 if none."""
        return self.count(name, i, kind) - 1


# ------------------------------------------------------------------ canvas
class Canvas:
    def __init__(self):
        self.L = np.zeros((G.H, G.W), np.uint8)
        self.A = np.zeros((G.H, G.W), np.uint8)

    def clear(self):
        self.L[:] = 0
        self.A[:] = 0

    # sub-pixel AA primitives (shift = 4 bits)
    def line(self, p0, p1, v=255, th=1.0, layer="L"):
        img = self.L if layer == "L" else self.A
        u = G.u
        cv2.line(img, (int(round(p0[0] * u * 16)), int(round(p0[1] * u * 16))),
                 (int(round(p1[0] * u * 16)), int(round(p1[1] * u * 16))), int(v), max(1, int(round(th * u))), cv2.LINE_AA, 4)

    def poly(self, pts, v=255, th=1.0, closed=False, layer="L"):
        img = self.L if layer == "L" else self.A
        u = G.u
        a = np.round(np.asarray(pts, np.float32) * u * 16).astype(np.int32).reshape(-1, 1, 2)
        cv2.polylines(img, [a], closed, int(v), max(1, int(round(th * u))), cv2.LINE_AA, 4)

    def fill_poly(self, pts, v=255, layer="L"):
        img = self.L if layer == "L" else self.A
        u = G.u
        a = np.round(np.asarray(pts, np.float32) * u * 16).astype(np.int32).reshape(-1, 1, 2)
        cv2.fillPoly(img, [a], int(v), cv2.LINE_AA, 4)

    def ring(self, c, r, v=255, th=1.0, a0=0, a1=360, layer="L"):
        img = self.L if layer == "L" else self.A
        u = G.u
        R = int(round(r * u * 16))
        if R < 1:
            return
        cv2.ellipse(img, (int(round(c[0] * u * 16)), int(round(c[1] * u * 16))), (R, R), 0, a0, a1, int(v), max(1, int(round(th * u))), cv2.LINE_AA, 4)

    def disc(self, c, r, v=255, layer="L"):
        img = self.L if layer == "L" else self.A
        u = G.u
        R = int(round(r * u * 16))
        if R < 1:
            return
        cv2.circle(img, (int(round(c[0] * u * 16)), int(round(c[1] * u * 16))), R, int(v), -1, cv2.LINE_AA, 4)

    def ellipse(self, c, rx, ry, ang=0.0, v=255, th=1.0, a0=0, a1=360, layer="L"):
        img = self.L if layer == "L" else self.A
        u = G.u
        cv2.ellipse(img, (int(round(c[0] * u * 16)), int(round(c[1] * u * 16))), (max(1, int(round(rx * u * 16))), max(1, int(round(ry * u * 16)))),
                    ang, a0, a1, int(v), max(1, int(round(th * u))), cv2.LINE_AA, 4)

    def rect(self, x0, y0, x1, y1, v=255, layer="L"):
        img = self.L if layer == "L" else self.A
        u = G.u
        x0, x1 = int(round(x0 * u)), int(round(x1 * u))
        y0, y1 = int(round(y0 * u)), int(round(y1 * u))
        x0, y0 = max(x0, 0), max(y0, 0)
        x1, y1 = min(x1, G.W), min(y1, G.H)
        if x1 > x0 and y1 > y0:
            img[y0:y1, x0:x1] = np.maximum(img[y0:y1, x0:x1], int(v))

    def add_img(self, m8, layer="L"):
        img = self.L if layer == "L" else self.A
        cv2.add(img, m8, img)


def blit(dst, src, x, y, alpha=1.0, op="max"):
    """paste uint8 `src` at pixel (x, y) (already in device px) into `dst` with clipping."""
    h, w = src.shape[:2]
    x, y = int(round(x)), int(round(y))
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, dst.shape[1]), min(y + h, dst.shape[0])
    if x1 <= x0 or y1 <= y0 or alpha <= 0:
        return
    s = src[y0 - y:y1 - y, x0 - x:x1 - x]
    if alpha < 0.999:
        s = (s.astype(np.float32) * alpha).astype(np.uint8)
    d = dst[y0:y1, x0:x1]
    if op == "max":
        np.maximum(d, s, out=d)
    else:
        cv2.add(d, s, d)


# ------------------------------------------------------------------ type engine
FONT_FILES = {
    "serif": "CormorantGaramond-Italic[wght].ttf",
    "serifup": "CormorantGaramond[wght].ttf",
    "sans": "Jost[wght].ttf",
    "mono": "JetBrainsMono[wght].ttf",
}
_font_cache = {}


def font(kind, size, wght):
    key = (kind, int(size), int(wght))
    if key not in _font_cache:
        f = ImageFont.truetype(str(HERE / "fonts" / FONT_FILES[kind]), max(4, int(size)))
        try:
            f.set_variation_by_axes([wght])
        except Exception:
            pass
        _font_cache[key] = f
    return _font_cache[key]


class Word:
    """A string laid out glyph by glyph (design-space size), each letter its own uint8 mask."""

    def __init__(self, text, kind="serif", size=200, wght=400, tracking=0.0, upper=False):
        self.text = text.upper() if upper else text
        self.kind, self.size, self.wght = kind, size, wght
        px = size * G.u
        f = font(kind, px, wght)
        self.f = f
        self.tracking = tracking
        self.letters = []
        total = f.getlength(self.text)
        asc, desc = f.getmetrics()
        self.asc, self.desc = asc, desc
        self.width = total + tracking * G.u * max(0, len(self.text) - 1)
        for i, ch in enumerate(self.text):
            adv = f.getlength(self.text[:i]) + (tracking * G.u * i)
            if ch.strip() == "":
                self.letters.append(None)
                continue
            l, t, r, b = f.getbbox(ch, anchor="ls")
            pad = 2
            im = Image.new("L", (r - l + 2 * pad, b - t + 2 * pad), 0)
            ImageDraw.Draw(im).text((-l + pad, -t + pad), ch, font=f, fill=255, anchor="ls")
            self.letters.append(dict(m=np.asarray(im, np.uint8), ox=adv + l - pad, oy=t - pad, cx=adv + f.getlength(ch) / 2, ch=ch, adv=adv))
        self.n = len(self.text)
        self._buf = None

    def render(self, tr=0.0, dx=None, dy=None, a=None, pad=40):
        """compose to a uint8 buffer; returns (buf, ox, oy) with (ox, oy) = buffer origin relative to
        the baseline-left anchor. tr = extra tracking per letter (design px)."""
        u = G.u
        n = self.n
        extra = tr * u
        wid = int(self.width + extra * max(0, n - 1) + 2 * pad * u + 4)
        hgt = int(self.asc + self.desc + 2 * pad * u + 6)
        buf = np.zeros((hgt, wid), np.uint8)
        base_y = pad * u + self.asc
        # shift so that centre stays put when tr changes: caller handles alignment
        for i, l in enumerate(self.letters):
            if l is None:
                continue
            ai = 1.0 if a is None else (a if np.isscalar(a) else a[i])
            if ai <= 0:
                continue
            x = pad * u + l["ox"] + extra * i + (0 if dx is None else (dx if np.isscalar(dx) else dx[i]) * u)
            y = base_y + l["oy"] + (0 if dy is None else (dy if np.isscalar(dy) else dy[i]) * u)
            blit(buf, l["m"], x, y, ai, "max")
        return buf, -pad * u, -base_y

    def full(self):
        if self._buf is None:
            self._buf = self.render()
        return self._buf


def mblur(buf, length):
    k = int(length * G.u)
    if k < 2:
        return buf
    return cv2.blur(buf, (k, 1))


def scale_buf(buf, sx, sy):
    if abs(sx - 1) < 1e-3 and abs(sy - 1) < 1e-3:
        return buf
    h, w = buf.shape[:2]
    nw, nh = max(2, int(w * sx)), max(2, int(h * sy))
    return cv2.resize(buf, (nw, nh), interpolation=cv2.INTER_LINEAR if (sx > 1 or sy > 1) else cv2.INTER_AREA)


def draw_word(cv, w, x, y, align="left", alpha=1.0, tr=0.0, dx=None, dy=None, a=None, blur=0.0, sx=1.0, sy=1.0,
              layer="L", op="max", rot=0.0, stroke=0, ghost=0):
    """draw Word `w` with baseline at (x, y) in design px. sx/sy scale about the anchor point."""
    if w.n == 0 or alpha <= 0:
        return
    buf, ox, oy = w.render(tr, dx, dy, a)
    extra = tr * G.u * max(0, w.n - 1)
    total = w.width + extra
    if align == "center":
        ax = -total / 2
    elif align == "right":
        ax = -total
    else:
        ax = 0.0
    if stroke:
        k = max(1, int(stroke * G.u))
        er = cv2.erode(buf, np.ones((k * 2 + 1, k * 2 + 1), np.uint8))
        buf = cv2.subtract(buf, er)
    if blur > 0.5:
        buf = mblur(buf, blur)
    if abs(rot) > 1e-3:
        h, wd = buf.shape[:2]
        pivot = (-ox - ax, -oy)       # anchor point inside the buffer
        M = cv2.getRotationMatrix2D((float(pivot[0]), float(pivot[1])), rot, 1.0)
        buf = cv2.warpAffine(buf, M, (wd, h), flags=cv2.INTER_LINEAR)
    X0, Y0 = ox + ax, oy
    if abs(sx - 1) > 1e-3 or abs(sy - 1) > 1e-3:
        buf = scale_buf(buf, sx, sy)
        X0, Y0 = X0 * sx, Y0 * sy
    img = cv.L if layer == "L" else cv.A
    blit(img, buf, x * G.u + X0, y * G.u + Y0, alpha, op)
    return buf


def text_width(w):
    return w.width / G.u


# ------------------------------------------------------------------ point sets from raster / vector
def points_from_mask(mask, n, rng, w=None):
    ys, xs = np.nonzero(mask > 40)
    if len(xs) == 0:
        return np.zeros((n, 2), np.float32)
    idx = rng.integers(0, len(xs), n)
    return np.stack([xs[idx], ys[idx]], 1).astype(np.float32) + rng.random((n, 2)).astype(np.float32) - 0.5


def word_points(word, n, rng, scale=1.0, center=(0, 0)):
    """point cloud (design-space coords, y down) of a Word, centred."""
    buf, ox, oy = word.render()
    pts = points_from_mask(buf, n, rng)
    pts[:, 0] += ox
    pts[:, 1] += oy
    pts /= G.u
    pts[:, 0] -= word.width / G.u / 2
    pts *= scale
    pts[:, 0] += center[0]
    pts[:, 1] += center[1]
    return pts


def svg_points(png, n, rng, size=900, center=(0, 0), thresh=60, edge_bias=False, invert=False):
    im = cv2.imread(str(png), cv2.IMREAD_UNCHANGED)
    if im is None:
        raise FileNotFoundError(png)
    if im.ndim == 3 and im.shape[2] == 4:
        g = cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2GRAY).astype(np.float32) * (im[..., 3] / 255.0)
    else:
        g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY) if im.ndim == 3 else im
    g = g.astype(np.uint8)
    if invert:
        g = 255 - g
    h, w = g.shape
    s = size / max(w, h)
    ys, xs = np.nonzero(g > thresh)
    wts = g[ys, xs].astype(np.float32) ** 1.5
    wts /= wts.sum()
    idx = rng.choice(len(xs), n, p=wts)
    pts = np.stack([xs[idx], ys[idx]], 1).astype(np.float32) + rng.random((n, 2)).astype(np.float32) - .5
    pts[:, 0] = (pts[:, 0] - w / 2) * s + center[0]
    pts[:, 1] = (pts[:, 1] - h / 2) * s + center[1]
    return pts


# ------------------------------------------------------------------ particles
class Cloud:
    """N particles with per-particle critically damped springs (exact solution, any stiffness)."""

    def __init__(self, n=18000, seed=7):
        self.n = n
        self.rng = np.random.default_rng(seed)
        r = self.rng
        self.pos = ((r.random((n, 3)) - .5) * np.array([2400, 1400, 1600])).astype(np.float32)
        self.vel = np.zeros((n, 3), np.float32)
        self.tgt = self.pos.copy()
        self.omega = np.full(n, 6.0, np.float32)
        self.bright = (0.45 + 0.55 * r.random(n) ** 1.5).astype(np.float32)
        self.sizec = (r.random(n) < 0.18).astype(np.int8)       # most points are 1px, some bigger
        self.order = r.permutation(n)
        self.alpha = np.ones(n, np.float32)
        self.talpha = np.ones(n, np.float32)

    def set_target(self, pts, omega=8.0, stagger=0.0, z=None, zspread=0.0, jitter=0.0, keep_alpha=False):
        """pts (M,2|3) design coords centred on the screen centre. Fewer than n points are re-sampled."""
        pts = np.asarray(pts, np.float32)
        m = len(pts)
        idx = self.order[np.arange(self.n) % m] if m < self.n else self.order[:self.n] % m
        p = pts[idx]
        if p.shape[1] == 2:
            zz = np.zeros(self.n, np.float32) if z is None else np.full(self.n, z, np.float32)
            if zspread:
                zz = zz + (self.rng.random(self.n).astype(np.float32) - .5) * zspread
            p = np.concatenate([p, zz[:, None]], 1)
        if jitter:
            p = p + (self.rng.random((self.n, 3)).astype(np.float32) - .5) * jitter
        self.tgt = p.astype(np.float32)
        om = np.full(self.n, omega, np.float32)
        if stagger:
            om = om * (1 + stagger * (self.rng.random(self.n).astype(np.float32) - .5))
        self.omega = om

    def explode(self, strength=900.0, center=(0, 0, 0), spin=0.0):
        d = self.pos - np.array(center, np.float32)
        dist = np.linalg.norm(d, axis=1, keepdims=True) + 1e-3
        dirn = d / dist
        rnd = self.rng.random((self.n, 1)).astype(np.float32)
        self.vel += dirn * strength * (0.3 + rnd * 1.3)
        if spin:
            self.vel += np.stack([-dirn[:, 1], dirn[:, 0], np.zeros(self.n)], 1).astype(np.float32) * spin * rnd

    def kick(self, amount=60.0):
        self.vel += (self.rng.standard_normal((self.n, 3)) * amount).astype(np.float32)

    def step(self, dt=1 / 30.0):
        d = self.pos - self.tgt
        w = self.omega[:, None]
        e = np.exp(-w * dt)
        tmp = (self.vel + w * d) * dt
        self.pos = self.tgt + (d + tmp) * e
        self.vel = (self.vel - w * tmp) * e
        self.alpha += (self.talpha - self.alpha) * (1 - np.exp(-10 * dt))

    def project(self, yaw=0.0, pitch=0.0, roll=0.0, cam_z=0.0, f=1100.0, cx=0.0, cy=0.0, scale=1.0, tilt_pts=None):
        p = self.pos if tilt_pts is None else tilt_pts
        cyw, syw, cp, sp = np.cos(yaw), np.sin(yaw), np.cos(pitch), np.sin(pitch)
        x = p[:, 0] * cyw + p[:, 2] * syw
        z = -p[:, 0] * syw + p[:, 2] * cyw
        y = p[:, 1] * cp - z * sp
        z = p[:, 1] * sp + z * cp
        if roll:
            cr, sr = np.cos(roll), np.sin(roll)
            x, y = x * cr - y * sr, x * sr + y * cr
        z = z - cam_z
        zc = np.maximum(f + z, 60.0)
        k = f / zc * scale
        return x * k + cx, y * k + cy, k, z


class Splat:
    """Accumulate point sprites into a uint8 layer: bincount then a per-class dilate."""

    def __init__(self):
        self.k = {s: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (s, s)) for s in (2, 3, 4, 5, 7)}

    def draw(self, cv, x, y, w, size=None, layer="L", sizes=None, gain=255.0):
        """x,y device px floats; w weights 0..1; size per point class index into `sizes` px."""
        H, W = G.H, G.W
        xi = np.rint(x).astype(np.int32)
        yi = np.rint(y).astype(np.int32)
        ok = (xi >= 0) & (xi < W) & (yi >= 0) & (yi < H) & (w > 0.002)
        if not ok.any():
            return
        xi, yi, ww = xi[ok], yi[ok], w[ok]
        flat = yi * W + xi
        img = cv.L if layer == "L" else cv.A
        if size is None:
            classes = [(0, np.ones_like(ww, bool))]
        else:
            sz = size[ok]
            classes = [(c, sz == c) for c in np.unique(sz)]
        for c, msk in classes:
            if not msk.any():
                continue
            acc = np.bincount(flat[msk], weights=ww[msk] * gain, minlength=H * W).astype(np.float32).reshape(H, W)
            s = 1 if sizes is None else sizes[int(c)]
            if s > 1:
                acc = cv2.dilate(acc, self_kernel(s))
            cv2.add(img, np.clip(acc, 0, 255).astype(np.uint8), img)


_kern = {}
def self_kernel(s):
    s = max(2, int(round(s * max(G.u, 0.5))))
    if s not in _kern:
        _kern[s] = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (s, s))
    return _kern[s]


# ------------------------------------------------------------------ ridge-line wave surface (point cloud + lines)
class WaveSurface:
    """Joy-Division style ridge lines whose height is driven by kick ripples; crests are dotted."""

    def __init__(self, rows=64, cols=240):
        self.rows, self.cols = rows, cols

    def height(self, X, Z, t, kicks):
        h = np.zeros_like(X)
        d = np.sqrt(X ** 2 + (Z * 1.0) ** 2)
        for (tk, s) in kicks:
            age = t - tk
            if age < 0 or age > 3.0:
                continue
            r = age * 520.0
            w = 120.0 + age * 80
            h += s * 70 * np.exp(-age / 1.3) * np.cos((d - r) / 22.0) * np.exp(-((d - r) / w) ** 2)
        h += 12 * np.sin(X / 70.0 + t * 1.1) * np.cos(Z / 90.0 - t * 0.8)
        return h

    def draw(self, cv, t, kicks, cx=960, cy=640, width=2300, depth=900, tilt=0.0, v=230, fade=1.0, dots=True, span=520.0):
        rows, cols = self.rows, self.cols
        xs = np.linspace(-width / 2, width / 2, cols).astype(np.float32)
        zs = np.linspace(depth / 2, -depth / 2, rows).astype(np.float32)   # far first
        X, Z = np.meshgrid(xs, zs)
        Hh = self.height(X, Z, t, kicks)
        for r in range(rows):
            p = r / (rows - 1)
            k = 0.22 + 0.95 * p
            y0 = cy + tilt + p ** 1.6 * span
            pts = np.stack([cx + X[r] * k, y0 - Hh[r] * k], 1)
            under = np.concatenate([pts, [[pts[-1, 0], 1500], [pts[0, 0], 1500]]], 0)
            cv.fill_poly(under, 0)
            cv.poly(pts, v * (0.3 + 0.7 * p), 1.0 + p)


# ------------------------------------------------------------------ post chain
class Post:
    def __init__(self, seed=5):
        H, W = G.H, G.W
        rng = np.random.default_rng(seed)
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.hypot((xx / W - .5) * 1.0, (yy / H - .5) * 0.9)
        self.vig = (1 - 0.62 * np.clip((r - .30) / .55, 0, 1) ** 1.5).astype(np.float32)
        # soft light from above (brand): gentle elliptical bloom at top centre
        top = np.exp(-(((xx / W - .5) / .55) ** 2 + ((yy / H + .12) / .62) ** 2))
        self.bg = (top * 0.045).astype(np.float32)
        self.noise = (rng.standard_normal((H * 2, W * 2)).astype(np.float32) * 0.5 + rng.random((H * 2, W * 2)).astype(np.float32) - .5)
        self.rng = rng
        self.dither = rng.random((H, W)).astype(np.float32) - .5
        self.warm_bg = np.zeros((H, W), np.float32)

    def run(self, cv, fx):
        """fx dict: bloom, streak, ca (px), grain, flash, flash_warm, fade, zoom, shake=(x,y), invert, glitch(list), wb"""
        H, W = G.H, G.W
        L, A = cv.L, cv.A
        zoom = fx.get("zoom", 1.0)
        sh = fx.get("shake", (0.0, 0.0))
        rot = fx.get("rot", 0.0)
        if abs(zoom - 1) > 1e-3 or sh != (0.0, 0.0) or abs(rot) > 1e-4:
            M = cv2.getRotationMatrix2D((W / 2, H / 2), rot, zoom)
            M[0, 2] += sh[0] * G.u
            M[1, 2] += sh[1] * G.u
            L = cv2.warpAffine(L, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE if zoom < 1 else cv2.BORDER_CONSTANT)
            A = cv2.warpAffine(A, M, (W, H), flags=cv2.INTER_LINEAR)
        for (y0, h, dx) in fx.get("glitch", []):
            y0, h, dx = int(y0 * G.u), int(h * G.u), int(dx * G.u)
            if h > 0 and y0 + h <= H:
                L = L.copy() if L is cv.L else L
                L[y0:y0 + h] = np.roll(L[y0:y0 + h], dx, axis=1)
        if fx.get("invert", 0) > 0:
            L = L.copy() if L is cv.L else L
            k = fx["invert"]
            L = (L.astype(np.float32) * (1 - k) + (255 - L).astype(np.float32) * k).astype(np.uint8)
        f = L.astype(np.float32) * (1 / 255.0)
        # bloom (two scales) + anamorphic streak
        b = fx.get("bloom", 0.45)
        st = fx.get("streak", 0.25)
        if b > 0 or st > 0:
            q = cv2.resize(f, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
            q2 = cv2.resize(q, (max(2, W // 16), max(2, H // 16)), interpolation=cv2.INTER_AREA)
            g1 = cv2.GaussianBlur(q, (0, 0), 2.2)
            g2 = cv2.GaussianBlur(q2, (0, 0), 2.0)
            bl = cv2.resize(g1, (W, H), interpolation=cv2.INTER_LINEAR) * (0.9 * b) + cv2.resize(g2, (W, H), interpolation=cv2.INTER_LINEAR) * (1.6 * b)
            f += bl
            if st > 0:
                hi = np.clip(q - 0.55, 0, None)
                k = max(3, int(W / 4 * 0.35)) | 1
                sk = cv2.blur(hi, (k, 1))
                sk = cv2.GaussianBlur(sk, (0, 0), 1.2)
                f += cv2.resize(sk, (W, H), interpolation=cv2.INTER_LINEAR) * (st * 2.0)
        f += self.bg * (1.0 - fx.get("fade_bg", 0.0))
        fl = fx.get("flash", 0.0)
        if fl > 0:
            f += fl * (0.55 + 0.3 * self.vig)
        f *= self.vig
        # noise: random crop of a big tile, temporally varying
        ox = int(self.rng.integers(0, W)); oy = int(self.rng.integers(0, H))
        gr = self.noise[oy:oy + H, ox:ox + W]
        f += gr * fx.get("grain", 0.022) * (0.4 + 0.6 * np.clip(1 - f, 0, 1))
        f = np.clip(f, 0, 1.0)
        idx = (f * 255 + self.dither).clip(0, 255).astype(np.uint8)
        rgb = LUT[idx]                         # H,W,3
        warm = fx.get("warm", 0.0)
        if warm > 0 or A.any():
            a = (A.astype(np.float32) * (1 / 255.0))
            if warm > 0:
                a = np.maximum(a, warm * np.clip(f * 1.4, 0, 1))
            if fl > 0 and fx.get("flash_warm", 0) > 0:
                a = np.maximum(a, np.full_like(a, fx["flash_warm"] * np.clip(fl, 0, 1)))
            ra = np.clip(a * 0.62, 0, 1)[..., None]
            tint = (np.clip(f, 0, 1)[..., None] * fx.get("tint", CHAMP)).astype(np.float32)
            rgb = (rgb.astype(np.float32) * (1 - ra) + tint * ra + rgb.astype(np.float32) * ra * 0.15).clip(0, 255).astype(np.uint8)
        ca = fx.get("ca", 0.0) * G.u
        if ca >= 1:
            d = int(round(ca))
            rgb[..., 0] = np.roll(rgb[..., 0], d, axis=1)
            rgb[..., 2] = np.roll(rgb[..., 2], -d, axis=1)
        bars = int(fx.get("bars", 0.0) * H)
        if bars > 0:
            rgb[:bars] = 0
            rgb[H - bars:] = 0
        fade = fx.get("fade", 1.0)
        if fade < 0.999:
            rgb = (rgb.astype(np.float32) * fade).astype(np.uint8)
        return rgb


class FFOut:
    def __init__(self, path, fps=30, crf=19, audio=None, preset="medium"):
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{G.W}x{G.H}", "-r", str(fps), "-i", "-"]
        if audio:
            cmd += ["-i", str(audio)]
        cmd += ["-c:v", "libx264", "-preset", preset, "-crf", str(crf), "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart",
                "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709"]
        if audio:
            cmd += ["-c:a", "aac", "-b:a", "256k", "-af", "volume=-1.2dB,alimiter=limit=0.89:attack=2:release=40:level=false", "-shortest"]
        cmd += [str(path)]
        self.p = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    def write(self, rgb):
        self.p.stdin.write(rgb.tobytes())

    def close(self):
        self.p.stdin.close()
        self.p.wait()
