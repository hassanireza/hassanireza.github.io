"""SCRYING BASIN - generative occult motion piece (pure numpy/scipy, no assets).

A crystal sphere floats above a basin of black oil. Each time the sphere pulses it
sends ripples across the oil; the oil mirrors a rotating ceiling of sigils, rune ring,
hexagram and star-nodes, and the ripples bend that reflection. The sphere itself is a
halftone RGB dot-matrix lens that holds a miniature of the same sigil, with chains of
chromatic flares orbiting its rim. Palette: void / charcoal / ash / silver / bone.

Pipeline (same spirit as the wave renderer):
  1 leapfrog wave solve, centre pulses, looped schedule + warm-up cycles
  2 oil mirror: normals from ripple heights -> reflect straight-down view to a sigil ceiling
  3 Fresnel + dark amber body + filmic tone-map -> brand ramp grade
  4 sphere: lens-refracted inner sigil + smoke -> halftone RGB dot matrix, dotted rim
  5 orbiting chromatic flare chains, dust motes, bloom, vignette, grain, dither

Usage:
    python scrying_basin.py --save scrying_basin.mp4            # 1080x1080, 30 fps, 6 s loop
    python scrying_basin.py --preview --size 540                # fast preview window
    python scrying_basin.py --still frame.png --frame 24
Requires: numpy, scipy, pillow, ffmpeg on PATH (video), matplotlib (preview only).
"""
import argparse
import subprocess
from dataclasses import dataclass

import numpy as np
from scipy.ndimage import gaussian_filter, map_coordinates, zoom

TAU = 2 * np.pi


@dataclass(frozen=True)
class Config:
    size: int = 1080
    fps: int = 30
    frames: int = 180            # 6 s seamless loop
    grid: int = 360              # wave solver grid (cells)
    sub: int = 3                 # solver steps per frame
    warm: int = 3
    c2: float = 0.25
    wavelength: float = 13.0     # cells
    pulse_amp: float = 0.34
    margin: int = 46
    relief: float = 0.021        # ripple slope -> reflection bend
    ceiling: float = 300.0       # reflected ceiling distance (cells)
    env_gain: float = 3.0        # brightness of the sigil ceiling
    sphere_r: float = 0.34       # sphere radius, fraction of half-frame
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


HEX = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255
RAMP_G = np.array([0, .10, .28, .48, .72, 1.0], np.float32)
RAMP_C = np.stack([HEX(h) for h in ("#050608", "#0d1013", "#3a4248", "#7c8891", "#c9cfd2", "#e6e3da")])


# ------------------------------------------------------------------ solver
PULSE_GAPS = np.array([1, .55, 1.6, .8, 1.25])
PULSE_AMPS = np.array([1.7, .7, 1.1, .6, 1.0])


def pulse_times(cfg):
    total = cfg.frames * cfg.sub
    return np.cumsum(np.r_[0, PULSE_GAPS[:-1]]) / PULSE_GAPS.sum() * total, total


def solve(cfg):
    N = cfg.grid
    c0 = N // 2
    f0 = 0.5 / cfg.wavelength
    times, total = pulse_times(cfg)
    yy, xx = np.mgrid[0:N, 0:N]
    m = np.minimum.reduce([xx, yy, N - 1 - xx, N - 1 - yy])
    damp = (np.where(m < cfg.margin, 0.2 * (1 - m / cfg.margin) ** 3, 0.0) + 0.0003).astype(np.float32)
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
                for t0, w in zip(times, PULSE_AMPS):
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


def pulse_glow(cfg, phi):
    """0..~1.5: how recently the sphere pulsed (drives glow so light and ripples agree)."""
    times, total = pulse_times(cfg)
    g = 0.0
    for t0, w in zip(times, PULSE_AMPS):
        d = (phi - t0 / total) % 1.0
        g += w * np.exp(-d / 0.07) * (1 - np.exp(-d / 0.012))
    return g


# ------------------------------------------------------------ sigil ceiling
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


# ----------------------------------------------------------------- renderer
class Scene:
    def __init__(self, cfg):
        self.cfg = cfg
        S = cfg.size
        self.S = S
        self.ppc = S / cfg.grid                         # pixels per sim cell
        yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
        self.xn = (xx + .5 - S / 2) / (S / 2)
        self.yn = (yy + .5 - S / 2) / (S / 2)
        self.rn = np.hypot(self.xn, self.yn)
        cy, cx = np.mgrid[0:cfg.grid, 0:cfg.grid]
        r = np.hypot(cx - cfg.grid / 2, cy - cfg.grid / 2)
        self.gain = np.minimum(26, 7.5 * np.sqrt(1 + r / 5)).astype(np.float32)
        rng = np.random.default_rng(cfg.seed)
        self.imp = [gaussian_filter(rng.standard_normal((S, S)), 2.5 * S / 1080 + .5).astype(np.float32) * 0.0005
                    for _ in range(2)]
        self.film = (1 + gaussian_filter(rng.standard_normal((S, S)), 30 * S / 1080) * 3.0).clip(.8, 1.25).astype(np.float32)
        self.smoke = gaussian_filter(rng.standard_normal((96, 96)), 2.0, mode="wrap")
        self.smoke /= self.smoke.std()
        self.smoke2 = gaussian_filter(rng.standard_normal((96, 96)), 1.0, mode="wrap")
        self.smoke2 /= self.smoke2.std()
        # dust motes (bob in place -> loop closes)
        n = 240
        self.mote = dict(x=rng.uniform(-1, 1, n), y=rng.uniform(-1, 1, n), ax=rng.uniform(.01, .05, n),
                         ay=rng.uniform(.01, .05, n), px=rng.uniform(0, TAU, n), py=rng.uniform(0, TAU, n),
                         k=rng.integers(1, 4, n), b=rng.uniform(.25, 1.0, n))
        self.grain_rng = np.random.default_rng(cfg.seed + 7)
        yb, xb = np.mgrid[0:S, 0:S]
        bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16 - .5
        self.bayer = np.tile(bayer, (S // 4 + 1, S // 4 + 1))[:S, :S]

    # ---- oil mirror
    def oil(self, u, phi):
        c, S = self.cfg, self.S
        z = u * self.gain
        z = z / (1 + np.abs(z) * .22)
        h = zoom(z, S / c.grid, order=3, mode="nearest")[:S, :S].astype(np.float32)
        gy, gx = np.gradient(h)
        sx = gx * self.ppc * c.relief + self.imp[0]
        sy = gy * self.ppc * c.relief + self.imp[1]
        n = 1 / np.sqrt(1 + sx**2 + sy**2)
        nx, ny, nz = -sx * n, -sy * n, n
        rx, ry, rz = 2 * nz * nx, 2 * nz * ny, 2 * nz**2 - 1
        t = c.ceiling / np.maximum(rz, .05) / (c.grid / 2)
        E = sigil(self.xn + rx * t, self.yn + ry * t, phi)
        F0 = .045
        fres = F0 + (1 - F0) * (1 - nz) ** 5
        body = np.array([.0030, .0023, .0015], np.float32)
        lin = body + (fres * E * c.env_gain * self.film)[..., None] * np.array([1, .975, .92], np.float32)
        x = lin * .95
        x = (x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14)
        g = np.clip(x, 0, 1) ** (1 / 2.2)
        gm = g.mean(-1)
        out = np.stack([np.interp(gm, RAMP_G, RAMP_C[:, i]) for i in range(3)], -1).astype(np.float32)
        return out

    # ---- sphere lens (halftone RGB dot matrix)
    def sphere(self, img, phi, glow):
        c, S = self.cfg, self.S
        Rs = c.sphere_r * S / 2
        n = int(Rs * 1.06) * 2
        o = S // 2 - n // 2
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
        smoke = 0
        for amp, sc, rad, grid in ((.55, 2.0, 5, self.smoke), (.32, 4.5, 9, self.smoke2)):
            sm = map_coordinates(grid, [qy * sc * 8 + 48 + rad * np.sin(ang), qx * sc * 8 + 48 + rad * np.cos(ang)],
                                 order=3, mode="wrap")
            smoke = smoke + amp * sm
        smoke = np.clip(smoke * .5 + .35, 0, 1)
        gl = 1 + .9 * glow
        L = (.55 * smoke**2.3 + .13 * Ein + .26 * gl * np.exp(-(rho / .38) ** 2) + .55 * rho**5) * (.5 + .5 * nz)
        L = np.where(inside, L, 0).astype(np.float32)

        d = max(4.5, 8.5 * S / 1080)
        ch = np.zeros((n, n, 3), np.float32)
        for i, off in enumerate((-1 / 3, 0, 1 / 3)):
            row = np.floor((py + .5) / d)
            xs = (px + .5) / d + off + .5 * np.mod(row, 2)
            cell = np.floor(xs)
            cxp = (cell + .5 - .5 * np.mod(row, 2) - off) * d
            cyp = (row + .5) * d
            Lc = L[np.clip(cyp.astype(int), 0, n - 1), np.clip(cxp.astype(int), 0, n - 1)]
            dist = np.hypot(xs - cell - .5, (py + .5) / d - row - .5)
            rad = np.sqrt(np.clip(Lc, 0, 1.4) / 1.4) * .64
            ch[..., i] = (1 - smoothstep(rad - .10, rad + .10, dist)) * np.clip(Lc * 1.6, 0, 1.6)
        # dotted rim, chroma-split
        rimr = band(rho, .975, .012, .014)
        for i, o2 in enumerate((.35, 0, -.35)):
            dots = smoothstep(-.1, .3, np.cos(th * 150 + o2))
            ch[..., i] += (.9 + .8 * glow) * rimr * dots
        # glass highlight + darker bottom
        hl = .45 * np.exp(-(((dx + .42 * Rs) / (.24 * Rs)) ** 2 + ((dy + .50 * Rs) / (.09 * Rs)) ** 2))
        ch += hl[..., None] * inside[..., None]
        a = np.clip((1 - rho) * Rs / 1.4 + .5, 0, 1)[..., None]
        tint = np.array([1.0, .98, .95], np.float32)
        col = np.clip(ch * tint, 0, 1.4)
        sl = (slice(o, o + n), slice(o, o + n))
        img[sl] = img[sl] * (1 - a) + col * a
        return img

    # ---- flares: chains of chromatic bokeh beads orbiting the rim
    def flares(self, img, phi, glow):
        S = self.S
        Rs = self.cfg.sphere_r * S / 2
        chains = [(1, 0.2, 1.00, 20), (-1, 2.4, 1.17, 14), (2, 4.1, 0.84, 11)]
        for n, ph0, rscale, rb0 in chains:
            a0 = TAU * n * phi + ph0
            for i in range(10):
                a = a0 - i * .085 * np.sign(n)
                rr = Rs * rscale * (1 + .035 * np.sin(5 * a + ph0))
                bx, by = S / 2 + rr * np.cos(a), S / 2 + rr * np.sin(a)
                rad = rb0 * (S / 1080) * (1 - .085 * i)
                inten = (1.15 - .10 * i) * (.8 + .5 * glow)
                self._bead(img, bx, by, rad, inten, a)
        return img

    def _bead(self, img, bx, by, rad, inten, ang):
        S = self.S
        m = int(rad * 1.6) + 3
        x0, y0 = int(bx) - m, int(by) - m
        xa, xb, ya, yb = max(x0, 0), min(x0 + 2 * m, S), max(y0, 0), min(y0 + 2 * m, S)
        if xa >= xb or ya >= yb:
            return
        yy, xx = np.mgrid[ya:yb, xa:xb].astype(np.float32)
        ux, uy = np.cos(ang), np.sin(ang)
        for ci in range(3):
            o = (ci - 1) * .42 * rad
            dist = np.hypot(xx + .5 - (bx + ux * o), yy + .5 - (by + uy * o))
            w = np.clip((rad - dist) / (.35 * rad) + .5, 0, 1) * (.55 + .45 * np.clip(dist / rad, 0, 1))
            img[ya:yb, xa:xb, ci] += w * inten * (1.0 if ci == 1 else .92)

    def motes(self, img, phi):
        S, m = self.S, self.mote
        x = m["x"] + m["ax"] * np.cos(TAU * phi + m["px"])
        y = m["y"] + m["ay"] * np.sin(TAU * phi + m["py"])
        tw = .5 + .5 * np.sin(TAU * m["k"] * phi + m["px"])
        v = (m["b"] * (.25 + .75 * tw)).astype(np.float32)
        ix = ((x + 1) * S / 2).astype(int)
        iy = ((y + 1) * S / 2).astype(int)
        ok = (ix > 1) & (ix < S - 2) & (iy > 1) & (iy < S - 2)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                wk = .5 if (dx == 0 and dy == 0) else (.18 if dx * dy == 0 else .06)
                np.add.at(img, (iy[ok] + dy, ix[ok] + dx), (v[ok] * wk * .8)[:, None] * np.array([.9, .92, 1.0], np.float32))
        return img

    def bloom(self, img):
        S = self.S
        hi = np.clip(img - .70, 0, None)
        s = 4
        small = hi.reshape(S // s, s, S // s, s, 3).mean((1, 3))
        out = 0
        for sig, k in ((3, .55), (14, .45)):
            b = gaussian_filter(small, (sig * S / 1080 / 1.0 + .5, sig * S / 1080 / 1.0 + .5, 0))
            out = out + k * zoom(b, (s, s, 1), order=1)
        return img + out

    def frame(self, fields, f):
        cfg, S = self.cfg, self.S
        phi = f / cfg.frames
        glow = pulse_glow(cfg, phi)
        img = self.oil(fields[f], phi)
        # sphere halo on the oil + contact shadow
        Rs = cfg.sphere_r
        halo = (.035 + .08 * glow) * np.exp(-((self.rn - Rs) / .16) ** 2) * (self.rn > Rs - .02)
        shadow = 1 - .45 * np.exp(-((self.rn - Rs * 1.04) / .03) ** 2)
        img = img * shadow[..., None] + halo[..., None] * np.array([.55, .60, .66], np.float32)
        img = self.sphere(img, phi, glow)
        img = self.flares(img, phi, glow)
        img = self.motes(img, phi)
        img = self.bloom(img)
        vig = 1 - .90 * smoothstep(.42, 1.02, self.rn)
        img = img * vig[..., None]
        lum = img.mean(-1, keepdims=True)
        gr = self.grain_rng.standard_normal((S, S, 1)).astype(np.float32)
        img = img + gr * (.010 + .014 * np.clip(1 - lum, 0, 1)) * (.4 + .6 * np.clip(lum * 4, 0, 1))
        img = img + self.bayer[..., None] / 255
        return (np.clip(img, 0, 1) * 255 + .5).astype(np.uint8)


# ------------------------------------------------------------------- driver
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--save")
    ap.add_argument("--still")
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--size", type=int, default=1080)
    ap.add_argument("--frame", type=int, default=24)
    ap.add_argument("--seconds", type=float, default=6.0)
    ap.add_argument("--fps", type=int, default=30)
    args = ap.parse_args()
    assert args.size % 4 == 0, "--size must be a multiple of 4"
    cfg = Config(size=args.size, fps=args.fps, frames=int(args.seconds * args.fps))

    print("solving ripples...")
    fields = solve(cfg)
    sc = Scene(cfg)

    if args.still:
        from PIL import Image
        Image.fromarray(sc.frame(fields, args.frame % cfg.frames)).save(args.still)
        print("saved", args.still)
    if args.save:
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
               "-s", f"{cfg.size}x{cfg.size}", "-r", str(cfg.fps), "-i", "-",
               "-c:v", "libx264", "-preset", "slow", "-crf", "12", "-pix_fmt", "yuv420p",
               "-movflags", "+faststart", args.save]
        pipe = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        for i in range(cfg.frames):
            pipe.stdin.write(sc.frame(fields, i).tobytes())
            if i % 15 == 0:
                print(f"frame {i}/{cfg.frames}")
        pipe.stdin.close()
        pipe.wait()
        print("saved", args.save)
    if args.preview or not (args.save or args.still):
        import matplotlib.pyplot as plt
        from matplotlib.animation import FuncAnimation
        print("pre-rendering preview...")
        cache = [sc.frame(fields, i) for i in range(cfg.frames)]
        fig = plt.figure(figsize=(7, 7), facecolor="black")
        ax = fig.add_axes([0, 0, 1, 1])
        ax.set_axis_off()
        im = ax.imshow(cache[0])
        anim = FuncAnimation(fig, lambda i: (im.set_data(cache[i % len(cache)]), [im])[1],
                             frames=len(cache), interval=1000 / cfg.fps, blit=True)
        plt.show()


if __name__ == "__main__":
    main()
