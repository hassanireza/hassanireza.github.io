"""ORACLE - a halftone portrait holding a scrying orb, rendered entirely in code.

Inspired by the stippled-figure-with-crystal-ball style: the portrait you supply is
re-printed as a fixed stipple dither (so the dots stay put while light moves through
them), the black water in front of her is a real wave simulation, and the orb is an
RGB dot-matrix lens with chromatic flare chains.

Pipeline
  1  portrait: grade + local contrast -> luminance field (cover image supplied by you)
  2  oil water: leapfrog wave solve, pulses from the orb; ripples bend a mirrored copy of
     the portrait and catch the orb light as concentric glints (foreshortened plane)
  3  orb light rakes across chin / chest, pulsing with each heartbeat
  4  everything above becomes stationary-threshold stipple dither on a dark fog ground
  5  orb: lens-refracted smoke + miniature sigil + HER FACE, halftone RGB dots, dotted rim
  6  chromatic flare chains, dust, bloom on the orb only, vignette

Usage:
    python oracle.py --image abyssal-bloom.webp --save oracle.mp4   # 1920x1080 (16:9), 25 fps, 4 s loop
    python oracle.py --image abyssal-bloom.webp --preview --size 540
    python oracle.py --image abyssal-bloom.webp --still frame.png --frame 12
Requires: numpy, scipy, pillow, ffmpeg on PATH (video), matplotlib (preview only).
"""
import argparse
import subprocess
from dataclasses import dataclass

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates, zoom

TAU = 2 * np.pi


@dataclass(frozen=True)
class Config:
    size: int = 1920             # frame width; height = 9/16 of it (16:9)
    fps: int = 25
    frames: int = 100            # 4 s seamless loop
    grid: int = 560              # wave solver grid
    ppc: float = 4.0             # water-plane pixels per sim cell (at 1350 px tall reference)
    water_line: float = 0.70     # where the waterline sits, fraction of frame height
    top_pad: float = 0.09        # headroom above the portrait (head dissolves into fog)
    sub: int = 3
    warm: int = 3
    c2: float = 0.25
    wavelength: float = 12.0
    pulse_amp: float = 0.30
    margin: int = 46
    water_y: float = 0.545       # waterline as a fraction of the source image height
    foreshorten: float = 0.50    # vertical squash of the water plane
    relief: float = 26.0         # ripple slope -> reflection displacement (px)
    orb_r: float = 0.175         # orb radius, fraction of width
    cell: int = 2                # stipple cell in px at 1080 wide
    seed: int = 1313


# ------------------------------------------------------------------ helpers
def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def band(x, c, w, soft):
    return 1 - smoothstep(w, w + soft, np.abs(x - c))


def seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy + 1e-9), 0, 1)
    return np.hypot(px - (ax + t * dx), py - (ay + t * dy))


def ricker(tau, f0):
    y = (np.pi * f0 * tau) ** 2
    return (1 - 2 * y) * np.exp(-y)




GLYPHS = [  # segments in slot space: u tangent, v radial (both about -1..1)
    [(0, -1, 0, 1), (0, .1, .55, .85), (0, -.3, .55, .45)],
    [(-.5, -1, 0, -.05), (0, -.05, .5, -1), (0, -.05, 0, 1), (-.35, .6, .35, .6)],
    [(0, -1, .5, 0), (.5, 0, 0, 1), (0, 1, -.5, 0), (-.5, 0, 0, -1), (0, -.2, 0, .2)],
    [(-.4, -1, .4, -.35), (.4, -.35, -.4, .35), (-.4, .35, .4, 1)],
]


def sigil(xn, yn, phi):
    """Procedural occult ceiling. 6/12/36/180-fold symmetric motions -> seamless loop."""
    r = np.hypot(xn, yn)
    th = np.arctan2(yn, xn)
    E = np.full(r.shape, 0.03, np.float32)

    for r0, w, I in [(.945, .0030, 1.6), (.965, .0016, 1.0), (.78, .0026, 1.5), (.665, .0020, 1.1),
                     (.575, .0026, 1.2), (.425, .0030, 1.6), (.445, .0014, 0.9), (.20, .0030, 1.3)]:
        E += I * band(r, r0, w, .0032)

    # tick ring (rotates 12 deg per loop = 6 ticks)
    step = TAU / 180
    a = (th - 6 * step * phi) / step
    idx = np.round(a)
    da = (a - idx) * step * r
    long = (np.mod(idx, 10) == 0)
    rhi = np.where(long, .915, .89)
    rad = smoothstep(.838, .842, r) * (1 - smoothstep(rhi - .002, rhi, r))
    E += 1.5 * band(da, 0, .0011, .0016) * rad

    # rune ring (60 deg per loop, 4 designs x 6 repeats)
    rmid, hb, slot = .722, .047, TAU / 24
    ar = th - (-(TAU / 6) * phi)
    kk = np.floor(ar / slot)
    loc = ar - kk * slot - slot / 2
    sel = np.abs(r - rmid) < hb * 1.5
    ii = np.nonzero(sel)
    u = (loc[ii] * r[ii] / hb).astype(np.float32)
    v = ((r[ii] - rmid) / hb).astype(np.float32)
    kd = np.mod(kk[ii], 4).astype(int)
    g = np.zeros(u.shape, np.float32)
    for j, segs in enumerate(GLYPHS):
        d = np.full(u.shape, 9.0, np.float32)
        for ax, ay, bx, by in segs:
            d = np.minimum(d, seg_dist(u, v, ax * .9, ay * .78, bx * .9, by * .78))
        g = np.where(kd == j, band(d, 0, .065, .11), g)
    ring = np.zeros_like(r)
    ring[ii] = g
    E += 2.0 * ring

    # hexagram (60 deg per loop)
    Rh, rot = .572, (TAU / 6) * phi
    V = [(Rh * np.cos(rot + k * TAU / 6), Rh * np.sin(rot + k * TAU / 6)) for k in range(6)]
    d = np.full(r.shape, 9.0, np.float32)
    for tri in ((0, 2, 4), (1, 3, 5)):
        for i in range(3):
            A, B = V[tri[i]], V[tri[(i + 1) % 3]]
            d = np.minimum(d, seg_dist(xn, yn, A[0], A[1], B[0], B[1]))
    E += 2.0 * band(d, 0, .0020, .0030)

    # twelve nodes (counter-rotating, 30 deg per loop)
    nst = TAU / 12
    an = (th + nst * phi) / nst
    dn = np.hypot((an - np.round(an)) * nst * r, r - .485)
    E += 1.8 * band(dn, .024, .0024, .0030) + 1.6 * band(dn, 0, .0060, .0040)

    # radial shafts + core glow
    rays = (.5 + .5 * np.cos(36 * (th - (TAU / 36) * phi))) ** 28
    E += .30 * rays * np.exp(-r * 2.2) * smoothstep(.34, .46, r)
    E += 1.6 * np.exp(-(r / .30) ** 2)
    return E




# ------------------------------------------------------------------- solver
PULSE_T = np.array([0.0, 0.5])
PULSE_A = np.array([1.6, 1.0])


def solve(cfg):
    N, c0 = cfg.grid, cfg.grid // 2
    f0 = 0.5 / cfg.wavelength
    total = cfg.frames * cfg.sub
    times = PULSE_T * total
    yy, xx = np.mgrid[0:N, 0:N]
    m = np.minimum.reduce([xx, yy, N - 1 - xx, N - 1 - yy])
    damp = (np.where(m < cfg.margin, 0.2 * (1 - m / cfg.margin) ** 3, 0.0) + 0.0004).astype(np.float32)
    inv = 1.0 / (1.0 + damp)
    k = (np.sqrt(cfg.c2) - 1) / (np.sqrt(cfg.c2) + 1)
    a = np.zeros((N, N), np.float32)
    b = np.zeros_like(a)
    out = np.zeros((cfg.frames, N, N), np.float32)
    s = 0
    for cycle in range(cfg.warm + 1):
        for fr in range(cfg.frames):
            if cycle == cfg.warm:
                out[fr] = a
            for _ in range(cfg.sub):
                p = np.pad(a, 1, mode="edge")
                lap = p[1:-1, :-2] + p[1:-1, 2:] + p[:-2, 1:-1] + p[2:, 1:-1] - 4 * a
                nxt = (2 * a - b * (1 - damp) + cfg.c2 * lap) * inv
                nxt[:, 0] = a[:, 1] + k * (nxt[:, 1] - a[:, 0])
                nxt[:, -1] = a[:, -2] + k * (nxt[:, -2] - a[:, -1])
                nxt[0, :] = a[1, :] + k * (nxt[1, :] - a[0, :])
                nxt[-1, :] = a[-2, :] + k * (nxt[-2, :] - a[-1, :])
                b, a = a, nxt
                for t0, w in zip(times, PULSE_A):
                    d = ((s % total - t0) + total * 1.5) % total - total / 2
                    if abs(d) < 46:
                        q = ricker(d, f0) * w * cfg.pulse_amp
                        a[c0, c0] += q
                        a[c0, c0 + 1] += q * .5
                        a[c0, c0 - 1] += q * .5
                        a[c0 + 1, c0] += q * .5
                        a[c0 - 1, c0] += q * .5
                s += 1
    return out


def pulse_glow(phi):
    g = 0.0
    for t0, w in zip(PULSE_T, PULSE_A):
        d = (phi - t0) % 1.0
        g += w * np.exp(-d / 0.09) * (1 - np.exp(-d / 0.015))
    return g


# ----------------------------------------------------------------- portrait
def load_portrait(path, W, H, wy_frac_src, wline, top_pad):
    """Scale the portrait so its waterline lands at wline*H (with top_pad*H of headroom),
    centre it on a W x H canvas, and dissolve its hard top/side edges into the fog."""
    im = Image.open(path).convert("L")
    w0, h0 = im.size
    top = int(top_pad * H)
    sc = (wline * H - top) / (wy_frac_src * h0)
    pw, ph = round(w0 * sc), round(h0 * sc)
    im = im.resize((pw, ph), Image.LANCZOS)
    g = np.asarray(im, np.float32) / 255.0
    lo, hi = np.percentile(g, 1), np.percentile(g, 99.6)
    y = np.clip((g - lo) / (hi - lo), 0, 1) ** 0.72
    y = y + 0.7 * (y - gaussian_filter(y, 2.2 * H / 1350))        # local contrast for the stipple
    y = np.clip(y, 0, 1.15)
    canvas = np.zeros((H, W), np.float32)
    x0 = (W - pw) // 2
    rows = min(H - top, ph)
    xs0, xs1 = max(x0, 0), min(x0 + pw, W)
    canvas[top:top + rows, xs0:xs1] = y[:rows, xs0 - x0:xs1 - x0]
    fx = np.minimum(np.arange(W) - x0, x0 + pw - 1 - np.arange(W)).astype(np.float32)
    canvas *= smoothstep(0, 60 * H / 1350, fx)[None, :]
    canvas *= smoothstep(top, top + 0.13 * H, np.arange(H, dtype=np.float32))[:, None]   # hairline dissolves
    return canvas, top + int(round(wy_frac_src * ph)), top + 0.194 * ph


# ------------------------------------------------------------------- scene
class Scene:
    def __init__(self, cfg, image):
        self.cfg = cfg
        W = int(round(cfg.size / 6)) * 6
        H = int(round(W * 9 / 16 / 6)) * 6        # even, divisible by 2 and 3 (codec + bloom)
        self.W, self.H = W, H
        self.sc = H / 1350                         # all dimensions scale from frame height
        self.U = 1080 * self.sc                    # reference 'unit' (old frame width)
        self.Y0, self.wy, self.face_y = load_portrait(image, W, H, cfg.water_y, cfg.water_line, cfg.top_pad)
        self.cx = W / 2
        self.R = cfg.orb_r * self.U
        self.cy0 = self.wy - 0.115 * self.U
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        self.xx, self.yy = xx, yy
        self.wy0 = max(0, self.wy - 14)
        # water-plane sampling grid into the solver (foreshortened)
        ppc = cfg.ppc * self.sc
        N = cfg.grid
        self.gxs = (N / 2 + (xx[self.wy0:] - self.cx) / ppc).astype(np.float32)
        self.gys = (N / 2 + (yy[self.wy0:] - self.wy) / (ppc * cfg.foreshorten)).astype(np.float32)
        r = np.hypot(*np.mgrid[0:N, 0:N] - N / 2)
        self.gain = np.minimum(26, 7.5 * np.sqrt(1 + r / 5)).astype(np.float32)
        ux, uy = xx[self.wy0:] - self.cx, (yy[self.wy0:] - self.wy) / cfg.foreshorten
        rr = np.hypot(ux, uy) + 1e-3
        self.ux, self.uy, self.rr = ux / rr, uy / rr, rr
        # stipple threshold: interleaved gradient noise (no visible tiling)
        self.cell = max(1, round(cfg.cell * self.sc))
        hs, ws = H // self.cell, W // self.cell
        iy, ix = np.mgrid[0:hs, 0:ws].astype(np.float32)
        self.thr = np.mod(52.9829189 * np.mod(0.06711056 * ix + 0.00583715 * iy, 1.0), 1.0)
        rng = np.random.default_rng(cfg.seed)
        self.smoke = gaussian_filter(rng.standard_normal((96, 96)), 2.0, mode="wrap")
        self.smoke /= self.smoke.std()
        self.smoke2 = gaussian_filter(rng.standard_normal((96, 96)), 1.0, mode="wrap")
        self.smoke2 /= self.smoke2.std()
        n = 200
        self.mote = dict(x=rng.uniform(0, W, n), y=rng.uniform(0, H, n), ax=rng.uniform(4, 24, n),
                         ay=rng.uniform(4, 24, n), px=rng.uniform(0, TAU, n), py=rng.uniform(0, TAU, n),
                         k=rng.integers(1, 4, n), b=rng.uniform(.25, 1.0, n))
        ne = 650
        self.ember = dict(x=rng.uniform(0, W, ne), y=rng.uniform(0, H, ne), p=rng.uniform(0, 1, ne),
                          rise=rng.uniform(70, 260, ne) * self.sc, sway=rng.uniform(5, 30, ne) * self.sc,
                          k=rng.integers(1, 3, ne), ph=rng.uniform(0, TAU, ne), b=rng.uniform(.35, 1.0, ne))
        self.fog_hw = (.35 + .65 * smoothstep(0, .55, np.abs(np.linspace(-1, 1, W)))).astype(np.float32)
        self.rn = np.hypot((xx - W / 2) / (W / 2), (yy - H * .45) / (H / 2))

    # ---- water + portrait luminance
    def luminance(self, u, phi, glow):
        cfg, W, H, wy = self.cfg, self.W, self.H, self.wy
        cy = self.cy0 + 0.008 * self.U * np.sin(TAU * phi)
        Y = self.Y0.copy()
        # orb light rakes upward over chin / chest
        d = np.hypot((self.xx - self.cx) / 1.1, (self.yy - cy) * 1.25)
        Y *= 1 + (.35 + .75 * glow) * np.exp(-(d / (.62 * self.U)) ** 2)
        # ---- ripples sampled on the foreshortened water plane
        z = u * self.gain
        z = z / (1 + np.abs(z) * .22)
        gy, gx = np.gradient(z)
        P = [self.gys, self.gxs]
        hs = map_coordinates(z, P, order=1, mode="nearest")
        sxl = map_coordinates(gx, P, order=1, mode="nearest")
        syl = map_coordinates(gy, P, order=1, mode="nearest")
        yw = self.yy[self.wy0:]
        xw = self.xx[self.wy0:]
        depth = np.maximum(yw - wy, 0)
        # mirrored portrait, displaced by ripple slope, fading with depth
        k = cfg.relief * self.sc
        ys = wy - depth + syl * k * 2.0
        xs = xw + sxl * k
        refl = map_coordinates(self.Y0, [np.clip(ys, 0, H - 1), np.clip(xs, 0, W - 1)], order=1, mode="nearest")
        att = np.exp(-depth / (210 * self.sc)) * 0.62
        # crest glints facing the orb
        sr = sxl * self.ux + syl * self.uy
        fall = np.exp(-(self.rr / (1.05 * self.U)) ** 2)
        glint = np.clip(-sr * 2.2, 0, 1) ** 1.3 * fall * (.45 + .9 * glow)
        # reflected orb pool of light
        ell = np.hypot(xw - self.cx, (yw - (wy + .10 * self.U)) / .55)
        pool = np.exp(-(ell / (self.R * 1.05)) ** 2) * (.45 + .8 * glow) * (1 + .5 * np.clip(-sr * 3, 0, 1))
        Yw = refl * att + glint + pool
        wmask = smoothstep(wy - 4, wy + 6, yw + hs * 1.5)
        Y[self.wy0:] = Y[self.wy0:] * (1 - wmask) + Yw * wmask
        return Y

    def fog(self, phi):
        """Slowly roiling fog banks across the whole frame (turns into drifting sparse dots)."""
        hs, ws = self.H // 4, self.W // 4
        ang = TAU * phi
        gy = np.linspace(0, 1, hs, dtype=np.float32)[:, None] * 46 + 6 * np.sin(ang)
        gx = np.linspace(0, 1, ws, dtype=np.float32)[None, :] * 80 + 6 * np.cos(ang)
        f = map_coordinates(self.smoke, [gy % 96 + 0 * gx, gx % 96 + 0 * gy], order=3, mode="wrap")
        f = np.clip((f - .35) / 1.8, 0, 1) ** 1.6 * .15
        f = zoom(f, (4, 4), order=1)[:self.H, :self.W]
        return f * self.fog_hw[None, :]

    def embers(self, mono, phi):
        e = self.ember
        tt = (phi + e["p"]) % 1.0
        alpha = np.sin(np.pi * tt) ** 2
        x = (e["x"] + e["sway"] * np.sin(TAU * e["k"] * tt + e["ph"])).astype(int)
        y = (e["y"] - e["rise"] * tt).astype(int)
        v = (e["b"] * alpha).astype(np.float32)
        ok = (x > 0) & (x < self.W - 2) & (y > 0) & (y < self.H - 2) & (v > .08)
        sz = 2 if self.sc > .6 else 1
        for dx in range(sz):
            for dy in range(sz):
                np.add.at(mono, (y[ok] + dy, x[ok] + dx), v[ok][:, None] * .85)

    def stipple(self, Y):
        c = self.cell
        Ys = Y.reshape(self.H // c, c, self.W // c, c).mean((1, 3))
        bit = (Ys > self.thr).astype(np.float32)
        return np.kron(bit, np.ones((c, c), np.float32))

    # ---- orb
    def orb(self, L, A, phi, glow):
        cfg, W = self.cfg, self.W
        cy = self.cy0 + 0.008 * self.U * np.sin(TAU * phi)
        Rs = self.R
        n = int(Rs * 1.06) * 2
        ox, oy = int(self.cx - n / 2), int(cy - n / 2)
        py, px = np.mgrid[0:n, 0:n].astype(np.float32)
        dx, dy = px + .5 - n / 2, py + .5 - n / 2
        rho = np.hypot(dx, dy) / Rs
        th = np.arctan2(dy, dx)
        inside = rho < 1
        nz = np.sqrt(np.clip(1 - rho**2, 0, 1))
        mag = .78 + .50 * rho**2
        qx, qy = dx / Rs * mag, dy / Rs * mag
        Ein = sigil(qx, qy, 1 - phi)
        ang = TAU * phi
        sm = 0
        for amp, sc_, rad, grid in ((.55, 2.0, 5, self.smoke), (.32, 4.5, 9, self.smoke2)):
            t = map_coordinates(grid, [qy * sc_ * 8 + 48 + rad * np.sin(ang), qx * sc_ * 8 + 48 + rad * np.cos(ang)],
                                order=3, mode="wrap")
            sm = sm + amp * t
        sm = np.clip(sm * .5 + .35, 0, 1)
        # her face, magnified, seen through the lens
        fx = np.clip(self.cx + qx * 300 * self.sc, 0, self.W - 1)
        fy = np.clip(self.face_y + qy * 300 * self.sc, 0, self.H - 1)
        face = map_coordinates(self.Y0, [fy, fx], order=1, mode="nearest")
        gl = 1 + .9 * glow
        Lm = (.40 * sm**2.3 + .10 * Ein + .62 * face * (.6 + .4 * glow) + .22 * gl * np.exp(-(rho / .38) ** 2)
              + .5 * rho**5) * (.5 + .5 * nz)
        Lm = np.where(inside, Lm, 0).astype(np.float32)

        d = max(4.5, 8.5 * self.sc)
        ch = np.zeros((n, n, 3), np.float32)
        for i, off in enumerate((-1 / 3, 0, 1 / 3)):
            row = np.floor((py + .5) / d)
            xs = (px + .5) / d + off + .5 * np.mod(row, 2)
            cell = np.floor(xs)
            cxp = (cell + .5 - .5 * np.mod(row, 2) - off) * d
            cyp = (row + .5) * d
            Lc = Lm[np.clip(cyp.astype(int), 0, n - 1), np.clip(cxp.astype(int), 0, n - 1)]
            dist = np.hypot(xs - cell - .5, (py + .5) / d - row - .5)
            rad = np.sqrt(np.clip(Lc, 0, 1.4) / 1.4) * .64
            ch[..., i] = (1 - smoothstep(rad - .10, rad + .10, dist)) * np.clip(Lc * 1.6, 0, 1.6)
        rimr = band(rho, .975, .012, .014)
        for i, o2 in enumerate((.35, 0, -.35)):
            ch[..., i] += (.9 + .8 * glow) * rimr * smoothstep(-.1, .3, np.cos(th * 150 + o2))
        hl = .45 * np.exp(-(((dx + .42 * Rs) / (.24 * Rs)) ** 2 + ((dy + .50 * Rs) / (.09 * Rs)) ** 2))
        ch += hl[..., None] * inside[..., None]
        a = np.clip((1 - rho) * Rs / 1.4 + .5, 0, 1)
        col = np.clip(ch * np.array([1.0, .98, .95], np.float32), 0, 1.4) * a[..., None]
        y0, y1, x0, x1 = max(oy, 0), min(oy + n, self.H), max(ox, 0), min(ox + n, self.W)
        L[y0:y1, x0:x1] += col[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
        A[y0:y1, x0:x1] = np.maximum(A[y0:y1, x0:x1], a[y0 - oy:y1 - oy, x0 - ox:x1 - ox])
        return cy

    def flares(self, L, phi, glow, cy):
        Rs = self.R
        S = self.sc
        for n, ph0, rscale, rb0 in [(1, 0.2, 1.00, 19), (-1, 2.4, 1.17, 13), (2, 4.1, 0.84, 10)]:
            a0 = TAU * n * phi + ph0
            for i in range(10):
                a = a0 - i * .085 * np.sign(n)
                rr = Rs * rscale * (1 + .035 * np.sin(5 * a + ph0))
                bx, by = self.cx + rr * np.cos(a), cy + rr * np.sin(a)
                rad = rb0 * S * (1 - .085 * i)
                self._bead(L, bx, by, rad, (1.15 - .10 * i) * (.8 + .5 * glow), a)

    def _bead(self, L, bx, by, rad, inten, ang):
        m = int(rad * 1.6) + 3
        x0, y0 = int(bx) - m, int(by) - m
        xa, xb, ya, yb = max(x0, 0), min(x0 + 2 * m, self.W), max(y0, 0), min(y0 + 2 * m, self.H)
        if xa >= xb or ya >= yb:
            return
        yy, xx = np.mgrid[ya:yb, xa:xb].astype(np.float32)
        ux, uy = np.cos(ang), np.sin(ang)
        for ci in range(3):
            o = (ci - 1) * .42 * rad
            dist = np.hypot(xx + .5 - (bx + ux * o), yy + .5 - (by + uy * o))
            w = np.clip((rad - dist) / (.35 * rad) + .5, 0, 1) * (.55 + .45 * np.clip(dist / rad, 0, 1))
            L[ya:yb, xa:xb, ci] += w * inten * (1.0 if ci == 1 else .92)

    def motes(self, mono, phi):
        m = self.mote
        x = (m["x"] + m["ax"] * np.cos(TAU * phi + m["px"])).astype(int)
        y = (m["y"] + m["ay"] * np.sin(TAU * phi + m["py"])).astype(int)
        tw = .5 + .5 * np.sin(TAU * m["k"] * phi + m["px"])
        v = (m["b"] * (.2 + .8 * tw) * .8).astype(np.float32)
        ok = (x > 0) & (x < self.W - 1) & (y > 0) & (y < self.H - 1)
        sz = 1 if self.sc < 1.5 else 2
        for dx in range(sz):
            for dy in range(sz):
                np.add.at(mono, (y[ok] + dy, x[ok] + dx), v[ok][:, None] * .9)

    def bloom(self, L):
        s = 3
        H, W = self.H, self.W
        hi = np.clip(L - .55, 0, None).reshape(H // s, s, W // s, s, 3).mean((1, 3))
        out = 0
        for sig, k in ((3, .55), (14, .45)):
            b = gaussian_filter(hi, (sig * self.sc + .5, sig * self.sc + .5, 0))
            out = out + k * zoom(b, (s, s, 1), order=1)
        return out

    def frame(self, fields, f):
        cfg = self.cfg
        phi = f / cfg.frames
        glow = pulse_glow(phi)
        Y = self.luminance(fields[f], phi, glow)
        Y += self.fog(phi)
        Y *= (1 - .55 * smoothstep(.55, 1.05, self.rn))
        Y = np.clip((Y - .07) / .93, 0, 1.2)            # crush shadows -> sparse, scattered dots
        bit = self.stipple(Y)
        bg = np.array([.078, .080, .086], np.float32) * (1 - .45 * smoothstep(.5, 1.05, self.rn))[..., None]
        bone = np.array([.90, .89, .85], np.float32)
        mono = bg + (bone - bg) * bit[..., None]
        self.embers(mono, phi)
        self.motes(mono, phi)
        L = np.zeros((self.H, self.W, 3), np.float32)
        A = np.zeros((self.H, self.W), np.float32)
        cy = self.orb(L, A, phi, glow)
        self.flares(L, phi, glow, cy)
        img = mono * (1 - A[..., None]) + L + self.bloom(L)
        return (np.clip(img, 0, 1) * 255 + .5).astype(np.uint8)


# ------------------------------------------------------------------- driver
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", default="abyssal-bloom.webp", help="portrait cover image")
    ap.add_argument("--save")
    ap.add_argument("--still")
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--size", type=int, default=1920, help="frame width (snapped to a multiple of 6); height = 9/16")
    ap.add_argument("--frame", type=int, default=12)
    ap.add_argument("--seconds", type=float, default=4.0)
    ap.add_argument("--fps", type=int, default=25)
    args = ap.parse_args()
    cfg = Config(size=args.size, fps=args.fps, frames=int(round(args.seconds * args.fps)))
    print("solving ripples...")
    fields = solve(cfg)
    sc = Scene(cfg, args.image)

    if args.still:
        Image.fromarray(sc.frame(fields, args.frame % cfg.frames)).save(args.still)
        print("saved", args.still)
    if args.save:
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
               "-s", f"{sc.W}x{sc.H}", "-r", str(cfg.fps), "-i", "-",
               "-c:v", "libx264", "-preset", "slow", "-crf", "12", "-pix_fmt", "yuv420p",
               "-movflags", "+faststart", args.save]
        pipe = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        for i in range(cfg.frames):
            pipe.stdin.write(sc.frame(fields, i).tobytes())
            if i % 10 == 0:
                print(f"frame {i}/{cfg.frames}")
        pipe.stdin.close()
        pipe.wait()
        print("saved", args.save)
    if args.preview or not (args.save or args.still):
        import matplotlib.pyplot as plt
        from matplotlib.animation import FuncAnimation
        print("pre-rendering preview...")
        cache = [sc.frame(fields, i) for i in range(cfg.frames)]
        fig = plt.figure(figsize=(12, 6.75), facecolor="black")
        ax = fig.add_axes([0, 0, 1, 1])
        ax.set_axis_off()
        im = ax.imshow(cache[0])
        anim = FuncAnimation(fig, lambda i: (im.set_data(cache[i % len(cache)]), [im])[1],
                             frames=len(cache), interval=1000 / cfg.fps, blit=True)
        plt.show()


if __name__ == "__main__":
    main()