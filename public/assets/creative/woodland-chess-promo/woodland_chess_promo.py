"""WOODLAND CHESS promo: 15 s, epic and philosophical, rendered entirely in code.

    python woodland_chess_promo.py --save promo.mp4                 # 1920x1080
    python woodland_chess_promo.py --save promo_vertical.mp4 --vertical    # 1080x1920 for Reels / Shorts / TikTok
    python woodland_chess_promo.py --width 960 --sheet 1,3,4,5 ... # quick contact sheet

Everything is drawn from the repo's own assets: the trident mark, the cburnett pieces from src/pieces.ts,
the Abyssal Liturgy tokens, Cormorant Garamond / Jost / JetBrains Mono. Pieces and the trident become point
clouds; the clouds are pulled between shapes by exact critically damped springs. One score drives sound and
picture: 90 BPM, 20 frames per beat.
"""
import argparse
import os
import time
from pathlib import Path

import cv2
import numpy as np

import wc_core as c
import wc_score as sc
import wc_shapes as shp
from wc_core import G, draw_word, eo, eo5, eio, ei, prog, lerp

HERE = Path(__file__).resolve().parent
TAU = 2 * np.pi
B = sc.BEAT
bt = sc.bt
N = 20000


class Promo:
    def __init__(self, width=1920, vertical=False):
        if vertical:
            c.setup(width, int(round(width * 16 / 9)))
        else:
            c.setup(width)
        self.V = vertical
        self.cx, self.cy = G.dw / 2, G.dh / 2
        self.events = sc.build_events()
        self.env = c.Env(450, self.events)
        self.cv, self.post = c.Canvas(), c.Post()
        self.cloud = c.Cloud(N, seed=21)
        self.cloud.alpha[:] = 0
        self.cloud.talpha[:] = 0
        self.spl = c.Splat()
        self.words, self.shapes = {}, {}
        self.i, self.t = -1, 0.0
        self.sched, self.sched_i = [], 0
        r = np.random.default_rng(5)
        self.dust = dict(x=r.random(380) * G.dw, y=r.random(380) * G.dh, vx=(r.random(380) - .5) * 8, vy=-(r.random(380) * 7 + 2), z=r.random(380), ph=r.random(380) * TAU)
        # layout: landscape = art right, copy left; portrait = art top, copy bottom
        if vertical:
            self.art = (self.cx, 680.0)
            self.tx, self.talign = self.cx, "center"
        else:
            self.art = (1420.0, self.cy)
            self.tx, self.talign = 150.0, "left"
        self.schedule()

    # ---------------------------------------------------------------- caches
    def W(self, text, kind="serif", size=200, wght=400, tr=0.0, upper=False):
        k = (text, kind, size, wght, tr, upper, G.W)
        if k not in self.words:
            self.words[k] = c.Word(text, kind, size, wght, tr, upper)
        return self.words[k]

    def fit(self, text, kind, size, max_w, wght=400, tr=0.0):
        f = c.font(kind, size * G.u, wght)
        w = f.getlength(text) / G.u + tr * max(0, len(text) - 1)
        return self.W(text, kind, int(size * min(1.0, max_w / w)), wght, tr)

    def shape(self, name, **kw):
        key = (name, tuple(sorted(kw.items())))
        if key in self.shapes:
            return self.shapes[key].copy()
        r = np.random.default_rng(abs(hash(name)) % 9999 + 11)
        a = HERE / "assets"
        if name in ("p", "n", "b", "r", "q", "k"):
            p2 = c.svg_points(a / "pieces" / f"{name}.png", N, r, kw.get("size", 620), (0, 0), thresh=40)
            z = (r.random(N).astype(np.float32) - .5) * kw.get("depth", 70)
            P = np.concatenate([p2, z[:, None]], 1)
        elif name == "trident":
            p2 = c.svg_points(a / "trident.png", N, r, kw.get("size", 720), (0, 0), thresh=40)
            z = (r.random(N).astype(np.float32) - .5) * 40
            P = np.concatenate([p2, z[:, None]], 1)
        elif name == "lockup":      # trident inside the dashed halo
            t = c.svg_points(a / "trident.png", N, r, 560, (0, 0), thresh=40)
            tp = np.concatenate([t, np.zeros((N, 1), np.float32)], 1)
            h = shp.halo(N, r)
            m = int(N * .56)
            P = np.concatenate([tp[:m], h[:N - m]], 0)
        elif name == "vortex":
            P = shp.galaxy(N, r, 700, 2, 6.0)
        else:
            P = shp.shape_for(name, N, r) if name not in ("halo", "chip", "globe", "board") else \
                {"halo": shp.halo, "chip": shp.chip, "globe": shp.globe, "board": shp.board_flat}[name](N, r)
        self.shapes[key] = P.astype(np.float32)
        return P.astype(np.float32).copy()

    def off(self, P, dx, dy):
        P = P.copy()
        P[:, 0] += dx - self.cx
        P[:, 1] += dy - self.cy
        return P

    # ---------------------------------------------------------------- schedule of cloud targets
    def schedule(self):
        S = self.sched
        ax, ay = self.art

        def at(b, fn):
            S.append((bt(b), fn))

        def tgt(s, P, om, stag=.6):
            s.cloud.set_target(P, om, stag)

        def vis(s, a):
            s.cloud.talpha[:] = a

        at(0.0, lambda s: (setattr(s.cloud, "tgt", s.cloud.pos.copy())))
        at(0.5, lambda s: (vis(s, 1.0), tgt(s, s.off(s.shape("vortex"), s.cx, s.cy), 1.1, 1.0)))
        at(1.2, lambda s: tgt(s, s.off(s.shape("trident", size=760), ax, ay), 1.7, 1.2))
        at(4.0, lambda s: (s.cloud.explode(520, spin=120), tgt(s, s.off(s.shape("lockup"), ax, ay), 4.0, .8)))
        at(7.4, lambda s: tgt(s, s.off(s.shape("board") * np.array([1, 1, 1], np.float32), s.cx, s.cy + 120), 6.0, .5))
        at(8.0, lambda s: (s.cloud.explode(900), tgt(s, s.off(s.shape("n", size=640), ax, ay), 13.0, .6)))
        at(10.0, lambda s: (s.cloud.explode(900), tgt(s, s.off(s.shape("globe") * 1.15, ax, ay), 10.0, .6)))
        at(12.0, lambda s: (s.cloud.explode(900), tgt(s, s.off(s.shape("r", size=640), ax, ay), 13.0, .6)))
        at(14.0, lambda s: tgt(s, s.off(s.shape("vortex") * 1.2, s.cx, s.cy), 3.0, .9))
        at(15.05, lambda s: tgt(s, np.random.default_rng(1).standard_normal((N, 3)).astype(np.float32) * 5, 11.0, .3))
        at(15.5, lambda s: vis(s, 0.0))
        at(15.98, lambda s: (setattr(s.cloud, "alpha", np.ones(N, np.float32)), vis(s, 1.0), s.cloud.explode(2000, spin=300),
                             tgt(s, s.off(s.shape("lockup"), ax, ay), 3.0, .9)))

    # ---------------------------------------------------------------- per-frame plumbing
    def begin(self, i):
        self.i, self.t = i, i / 30.0
        self.cv.clear()
        self.fx = dict(bloom=.5, streak=.25, ca=0.0, grain=.012, flash=0.0, zoom=1.0, shake=(0.0, 0.0), glitch=[], fade=1.0,
                       bars=0.0 if self.V else .128)
        while self.sched_i < len(self.sched) and self.sched[self.sched_i][0] <= self.t + 1e-6:
            self.sched[self.sched_i][1](self)
            self.sched_i += 1
        self.cloud.step(1 / 30.0)

    def since(self, name, kind=None):
        return self.env.since(name, self.i, kind)

    def pulse(self, name, decay=.12):
        return self.env.pulse(name, self.i, decay)

    def hit(self):
        """taiko + impact energy: punch, shake, chromatic split."""
        k = max(self.pulse("taiko", .16), .8 * self.pulse("impact", .2))
        self.fx["zoom"] *= 1 + .035 * k
        self.fx["shake"] = (float(np.sin(self.i * 12.989) * 7 * k), float(np.sin(self.i * 78.233) * 7 * k))
        self.fx["ca"] = max(self.fx["ca"], 2.8 * k)
        d, s = self.since("impact")
        self.fx["flash"] = max(self.fx["flash"], s * float(np.exp(-d / .05)) * .75)
        if s * np.exp(-d / .05) > .3:
            self.fx["flash_warm"] = .4
        return k

    def mono(self, text, x, y, size=22, v=150, align="left", tr=8.0, alpha=1.0):
        draw_word(self.cv, self.W(text, "mono", size, 400, tr), x, y, align, alpha=alpha * v / 255.0)

    def draw_cloud(self, gain=1.0, yaw=0.0, pitch=0.0, roll=0.0, cam_z=0.0, scale=1.0, cx=None, cy=None):
        cl, u = self.cloud, G.u
        X, Y, K, Z = cl.project(yaw, pitch, roll, cam_z, 1100.0, self.cx if cx is None else cx, self.cy if cy is None else cy, scale)
        fog = np.clip(1.15 - (Z + 700) / 2600, .12, 1.0)
        w = cl.bright * cl.alpha * gain * fog * np.clip(K, .35, 1.7)
        size = cl.sizec.astype(np.int8) + (K > 1.25).astype(np.int8)
        self.spl.draw(self.cv, X * u, Y * u, w, size, sizes=[1, 3, 5])

    def draw_dust(self, gain=1.0):
        d, t, u = self.dust, self.t, G.u
        x = (d["x"] + d["vx"] * t * (.4 + d["z"])) % G.dw
        y = (d["y"] + d["vy"] * t * (.4 + d["z"])) % G.dh
        v = (30 + 150 * d["z"] ** 2) * (.55 + .45 * np.sin(t * 1.3 + d["ph"] * 3)) * gain
        xi, yi = np.clip((x * u).astype(int), 0, G.W - 1), np.clip((y * u).astype(int), 0, G.H - 1)
        np.maximum.at(self.cv.L, (yi, xi), v.astype(np.uint8))

    def slam(self, word, x, y, since, dur=.3, tr0=230., blur0=150., align="left", alpha=1.0, extra_blur=0.0, sx=1.0, sy=1.0, dx=0.0):
        p = prog(since, 0, dur)
        e = eo5(p)
        draw_word(self.cv, word, x + dx, y, align, alpha=alpha * float(np.clip(p * 5, 0, 1)), tr=lerp(tr0, 0.0, e),
                  blur=lerp(blur0, 0.0, e) + extra_blur, sx=sx, sy=sy)

    def shock(self, cx, cy, age, v=230, speed=2600., th=3., life=.9):
        if 0 <= age <= life:
            r, k = age * speed, 1 - age / life
            self.cv.ring((cx, cy), r, v * k, th * (1 + 2 * k))
            self.cv.ring((cx, cy), r * .82, v * k * .5, th)
            self.cv.ring((cx, cy), r * 1.14, v * k * .3, 1.2)

    def rays(self, cx, cy, v=60.0, n=46, spread=1.9, aim=-np.pi / 2, seed=2):
        """volumetric light: long hairlines fanning from the trident's crown."""
        r = np.random.default_rng(seed)
        t = self.t
        for j in range(n):
            a = aim + (r.random() - .5) * spread
            l = 300 + r.random() * 1500
            f = .35 + .65 * (np.sin(t * (.6 + r.random()) + j) * .5 + .5)
            self.cv.line((cx + np.cos(a) * 70, cy + np.sin(a) * 70), (cx + np.cos(a) * l, cy + np.sin(a) * l), v * f * (.3 + .7 * r.random()), 1 + int(r.random() * 2))

    def board_hairlines(self, cx, cy, cell=120, v=26, k=1.0):
        h = cell * 4
        for j in range(9):
            o = (j - 4) * cell
            self.cv.line((cx - h, cy + o), (cx + h, cy + o), v * k, 1)
            self.cv.line((cx + o, cy - h), (cx + o, cy + h), v * k, 1)

    def trident_vec(self, cx, cy, scale=11.0, reveal=1.0, v=235, warm=False):
        """the brand trident, drawn from its foot upward (hero reveal): shaft, collar, prongs, spear heads."""
        cv_ = self.cv
        g = lambda x, y: (cx + (x - 24) * scale, cy + (y - 24) * scale)
        sh = np.clip(reveal * 1.6, 0, 1)
        cv_.line(g(24, 44.5), (g(24, 44.5)[0], lerp(g(24, 44.5)[1], g(24, 12)[1], sh)), v, 2.6)
        if reveal > .35:
            q = np.clip((reveal - .35) * 3, 0, 1)
            cv_.line(g(24, 37), g(24 - 4.5 * q, 37), v, 2.6)
            cv_.line(g(24, 37), g(24 + 4.5 * q, 37), v, 2.6)
        if reveal > .5:
            q = np.clip((reveal - .5) * 2.2, 0, 1)
            pl, pr = [], []
            for tt in np.linspace(0, q, 24):
                # left prong: from the junction at (24,31) curving out to (10,18.5) then up to (10,10)
                if tt < .6:
                    u_ = tt / .6
                    x = lerp(24, 10, u_)
                    y = 31 - (31 - 18.5) * (u_ ** 2.2) - 0 * u_
                else:
                    u_ = (tt - .6) / .4
                    x, y = 10, lerp(18.5, 10, u_)
                pl.append(g(x, y))
                pr.append(g(48 - x, y))
            if len(pl) > 1:
                cv_.poly(pl, v, 2.6)
                cv_.poly(pr, v, 2.6)
        if reveal > .8:
            q = np.clip((reveal - .8) * 5, 0, 1)
            for H_ in ([(24, 2.5), (29.5, 12), (24, 9.8), (18.5, 12)], [(10, 3.5), (13.4, 10), (10, 8.6), (6.6, 10)], [(38, 3.5), (41.4, 10), (38, 8.6), (34.6, 10)]):
                cv_.fill_poly([g(*p) for p in H_], 255 * q)
        return g(24, 2.5)

    # ---------------------------------------------------------------- scenes
    def s_void(self):
        t, cv = self.t, self.cv
        b = t / B
        ax, ay = self.art
        heart = self.pulse("kick", .2)
        self.fx["fade"] = float(eo(prog(t, 0.0, .6)))
        self.draw_dust(.7)
        ig = float(eo5(prog(t, bt(.5), bt(1.0))))
        cv.disc((ax, ay + 220), 3 + 5 * heart, 255 * ig)
        cv.ring((ax, ay + 220), 18 + 80 * heart, 110 * heart * ig, 1.2)
        self.draw_cloud(gain=.95 * float(eo(prog(t, bt(.6), bt(1.6)))), yaw=t * .22, cx=self.cx, cy=self.cy, scale=1.0)
        # halo rings open on each bell
        R = [300, 372, 452, 540]
        for k in range(4):
            tk = bt(1.0 + .75 * k)
            rv = float(eo5(prog(t, tk, tk + .55)))
            if rv > 0:
                a0 = (k * 83 + t * (10 + 4 * k) * (1 if k % 2 == 0 else -1)) % 360
                ping = float(np.exp(-(t - tk) / .4)) if t > tk else 0.0
                cv.ring((ax, ay), R[k], (200 - 26 * k) + 80 * ping, 2.2 - .3 * k, a0, a0 + 330 * rv)
        rv = float(eo(prog(t, bt(2.6), bt(3.95))))
        if rv > 0:
            self.trident_vec(ax, ay + 30, 10.5, rv, 235 * min(1, rv * 1.4))
        # shaft of light before the hit
        self.rays(ax, ay - 250, 50 * float(prog(t, bt(2.5), bt(4))))
        if t > bt(.5):
            self.mono("WOODLAND CHESS", self.cx, G.dh * .5 - 400 if not self.V else 300, 22, 150 * float(eo(prog(t, bt(2), bt(3)))), "center", tr=18)
        self.fx["ca"] = 3.0 * float(prog(t, bt(3), bt(4)))
        self.fx["bloom"] = .55 + .3 * heart

    def s_words(self):
        t, cv = self.t, self.cv
        ax, ay = self.art
        k = self.hit()
        since0 = t - bt(4)
        self.shock(ax, ay, since0, 235, 2600, 3, .9)
        self.rays(ax, ay - 250, 45 + 90 * k)
        self.draw_cloud(gain=1.05 + .3 * k, yaw=.12 * np.sin(t * 1.2), scale=1.0 + .02 * k, cx=self.cx, cy=self.cy)
        self.trident_vec(ax, ay + 30, 10.5, 1.0, 120)
        for kk in range(4):
            cv.ring((ax, ay), [300, 372, 452, 540][kk], 150 - 22 * kk, 1.6, (kk * 83 + t * 14) % 360, (kk * 83 + t * 14) % 360 + 320)
        self.draw_dust(.6)
        words = [("Play", 4), ("with", 5), ("intent.", 6)]
        y0 = [400, 610, 820] if not self.V else [1320, 1520, 1720]
        size = 230 if not self.V else 210
        for (w, b), y in zip(words, y0):
            sn = t - bt(b)
            if sn < 0:
                continue
            wd = self.W(w, "serif", size, 400)
            e = 1 + .02 * self.pulse("taiko", .15)
            self.slam(wd, self.tx, y, sn, .3, 230, 160, self.talign, sx=e, sy=e)
        self.mono("A  C H E S S  I N  Y O U R  B R O W S E R".replace("  ", " ") if False else "CHESS  IN  YOUR  BROWSER", self.tx, 920 if not self.V else 1760, 22, 140 * float(eo(prog(t, bt(6.4), bt(7.2)))), self.talign, tr=12)
        self.fx["streak"] = .3 + .3 * k

    MODES = [("Computer", "01  /  COMPUTER", "STOCKFISH 18  ·  RUNS ON YOUR DEVICE", "n"),
             ("Play online", "02  /  ONLINE", "REAL OPPONENTS  ·  LICHESS", "globe"),
             ("Puzzles", "03  /  PUZZLES", "RATED TACTICS  ·  DAILY CHALLENGE", "r")]

    def s_modes(self):
        t, cv = self.t, self.cv
        b = t / B
        idx = min(2, int((b - 8) // 2))
        t0 = bt(8 + 2 * idx)
        since = t - t0
        name, label, sub, shape = self.MODES[idx]
        ax, ay = self.art
        k = self.hit()
        self.board_hairlines(ax, ay, 118, 22 + 14 * k)
        # light squares of the board, very faint
        cell = 118
        for i_ in range(8):
            for j_ in range(8):
                if (i_ + j_) % 2 == 0:
                    x0, y0 = ax + (i_ - 4) * cell, ay + (j_ - 4) * cell
                    cv.rect(x0 + 2, y0 + 2, x0 + cell - 1, y0 + cell - 1, 9 + 6 * k)
        self.shock(ax, ay, since, 215, 2200, 2.4, .6)
        self.draw_cloud(gain=1.15 + .3 * k, yaw=.2 * np.sin(t * 1.4) if shape != "globe" else t * .9, pitch=.0, scale=1.0 + .02 * k, cx=self.cx, cy=self.cy)
        self.draw_dust(.5)
        # the board's own language: legal-move dots and ringed targets around the piece
        if shape == "n":
            cs = 118
            offs = [(1, -2), (2, -1), (2, 1), (1, 2), (-1, 2), (-2, 1), (-2, -1), (-1, -2)]
            for j, (dx, dy) in enumerate(offs):
                a = float(eo(prog(since, .14 + .05 * j, .30 + .05 * j)))
                p = (ax + dx * cs, ay + dy * cs)
                if j in (1, 5):
                    cv.ring(p, 40, 230 * a, 2.0)
                else:
                    cv.disc(p, 12 * a, 230 * a)
        elif shape == "r":
            q = float(eo(prog(since, .2, .75)))
            for rr, vv in ((120, 230), (170, 130), (220, 70)):
                cv.ring((ax, ay), rr * (.6 + .4 * q), vv * q, 1.6)
            if since > .5:
                m = float(eo(prog(since, .5, .8)))
                p0, p1, p2 = (ax + 150, ay - 190), (ax + 190, ay - 150), (ax + 270, ay - 250)
                cv.poly([p0, p1] if m < .5 else [p0, p1, (lerp(p1[0], p2[0], (m - .5) * 2), lerp(p1[1], p2[1], (m - .5) * 2))], 255, 2.6)
        else:
            a = since * 2.4
            for j in range(3):
                cv.disc((ax + np.cos(a + j * 2.1) * 330, ay + np.sin(a + j * 2.1) * 330 * .4), 6, 255)
        # copy
        size = 215 if not self.V else 200
        wd = self.fit(name, "serif", size, 980 if not self.V else 940, 400)
        yb = 560 if not self.V else 1460
        ex = float(ei(prog(since, B * 2 - .16, B * 2)))
        self.slam(wd, self.tx, yb, since, .26, 200, 150, self.talign, alpha=1 - ex, extra_blur=ex * 90, dx=-ex * 160 if not self.V else 0)
        self.mono(label, self.tx, yb - 250 if not self.V else yb - 230, 26, 200 * float(eo(prog(since, .1, .3))), self.talign, tr=14)
        cv.line((self.tx if not self.V else self.cx - 220, yb + 40), ((self.tx if not self.V else self.cx - 220) + 440 * float(eio(prog(since, .1, .6))), yb + 40), 110, 1)
        self.mono(sub, self.tx, yb + 92, 21, 175 * float(eo(prog(since, .3, .6))), self.talign, tr=9)
        if since < .1:
            self.fx["flash"] = max(self.fx["flash"], .3 * (1 - since / .1))
            self.glitch(3, idx)
        self.fx["streak"] = .3 + .3 * k

    def glitch(self, n, seed=0):
        r = np.random.default_rng(self.i * 31 + seed)
        for _ in range(n):
            self.fx["glitch"].append((int(r.integers(0, int(G.dh - 100))), int(r.integers(10, 80)), int(r.integers(-150, 150))))

    def s_build(self):
        t, cv = self.t, self.cv
        b = t / B
        since = t - bt(14)
        k = self.hit()
        ax, ay = self.art
        sn = self.pulse("snare", .06)
        # tunnel of rings rushing in, accelerating
        sp = (since / (2 * B)) ** 2
        for j in range(14):
            ph = (j / 14 + sp * 3) % 1.0
            cv.ring((self.cx, self.cy), 50 + 1500 * ph ** 2.2, 210 * ph ** .8, 1.2 + 3 * ph)
        self.draw_cloud(gain=1.0 + .5 * sn, yaw=t * .8, pitch=.5, scale=1.0 + .1 * sp, cx=self.cx, cy=self.cy)
        lines = [("NO ACCOUNT.", 14), ("YOUR MOVE.", 15)]
        for txt, bb in lines:
            sn_ = t - bt(bb)
            if sn_ < 0:
                continue
            if bb == 14 and b >= 15:
                continue
            wd = self.fit(txt, "serif", 330 if not self.V else 250, 1560 if not self.V else 980, 400)
            self.slam(wd, self.cx, self.cy + 90, sn_, .22, 200, 160, "center")
        self.fx["invert"] = float(sn > .3) * min(1.0, since / B) * .16
        self.fx["ca"] = 2 + 6 * (since / (2 * B)) ** 2
        self.glitch(int(sn * 4))
        if b >= 15.3:
            q = prog(t, bt(15.3), bt(15.5))
            self.fx["zoom"] *= 1 + .9 * float(ei(q))
            self.fx["fade"] = 1 - float(ei(prog(t, bt(15.38), bt(15.5))))

    def s_vacuum(self):
        q = prog(self.t, bt(15.5), bt(16))
        self.cv.disc((self.cx, self.cy), 2.5 + 3 * q, 255)
        self.cv.line((self.cx - 700 * q, self.cy), (self.cx + 700 * q, self.cy), 120 * q, 1)
        self.fx["bloom"] = .6

    def s_finale(self):
        t, cv = self.t, self.cv
        since = t - bt(16)
        ax, ay = self.art
        k = self.hit()
        self.fx["bars"] = (0.0 if self.V else .128 * (1 - float(eo5(prog(since, .05, .55)))))
        self.shock(ax, ay, since, 240, 3000, 3.2, 1.0)
        self.shock(ax, ay, since - .25, 160, 2200, 2.0, .8)
        self.rays(ax, ay - 260, 70 + 80 * k, 70, 2.4, seed=5)
        self.draw_cloud(gain=1.1, scale=1.0 + .02 * k, cx=self.cx, cy=self.cy)
        self.draw_dust(.8)
        rv = float(eo(prog(since, .3, 1.2)))
        self.trident_vec(ax, ay + 30, 10.5, rv, 235 * rv)
        if rv > .9:
            cv.poly([(ax - 20, ay + 20), (ax, ay + 20)], 0, 1)
        for kk in range(4):
            a0 = (kk * 83 + t * 14) % 360
            cv.ring((ax, ay), [300, 372, 452, 540][kk], (190 - 24 * kk) * float(eo(prog(since, .1 + .1 * kk, .6 + .1 * kk))), 2.0, a0, a0 + 326)
        # title lockup
        if not self.V:
            x, al = 150, "left"
            y1, y2, y3, y4 = 520, 520, 650, 740
            tw1 = self.W("Woodland", "serif", 260, 400)
            tw2 = self.W("Chess", "serif", 260, 400)
            self.slam(tw1, x, 430, since, .4, 260, 200, al, sx=1 + .015 * k, sy=1 + .015 * k)
            self.slam(tw2, x, 675, since - .08, .4, 260, 200, al, sx=1 + .015 * k, sy=1 + .015 * k)
            ty, ly, cy2, uy = 745, 775, 815, 1005
            tx = x
        else:
            x, al = self.cx, "center"
            tw1 = self.W("Woodland Chess", "serif", 150, 400)
            self.slam(tw1, x, 1330, since, .4, 200, 200, al)
            ty, ly, cy2, uy = 1340, 1395, 1450, 1710
            tx = x
        a = float(eo(prog(since, .8, 1.3)))
        cv.line(((tx if not self.V else x - 250), ly), ((tx if not self.V else x - 250) + 500 * float(eio(prog(since, .7, 1.4))), ly), 130 * a, 1)
        self.mono("COMPUTER   ·   ONLINE   ·   PUZZLES", tx, ly + 55, 22, 180 * a, al, tr=11)
        if self.V:
            tg = self.W("Play with intent.", "serif", 64, 300)
            draw_word(cv, tg, tx, 1545, al, alpha=float(eo(prog(since, 1.2, 1.8))))
        cta = float(eo(prog(t, bt(18), bt(18.6))))
        if cta > 0:
            bw, bh = 330, 74
            bx = tx if not self.V else x - bw / 2
            by = 880 if not self.V else 1610
            cv.poly([(bx, by), (bx + bw, by), (bx + bw, by + bh), (bx, by + bh)], 225 * cta, 1.6, True)
            draw_word(cv, self.W("PLAY NOW", "sans", 30, 400, 10), bx + bw / 2, by + 48, "center", alpha=cta)
            br = (since * .8) % 1
            cv.poly([(bx - 22 * br, by - 22 * br), (bx + bw + 22 * br, by - 22 * br), (bx + bw + 22 * br, by + bh + 22 * br), (bx - 22 * br, by + bh + 22 * br)], 90 * cta * (1 - br), 1.0, True)
            u_ = 235 * float(eo(prog(t, bt(18.4), bt(19))))
            if not self.V:
                self.mono("woodlandchess.github.io", bx + bw + 40, by + 46, 26, u_, "left", tr=3)
            else:
                self.mono("woodlandchess.github.io", x, by + bh + 70, 28, u_, "center", tr=3)
        self.fx["fade"] = float(1 - eio(prog(t, 14.3, 15.0)))
        self.fx["bloom"] = .6
        self.fx["warm"] = .3 * rv

    def render(self, i, post=True):
        self.begin(i)
        b = self.t / B
        if b < 4:
            self.s_void()
        elif b < 8:
            self.s_words()
        elif b < 14:
            self.s_modes()
        elif b < 15.5:
            self.s_build()
        elif b < 16:
            self.s_vacuum()
        else:
            self.s_finale()
        return self.post.run(self.cv, self.fx) if post else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--save")
    ap.add_argument("--width", type=int, default=1920)
    ap.add_argument("--vertical", action="store_true")
    ap.add_argument("--audio", default=None)
    ap.add_argument("--sheet", help="comma separated seconds -> contact sheet png")
    ap.add_argument("--out", default="sheet.png")
    ap.add_argument("--crf", type=int, default=20)
    a = ap.parse_args()
    p = Promo(a.width if not a.vertical else min(a.width, 1080), a.vertical)
    if a.sheet:
        fr = sorted(set(int(round(float(x) * 30)) for x in a.sheet.split(",")))
        got = {}
        for i in range(max(fr) + 1):
            if i in fr:
                got[i] = p.render(i)
            else:
                p.render(i, post=False)
        tw = 480 if not a.vertical else 270
        th = 270 if not a.vertical else 480
        ims = [cv2.resize(got[i], (tw, th)) for i in fr]
        cols = 4 if not a.vertical else 6
        rows = (len(ims) + cols - 1) // cols
        sheet = np.zeros((rows * th, cols * tw, 3), np.uint8)
        for k, im in enumerate(ims):
            sheet[(k // cols) * th:(k // cols + 1) * th, (k % cols) * tw:(k % cols + 1) * tw] = im
        cv2.imwrite(a.out, sheet[..., ::-1])
        return
    wav = a.audio or str(HERE / "score.wav")
    if not os.path.exists(wav):
        sc.render_audio(wav)
    out = c.FFOut(a.save, 30, a.crf, audio=wav)
    t0 = time.time()
    for i in range(450):
        out.write(p.render(i))
        if i % 90 == 0:
            print(f"frame {i}/450  {time.time() - t0:.0f}s", flush=True)
    out.close()


if __name__ == "__main__":
    main()
