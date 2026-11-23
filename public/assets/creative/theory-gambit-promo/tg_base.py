"""Director base: shared state, helpers, HUD, the payoff-table figure, cloud drawing, FX plumbing."""
import re
from pathlib import Path

import cv2
import numpy as np

import tg_core as c
import tg_score as sc
import tg_shapes as shp
from tg_core import G, Word, draw_word, eo, eo5, eio, ei, eexp, prog, lerp, clamp

TAU = 2 * np.pi
CX, CY = 960.0, 540.0
HC = (1250.0, 520.0)        # hero centre (banner composition: rings on the right)
CHAPTERS = [("I", "The Map of Games"), ("II", "Solution Concepts"), ("III", "The Classic Games"), ("IV", "Time, Repetition and Evolution"),
            ("V", "Information and Mechanisms"), ("VI", "Coalitions and Bargaining"), ("VII", "The Human Mind"),
            ("VIII", "Frames and Infinite Play"), ("IX", "Algorithms"), ("X", "Design in Practice")]


def load_entries(path):
    s = Path(path).read_text(encoding="utf-8")
    return re.findall(r'"slug":"([^"]+)","name":"([^"]+)","chapter":"([^"]+)","level":(\d)', s)


class Base:
    N = 17000

    def __init__(self, width=1920, nframes=1800, assets=None):
        c.setup(width)
        self.assets = Path(assets) if assets else c.HERE / "assets"
        self.nframes = nframes
        self.env = c.Env(nframes)
        self.cv = c.Canvas()
        self.post = c.Post()
        self.cloud = c.Cloud(self.N, seed=11)
        self.cloud.talpha[:] = 0
        self.cloud.alpha[:] = 0
        self.spl = c.Splat()
        self.wave = c.WaveSurface(rows=58, cols=220)
        self.rng = np.random.default_rng(2026)
        self.words = {}
        self.i = -1
        self.t = 0.0
        self.fx = {}
        try:
            self.entries = load_entries(self.assets / "entries.txt")
        except Exception:
            self.entries = []
        self.names = [e[1] for e in self.entries]
        self.shapes = {}
        self.cam = dict(yaw=0.0, pitch=0.0, roll=0.0, cam_z=0.0, cx=CX, cy=CY, scale=1.0)
        self.sched_i = 0
        self.dust = self._make_dust()
        self.sched = []
        self.build_schedule()

    # ------------------------------------------------------------ caches
    def W(self, text, kind="serif", size=200, wght=400, tr=0.0, upper=False):
        key = (text, kind, size, wght, tr, upper, G.W)
        if key not in self.words:
            self.words[key] = Word(text, kind, size, wght, tr, upper)
        return self.words[key]

    def fit(self, text, kind, size, max_w, wght=400, tr=0.0, upper=False):
        f = c.font(kind, size * G.u, wght)
        w = f.getlength(text.upper() if upper else text) / G.u + tr * max(0, len(text) - 1)
        if w > max_w:
            size = size * max_w / w
        return self.W(text, kind, int(size), wght, tr, upper)

    def shape(self, name, **kw):
        key = (name, tuple(sorted(kw.items())))
        if key not in self.shapes:
            r = np.random.default_rng(abs(hash(name)) % 9999 + 3)
            if name == "matrix":
                self.shapes[key] = shp.matrix2x2(self.N, r, **kw)
            elif name == "text":
                self.shapes[key] = np.concatenate([c.word_points(kw["word"], self.N, r, kw.get("scale", 1.0), kw.get("center", (0, 0))),
                                                   np.zeros((self.N, 1), np.float32)], 1)
            else:
                self.shapes[key] = shp.shape_for(name, self.N, r)
        return self.shapes[key].copy()

    def _make_dust(self):
        r = np.random.default_rng(99)
        n = 420
        return dict(x=r.random(n) * 1920, y=r.random(n) * 1080, vx=(r.random(n) - .5) * 10, vy=-(r.random(n) * 9 + 2), z=r.random(n), ph=r.random(n) * TAU)

    def build_schedule(self):
        self.sched = []

    # ------------------------------------------------------------ per-frame plumbing
    def begin(self, i):
        self.i, self.t = i, i / 30.0
        self.cv.clear()
        self.fx = dict(bloom=.42, streak=.18, ca=0.0, grain=.012, flash=0.0, zoom=1.0, shake=(0.0, 0.0), glitch=[], fade=1.0)
        self.frng = np.random.default_rng(i * 7919 + 13)
        while self.sched_i < len(self.sched) and self.sched[self.sched_i][0] <= self.t + 1e-6:
            self.sched[self.sched_i][1](self)
            self.sched_i += 1
        self.cloud.step(1 / 30.0)

    def kick(self, decay=0.16, heart=False):
        if heart:
            return self.env.pulse("kick", self.i, decay, "heart")
        return self.env.pulse("kick", self.i, decay, ["build", "drop", "drop2", "final"])

    def pulse(self, name, decay=0.1, kind=None):
        return self.env.pulse(name, self.i, decay, kind)

    def since(self, name, kind=None):
        return self.env.since(name, self.i, kind)

    def impact_flash(self, warm=True):
        d, s = self.since("impact")
        k = s * float(np.exp(-d / 0.05))
        self.fx["flash"] = max(self.fx["flash"], k * 0.8)
        if warm:
            self.fx["flash_warm"] = 0.55
        return d, s

    def punch(self, zoom_amt=0.03, shake_amt=5.0, ca_amt=2.5):
        k = self.kick(0.14)
        self.fx["zoom"] *= 1 + zoom_amt * k
        a = shake_amt * k
        self.fx["shake"] = (float(np.sin(self.i * 12.9898) * a), float(np.sin(self.i * 78.233) * a))
        self.fx["ca"] = max(self.fx["ca"], ca_amt * k)
        return k

    def glitch_bands(self, amount, seed=0):
        r = np.random.default_rng(self.i * 31 + seed)
        n = int(amount)
        for _ in range(n):
            y0 = int(r.integers(0, 1000))
            h = int(r.integers(10, 90))
            dx = int(r.integers(-160, 160))
            self.fx["glitch"].append((y0, h, dx))

    # ------------------------------------------------------------ cloud
    def draw_cloud(self, gain=1.0, size_gain=1.0, **cam):
        k = dict(self.cam)
        k.update(cam)
        cl, u = self.cloud, G.u
        X, Y, K, Z = cl.project(k["yaw"], k["pitch"], k["roll"], k["cam_z"], 1100.0, k["cx"], k["cy"], k["scale"])
        fog = np.clip(1.15 - (Z + 700) / 2600, 0.12, 1.0)
        w = cl.bright * cl.alpha * gain * fog * np.clip(K, 0.35, 1.7)
        size = cl.sizec.astype(np.int8) + (K > 1.25).astype(np.int8)
        self.spl.draw(self.cv, X * u, Y * u, w, size, sizes=[1, 3, 5])

    def draw_dust(self, gain=1.0, alpha=1.0):
        d, t, u = self.dust, self.t, G.u
        x = (d["x"] + d["vx"] * t * (0.4 + d["z"])) % 1920
        y = (d["y"] + d["vy"] * t * (0.4 + d["z"])) % 1080
        tw = 0.55 + 0.45 * np.sin(t * 1.3 + d["ph"] * 3)
        v = (30 + 160 * d["z"] ** 2) * tw * gain * alpha
        xi = np.clip((x * u).astype(int), 0, G.W - 1)
        yi = np.clip((y * u).astype(int), 0, G.H - 1)
        np.maximum.at(self.cv.L, (yi, xi), v.astype(np.uint8))
        big = d["z"] > 0.8
        for xx, yy, vv in zip(xi[big], yi[big], v[big]):
            cv2.circle(self.cv.L, (int(xx), int(yy)), max(1, int(1.4 * u)), int(vv), -1, cv2.LINE_AA)

    # ------------------------------------------------------------ HUD (brand: mono, tracked, ash)
    def mono(self, text, x, y, size=22, v=130, align="left", tr=4.0, wght=400, alpha=1.0):
        w = self.W(text, "mono", size, wght, tr)
        draw_word(self.cv, w, x, y, align, alpha=alpha * v / 255.0, tr=0.0)

    def hud(self, caption=None, show=1.0, matrix=True, timecode=True):
        if show <= 0:
            return
        t = self.t
        v = 150 * show
        cv_ = self.cv
        M = 72
        # corner crop marks (hairlines)
        for (x, y, sx, sy) in ((M, M, 1, 1), (1920 - M, M, -1, 1), (M, 1080 - M, 1, -1), (1920 - M, 1080 - M, -1, -1)):
            cv_.line((x, y), (x + 26 * sx, y), v * .55, 1)
            cv_.line((x, y), (x, y + 26 * sy), v * .55, 1)
        self.mono("THEORY GAMBIT", M + 40, M + 22, 20, v * .9, tr=5)
        if matrix:
            self.mono("(3, 3)  (0, 5)", 1920 - M - 40, M + 22, 20, v * .9, "right", tr=3)
            self.mono("(5, 0)  (1, 1)", 1920 - M - 40, M + 50, 20, v * .9, "right", tr=3)
        if caption:
            self.mono(caption, M + 40, 1080 - M - 14, 20, v, tr=4)
        if timecode:
            f = self.i
            tc = f"{int(t // 60):02d}:{int(t % 60):02d}:{f % 30:02d}"
            self.mono(tc, 1920 - M - 40, 1080 - M - 14, 20, v, "right", tr=3)
        # progress hairline
        cv_.line((M + 40, 1080 - M + 22), (M + 40 + (1920 - 2 * M - 80) * (t / 60.0), 1080 - M + 22), v * .8, 1)
        cv_.line((M + 40, 1080 - M + 22), (1920 - M - 40, 1080 - M + 22), v * .22, 1)

    # ------------------------------------------------------------ figures
    def dotted(self, p0, p1, v, dash=7, gap=7, th=1.0):
        d = np.array(p1, float) - np.array(p0, float)
        L = float(np.hypot(*d))
        if L < 1:
            return
        n = int(L // (dash + gap))
        u = d / L
        for k in range(n + 1):
            a = np.array(p0, float) + u * k * (dash + gap)
            b = a + u * dash
            if np.hypot(*(b - np.array(p0))) > L:
                b = np.array(p1, float)
            self.cv.line(a, b, v, th)

    def fig_matrix(self, cx, cy, cell, discs, grow, rings=True, dim_top=True, arrows=0.0, hl_row=None, hl=0.0, v=235, label=None):
        """the site's payoff table. discs: 4 sizes (area) top-left, top-right, bottom-left, bottom-right.
        grow: 4 values 0..1 for how far each disc has appeared."""
        s = cell
        cv_ = self.cv
        x0, y0 = cx - s, cy - s
        for k in range(3):
            self.dotted((x0 + k * s, y0), (x0 + k * s, y0 + 2 * s), v * .38)
            self.dotted((x0, y0 + k * s), (x0 + 2 * s, y0 + k * s), v * .38)
        if hl_row is not None and hl > 0:
            ry = y0 + hl_row * s
            for yy in range(0, int(s), 3):
                cv_.line((x0 + 1, ry + yy), (x0 + 2 * s - 1, ry + yy), 26 * hl, 1)
            cv_.line((x0, ry), (x0 + 2 * s, ry), 210 * hl, 1.2)
            cv_.line((x0, ry + s), (x0 + 2 * s, ry + s), 210 * hl, 1.2)
        centers = [(cx - s / 2, cy - s / 2), (cx + s / 2, cy - s / 2), (cx - s / 2, cy + s / 2), (cx + s / 2, cy + s / 2)]
        for k, (px, py) in enumerate(centers):
            g = float(grow[k])
            if g <= 0.01:
                continue
            r = s * .36 * np.sqrt(discs[k]) * float(eo(g))
            val = (112 if (k < 2 and dim_top) else v)
            if hl_row is not None and (k // 2) == hl_row:
                val = 255
            cv_.disc((px, py), r, val)
        if rings:
            for dx in (-s / 2, s / 2):
                cv_.ring((cx + dx, y0 - 44), 15, 200, 1.4)
        if arrows > 0:
            for dx in (-s / 2, s / 2):
                ya = cy - s / 2 + s * .34 * np.sqrt(discs[0 if dx < 0 else 1]) + 10
                yb = cy + s / 2 - s * .36 * np.sqrt(discs[2 if dx < 0 else 3]) - 12
                ye = lerp(ya, yb, float(eo(arrows)))
                cv_.line((cx + dx, ya), (cx + dx, ye), 220, 1.4)
                if arrows > .85:
                    cv_.poly([(cx + dx - 8, ye - 12), (cx + dx, ye), (cx + dx + 8, ye - 12)], 220, 1.4)
        return centers

    # ------------------------------------------------------------ vfx
    def shock(self, cx, cy, age, v=230, speed=2600.0, th=3.0, life=0.9, ca=True):
        if age < 0 or age > life:
            return
        r = age * speed
        k = 1 - age / life
        self.cv.ring((cx, cy), r, v * k, th * (1 + 2 * k))
        self.cv.ring((cx, cy), r * .82, v * k * .5, th)
        self.cv.ring((cx, cy), r * 1.12, v * k * .35, 1.2)

    def spokes(self, cx, cy, age, n=72, v=200, life=0.5, speed=3400.0, seed=3):
        if age < 0 or age > life:
            return
        r = np.random.default_rng(seed)
        a = r.random(n) * TAU
        l = 60 + r.random(n) * 300
        k = 1 - age / life
        d0 = age * speed * (0.4 + r.random(n))
        for j in range(n):
            p0 = (cx + np.cos(a[j]) * d0[j], cy + np.sin(a[j]) * d0[j])
            p1 = (cx + np.cos(a[j]) * (d0[j] + l[j] * k), cy + np.sin(a[j]) * (d0[j] + l[j] * k))
            self.cv.line(p0, p1, v * k * (0.4 + .6 * r.random()), 1.2)

    def brand_mark(self, cx, cy, r=120, t=None, v=240, reveal=1.0, lag=0.0, rings=True, thread=True, warm=False):
        """vector hero mark: downward triangle + echoes + opened rings + thread. Same idea as favicon / heroScene."""
        cv_ = self.cv
        t = self.t if t is None else t
        layer = "A" if warm else "L"
        tri = lambda s, rot: [(cx + s * r * np.cos(np.pi / 2 + k * TAU / 3 + rot), cy + s * r * np.sin(np.pi / 2 + k * TAU / 3 + rot) * 1.0) for k in range(3)]
        # echoes trail the main triangle like silk
        for e in range(5, 0, -1):
            sc_ = 1 - .13 * e
            rot = -lag * e * 0.16
            cv_.poly(tri(sc_ * .9, rot), v * (.16 + .04 * (5 - e)) * reveal, 1.0, True)
        main = tri(.9, 0.0)
        cv_.fill_poly(main, 20 * reveal)
        cv_.poly(main, v * reveal, 2.2, True)
        if layer == "A":
            cv_.poly(main, 255 * reveal, 2.2, True, "A")
        if rings:
            gaps = [(.9, 0.0), (1.1, 1.2), (1.3, 2.4), (1.5, 3.4), (1.7, 4.4)]
            for k, (g, ph) in enumerate(gaps):
                rad = r * (1.35 + .52 * k)
                a0 = (np.degrees(ph + t * (0.22 + .05 * k) * (1 if k % 2 == 0 else -1)))
                sweep = 360 - np.degrees(g) * 0.55
                rv = v * (.9 - .13 * k) * reveal
                cv_.ring((cx, cy), rad, rv, 2.2 - .25 * k, a0, a0 + sweep * float(reveal))
        if thread:
            ang = lambda tt: tt * 0.9
            pts = []
            for j in range(0, 70):
                tt = t - j * 0.018
                rr = r * (1.35 + .22 * np.sin(tt * .7))
                a = ang(tt) + np.pi * .2
                pts.append((cx + rr * np.cos(a), cy + rr * .8 * np.sin(a)))
            for j in range(len(pts) - 1):
                cv_.line(pts[j], pts[j + 1], v * (1 - j / len(pts)) ** 1.3 * reveal, 1.6 if j < 14 else 1.0)
            cv_.disc(pts[0], 4.5, 255 * reveal)
        return

    def flash_fx(self, strength=1.0, warm=True):
        self.fx["flash"] = max(self.fx["flash"], strength)
        if warm:
            self.fx["flash_warm"] = 0.5
