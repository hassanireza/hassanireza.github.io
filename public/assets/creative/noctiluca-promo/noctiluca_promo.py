"""NOCTILUCA promo: 33 s, rave-action techno with Hollywood scale, rendered entirely in code.

    python noctiluca_promo.py --save promo.mp4
    python noctiluca_promo.py --width 960 --sheet 1,3,5 --out sheet.png      # quick contact sheet

The Noctiluca mark (one lit cell, one orbit, two satellites) is the hero; plankton-like point clouds dive
through the frame; the app's own challenges ("A small signal", "Echo chamber", "A quiet sum") and concepts
are typed on screen. Abyssal Liturgy tokens, Cormorant Garamond / Jost / JetBrains Mono. Pass, caution and
fail tints (sage, amber, rose) appear only where the app uses them. One score drives sound and picture:
150 BPM, 12 frames per beat.
"""
import argparse
import os
import re
import time
from pathlib import Path

import cv2
import numpy as np

import nc_core as c
import nc_score as sc
import nc_shapes as shp
from nc_core import G, draw_word, eo, eo5, eio, ei, prog, lerp

HERE = Path(__file__).resolve().parent
TAU = 2 * np.pi
B = sc.BEAT
bt = sc.bt
N = 22000
SAGE, AMBER, ROSE = np.array([154, 184, 164], np.float32), np.array([201, 180, 140], np.float32), np.array([192, 131, 121], np.float32)
CX, CY = 960.0, 540.0
ART = (1400.0, 540.0)

CONCEPTS = re.findall(r"\bc\('(\w+)', '(\w+)', '([^']+)'", (HERE / "assets" / "concepts.ts").read_text(encoding="utf8"))
CHALLENGES = [("A small signal", "Print the word hello.", 'print("hello")', "hello"),
              ("Echo chamber", "Print the number 42.", "print(42)", "42"),
              ("A quiet sum", "Print the result of 8 + 5.", "print(8 + 5)", "13")]
FEATS = [("Short", "challenges"), ("Never", "repeat"), ("Adapts", "to you"), ("Spaced", "review"), ("Runs in", "your browser"),
         ("Works", "offline"), ("A craft", "linter"), ("XP and", "streaks")]
LADDER = [
    (420, "A small signal", 'print("hello")'),
    (560, "Count up", "for i in range(4):\n    print(i * i)"),
    (700, "Your own function", 'def greet(name):\n    return f"hi {name}"\n\nprint(greet("Ada"))'),
    (860, "Comprehensions", "squares = {n: n * n\n           for n in range(9)\n           if n % 2 == 0}"),
    (1000, "Recursion, cached", "from functools import cache\n\n@cache\ndef fib(n):\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)"),
    (1150, "Classes and errors", 'class Stack:\n    def __init__(self):\n        self.items = []\n\n    def pop(self):\n        if not self.items:\n            raise IndexError("empty")\n        return self.items.pop()'),
    (1300, "Dynamic programming", "def lcs(a, b):\n    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]\n    for i, x in enumerate(a):\n        for j, y in enumerate(b):\n            dp[i + 1][j + 1] = (dp[i][j] + 1 if x == y\n                else max(dp[i][j + 1], dp[i + 1][j]))\n    return dp[-1][-1]"),
    (1450, "Shortest paths", "import heapq\n\ndef dijkstra(g, s):\n    dist, pq = {s: 0}, [(0, s)]\n    while pq:\n        d, u = heapq.heappop(pq)\n        if d > dist[u]:\n            continue\n        for v, w in g[u]:\n            if d + w < dist.get(v, 1e9):\n                dist[v] = d + w\n                heapq.heappush(pq, (d + w, v))\n    return dist"),
    (1600, "Backtracking", "def queens(n, cols=()):\n    if len(cols) == n:\n        return 1\n    return sum(\n        queens(n, cols + (c,))\n        for c in range(n)\n        if all(c != k and abs(c - k) != len(cols) - i\n               for i, k in enumerate(cols)))"),
]
HARD = [("Minimax with alpha-beta", "def minimax(s, depth, a, b, me):\n    if depth == 0 or s.over():\n        return s.score()\n    best = -inf if me else inf\n    for m in s.moves():\n        v = minimax(s.play(m), depth - 1, a, b, not me)\n        best = max(best, v) if me else min(best, v)\n        a, b = (max(a, v), b) if me else (a, min(b, v))\n        if b <= a:\n            break\n    return best"),
        ("Knapsack, bottom up", "def knapsack(items, cap):\n    best = [0] * (cap + 1)\n    for w, v in items:\n        for c in range(cap, w - 1, -1):\n            best[c] = max(best[c], best[c - w] + v)\n    return best[cap]\n\nprint(knapsack([(3, 40), (4, 50), (5, 70)], 8))")]
RAIN_CHARS = list("01{}[]()<>=:+-*/%#_.,;|&^~@!?") + list("defreturnclassforinimportlambdayieldwhileassertself")
TRACKS = ["Foundations", "Data", "Craft", "Algorithms", "Game Theory"]


class Promo:
    def __init__(self, width=1920):
        c.setup(width)
        self.events = sc.build_events()
        self.env = c.Env(990, self.events)
        self.cv, self.post = c.Canvas(), c.Post()
        self.cloud = c.Cloud(N, seed=33)
        self.cloud.alpha[:] = 0
        self.cloud.talpha[:] = 1
        self.lit = np.random.default_rng(8).random(N) < .16
        self.spl = c.Splat()
        self.words, self.shapes = {}, {}
        self.i, self.t = -1, 0.0
        self.sched, self.sched_i = [], 0
        r = np.random.default_rng(5)
        self.dust = dict(x=r.random(300) * 1920, y=r.random(300) * 1080, vx=(r.random(300) - .5) * 8, vy=-(r.random(300) * 7 + 2), z=r.random(300), ph=r.random(300) * TAU)
        self.tint = SAGE
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
        r = np.random.default_rng(abs(hash(name)) % 9999 + 7)
        if name == "mark":
            P = shp.mark(N, r, kw.get("s", 1.0))
        elif name == "orbits":
            P = shp.orbits(N, r, 5, kw.get("s", 1.0))
        elif name == "tube":
            P = shp.tube(N, r)
        elif name == "text":
            w = self.W(kw["text"], "mono", kw.get("size", 80), 600)
            p2 = c.word_points(w, N, r, 1.0, (0, 0))
            P = np.concatenate([p2, (r.random(N, dtype=np.float32)[:, None] - .5) * 40], 1)
        elif name == "matrix":
            P = shp.matrix2x2(N, r, cell=170, discs=kw.get("discs", (.9, .08, 1.0, .42)))
        elif name == "field":
            P = ((r.random((N, 3)) - .5) * np.array([2600, 1500, 1800])).astype(np.float32)
        else:
            P = shp.shape_for(name, N, r)
        self.shapes[key] = P.astype(np.float32)
        return P.astype(np.float32).copy()

    def off(self, P, dx, dy):
        P = P.copy()
        P[:, 0] += dx - CX
        P[:, 1] += dy - CY
        return P

    def schedule(self):
        S = self.sched

        def at(b, fn):
            S.append((bt(b), fn))

        def tgt(s, P, om, stag=.6):
            s.cloud.set_target(P, om, stag)

        def burst(s, st=900, spin=0):
            s.cloud.explode(st, spin=spin)

        at(0.0, lambda s: (tgt(s, s.shape("field"), .6, 1.0), s.cloud.__setattr__("alpha", np.ones(N, np.float32) * .0)))
        at(.5, lambda s: s.cloud.__setattr__("talpha", np.ones(N, np.float32)))
        at(5.0, lambda s: tgt(s, s.shape("tube"), 2.0, .8))
        at(7.5, lambda s: s.cloud.__setattr__("talpha", np.zeros(N, np.float32)))
        at(7.95, lambda s: (s.cloud.__setattr__("alpha", np.ones(N, np.float32)), s.cloud.__setattr__("talpha", np.ones(N, np.float32)), burst(s, 1900, 300),
                            tgt(s, s.off(s.shape("mark", s=1.45), *ART), 3.2, .9)))
        at(10.0, lambda s: (burst(s, 700), tgt(s, s.shape("tube"), 3.0, .6)))
        at(14.0, lambda s: tgt(s, s.shape("field"), 2.5, .8))
        at(32.0, lambda s: (burst(s, 900), tgt(s, s.off(s.shape("orbits", s=.7), *ART), 8.0, .7)))
        at(40.0, lambda s: (burst(s, 800), tgt(s, s.shape("orbits", s=1.3) * np.array([1, 1, 1], np.float32), 1.6, .8)))
        at(44.0, lambda s: tgt(s, s.shape("galaxy"), 2.0, .8))
        at(48.0, lambda s: tgt(s, s.shape("orbits", s=1.5), 1.8, .8))
        at(52.0, lambda s: tgt(s, s.shape("tube"), 2.4, .8))
        at(55.0, lambda s: tgt(s, np.random.default_rng(1).standard_normal((N, 3)).astype(np.float32) * 5, 11.0, .3))
        at(55.5, lambda s: s.cloud.__setattr__("talpha", np.zeros(N, np.float32)))
        at(55.95, lambda s: (s.cloud.__setattr__("alpha", np.ones(N, np.float32)), s.cloud.__setattr__("talpha", np.ones(N, np.float32)), burst(s, 2300, 400),
                             tgt(s, s.shape("tube"), 3.0, .7)))
        at(68.0, lambda s: (burst(s, 700), tgt(s, s.off(s.shape("matrix"), *ART), 10.0, .6)))
        at(72.0, lambda s: tgt(s, s.shape("tube"), 4.0, .7))
        at(74.0, lambda s: tgt(s, s.off(s.shape("mark", s=.9), CX, CY), 6.0, .5))
        at(74.95, lambda s: (burst(s, 1500, 300), tgt(s, s.off(s.shape("mark", s=1.2), *ART), 3.0, .9)))

    # ---------------------------------------------------------------- plumbing
    def begin(self, i):
        self.i, self.t = i, i / 30.0
        self.cv.clear()
        self.tint = SAGE
        self.fx = dict(bloom=.5, streak=.28, ca=0.0, grain=.012, flash=0.0, zoom=1.0, shake=(0.0, 0.0), glitch=[], fade=1.0, tint=SAGE)
        while self.sched_i < len(self.sched) and self.sched[self.sched_i][0] <= self.t + 1e-6:
            self.sched[self.sched_i][1](self)
            self.sched_i += 1
        self.cloud.step(1 / 30.0)

    def since(self, name, kind=None):
        return self.env.since(name, self.i, kind)

    def pulse(self, name, decay=.12, kind=None):
        return self.env.pulse(name, self.i, decay, kind)

    def hit(self, amt=1.0):
        k = self.pulse("kick", .13, "hard")
        k2 = max(self.pulse("taiko", .18), .8 * self.pulse("impact", .22))
        kk = max(k * .55, k2)
        self.fx["zoom"] *= 1 + (.012 * k + .04 * k2) * amt
        sh = 4 * k + 9 * k2
        self.fx["shake"] = (float(np.sin(self.i * 12.989) * sh), float(np.sin(self.i * 78.233) * sh))
        self.fx["ca"] = max(self.fx["ca"], 1.5 * k + 3.4 * k2)
        d, s = self.since("impact")
        self.fx["flash"] = max(self.fx["flash"], s * float(np.exp(-d / .05)) * .8)
        return k, k2

    def mono(self, text, x, y, size=22, v=150, align="left", tr=8.0, alpha=1.0, layer="L"):
        draw_word(self.cv, self.W(text, "mono", size, 400, tr), x, y, align, alpha=alpha * v / 255.0, layer=layer)

    def glitch(self, n, seed=0):
        r = np.random.default_rng(self.i * 31 + seed)
        for _ in range(n):
            self.fx["glitch"].append((int(r.integers(0, 1000)), int(r.integers(10, 80)), int(r.integers(-160, 160))))

    def draw_cloud(self, gain=1.0, yaw=0.0, pitch=0.0, roll=0.0, scale=1.0, fly=0.0, litgain=0.0, cx=CX, cy=CY):
        cl, u = self.cloud, G.u
        P = cl.pos
        if fly:
            P = P.copy()
            P[:, 2] = ((P[:, 2] + fly * self.t) % 3000) - 1500
        X, Y, K, Z = cl.project(yaw, pitch, roll, 0.0, 1100.0, cx, cy, scale, tilt_pts=P)
        fog = np.clip(1.15 - (Z + 700) / 2600, .12, 1.0)
        w = cl.bright * cl.alpha * gain * fog * np.clip(K, .35, 1.7)
        size = cl.sizec.astype(np.int8) + (K > 1.25).astype(np.int8)
        self.spl.draw(self.cv, X * u, Y * u, w, size, sizes=[1, 3, 5])
        if litgain > 0:
            m = self.lit
            self.spl.draw(self.cv, (X * u)[m], (Y * u)[m], (w * litgain)[m], size[m], layer="A", sizes=[1, 3, 5])

    def draw_dust(self, gain=1.0):
        d, t, u = self.dust, self.t, G.u
        x = (d["x"] + d["vx"] * t * (.4 + d["z"])) % 1920
        y = (d["y"] + d["vy"] * t * (.4 + d["z"])) % 1080
        v = (30 + 150 * d["z"] ** 2) * (.55 + .45 * np.sin(t * 1.3 + d["ph"] * 3)) * gain
        xi, yi = np.clip((x * u).astype(int), 0, G.W - 1), np.clip((y * u).astype(int), 0, G.H - 1)
        np.maximum.at(self.cv.L, (yi, xi), v.astype(np.uint8))

    def slam(self, word, x, y, since, dur=.2, tr0=200., blur0=140., align="left", alpha=1.0, extra_blur=0.0, sx=1.0, sy=1.0, dx=0.0, stroke=0, layer="L"):
        p = prog(since, 0, dur)
        e = eo5(p)
        draw_word(self.cv, word, x + dx, y, align, alpha=alpha * float(np.clip(p * 5, 0, 1)), tr=lerp(tr0, 0.0, e),
                  blur=lerp(blur0, 0.0, e) + extra_blur, sx=sx, sy=sy, stroke=stroke, layer=layer)

    def shock(self, cx, cy, age, v=230, speed=2800., th=3., life=.8):
        if 0 <= age <= life:
            r, k = age * speed, 1 - age / life
            self.cv.ring((cx, cy), r, v * k, th * (1 + 2 * k))
            self.cv.ring((cx, cy), r * .84, v * k * .5, th)

    def mark(self, cx, cy, s=1.0, v=235, reveal=1.0, spin=1.0, lit=True):
        """favicon.svg geometry: orbit ellipse (-24 deg), lit cell, two satellites that travel the orbit."""
        cv_, t = self.cv, self.t
        k = .5 * s
        cv_.ellipse((cx, cy), 330 * k, 196 * k, -24, v * .55 * reveal, 2.0 + 1.5 * s, 0, 360 * reveal)
        if lit:
            heart = self.pulse("kick", .18, "hard")
            cv_.disc((cx, cy), 132 * k * (1 + .04 * heart), 255 * reveal)
            cv_.ring((cx, cy), 132 * k * (1.25 + .5 * heart), 140 * heart * reveal, 1.4)
        th = np.radians(-24)
        for a0, r_, sp, vv in ((np.radians(-31), 26, 1.0, 215), (np.radians(145), 18, -.8, 150)):
            a = a0 + spin * t * sp * 1.1
            x, y = 330 * k * np.cos(a), 196 * k * np.sin(a)
            px, py = cx + x * np.cos(th) - y * np.sin(th), cy + x * np.sin(th) + y * np.cos(th)
            cv_.disc((px, py), r_ * k * 1.1, vv * reveal)
            for j in range(1, 14):
                aa = a - sp * .05 * j
                xx, yy = 330 * k * np.cos(aa), 196 * k * np.sin(aa)
                cv_.disc((cx + xx * np.cos(th) - yy * np.sin(th), cy + xx * np.sin(th) + yy * np.cos(th)), max(1, r_ * k * .5 * (1 - j / 14)), vv * (1 - j / 14) * .7 * reveal)

    def glyph(self, ch):
        k = ("g", ch, G.W)
        if k not in self.words:
            f = c.font("mono", 24 * G.u, 400)
            l, t_, r, b_ = f.getbbox(ch, anchor="ls")
            im = c.Image.new("L", (max(2, r - l + 2), max(2, b_ - t_ + 2)), 0)
            c.ImageDraw.Draw(im).text((-l + 1, -t_ + 1), ch, font=f, fill=255, anchor="ls")
            self.words[k] = (np.asarray(im, np.uint8), l - 1, t_ - 1)
        return self.words[k]

    def rain(self, v=1.0, speed=1.0, lit=.12, trail=15, cols=68, top=0.0):
        """Matrix-style code rain: columns of python glyphs falling, white-hot heads, fading trails."""
        t, u = self.t, G.u
        r = np.random.default_rng(404)
        off, spd = r.random(cols) * 3000, .55 + r.random(cols) * .9
        litc = r.random(cols) < lit
        lh, sp = 30.0, G.dw / cols
        L = self.cv.L
        for j in range(cols):
            head = (off[j] + t * 420 * speed * spd[j]) % (G.dh + trail * lh) - 0
            x = (j + .5) * sp
            for k in range(trail):
                y = head - k * lh
                if y < top or y > G.dh:
                    continue
                ch = RAIN_CHARS[int((j * 7919 + k * 104729 + int(t * 7 + k * .6) * 31) % len(RAIN_CHARS))]
                m, ox, oy = self.glyph(ch)
                a = (1 - k / trail) ** 1.7 * v * (1.0 if k else 1.0)
                val = 255 if k == 0 else 255 * a * .55
                c.blit(L, m, x * u + ox, y * u + oy, float(min(1.0, val / 255.0)))
                if k == 0 and litc[j]:
                    c.blit(self.cv.A, m, x * u + ox, y * u + oy, float(min(1.0, v)))

    def decode(self, code, frac, x, y, size, lh, v=255, gutter=True):
        """matrix-style decode: revealed text is crisp, a short wavefront of random glyphs runs ahead of it."""
        total = len(code)
        R = int(frac * total)
        r = np.random.default_rng(self.i * 13 + 5)
        pool = RAIN_CHARS
        lines = code.split("\n")
        pos = 0
        for li, line in enumerate(lines):
            seg = []
            for ci, ch in enumerate(line):
                idx = pos + ci
                if idx < R:
                    seg.append(ch)
                elif idx < R + 10 and ch != " ":
                    seg.append(pool[int(r.integers(0, len(pool)))])
                else:
                    seg.append(" ")
            pos += len(line) + 1
            txt = "".join(seg)
            if txt.strip():
                draw_word(self.cv, c.Word(txt, "mono", size, 400, 0), x, y + li * lh, "left", alpha=v / 255.0)
            if gutter and pos - len(line) - 1 < R:
                self.mono(f"{li + 1:02d}", x - 40, y + li * lh, int(size * .62), 110, "right", tr=1)

    def panel(self, x0, y0, x1, y1, v=140):
        cv_ = self.cv
        cv_.poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], v, 1.4, True)
        cv_.line((x0, y0 + 56), (x1, y0 + 56), v * .5, 1)
        for j in range(3):
            cv_.disc((x0 + 28 + j * 22, y0 + 28), 5, v * (1.0 if j == 0 else .5))

    # ---------------------------------------------------------------- scenes
    def s_open(self):
        t, cv = self.t, self.cv
        b = t / B
        self.fx["fade"] = float(eo(prog(t, 0, .35)))
        self.rain(.5 * float(eo(prog(b, 1.5, 5))), .6 + 2.0 * prog(b, 4, 7.5), .15)
        self.draw_dust(.9)
        self.draw_cloud(gain=.55 * float(eo(prog(t, .2, 1.4))), yaw=t * .1, fly=70 + 300 * prog(b, 4, 7.5) ** 2, litgain=.4)
        nkeys = self.env.count("key", self.i)
        typed = min(len(sc.CODE), nkeys)
        cur = sc.CODE[:typed]
        base_y = 600
        px0, px1, py0, py1 = 300, 1620, 330, 780
        a = float(eo(prog(t, .1, .6)))
        self.panel(px0, py0, px1, py1, 120 * a)
        self.mono("main.py", px0 + 120, py0 + 36, 20, 150 * a, tr=4)
        self.mono("01", px0 + 56, base_y, 30, 100 * a, "right", tr=2)
        zoom = 1 + .5 * float(ei(prog(b, 5.5, 7.5)))
        wd = self.W(cur or " ", "mono", 100, 400, 0)
        draw_word(cv, wd, px0 + 100, base_y, "left", alpha=1.0)
        w_px = c.text_width(wd) if cur else 0
        blink = (int(t / (B)) % 2 == 0) or typed < len(sc.CODE)
        if blink and b < 5.0:
            cv.rect(px0 + 100 + w_px + 6, base_y - 78, px0 + 100 + w_px + 30, base_y + 8, 255)
        kd, ks = self.since("key")
        if kd < .1 and b < 5.2:
            cv.ring((px0 + 100 + w_px, base_y - 36), 20 + kd * 500, 160 * (1 - kd / .1), 1.2)
            self.fx["ca"] = 1.4
        self.mono("PYTHON 3  ·  PYODIDE  ·  RUNS IN YOUR BROWSER", px0, py1 + 52, 20, 130 * a, tr=8)
        if b >= 5.0:
            q = float(eo(prog(b, 5.0, 5.4)))
            self.mono("> hello", px0 + 100, base_y + 140, 56, 255 * q, "left", tr=2)
            cv.line((px0 + 80, base_y + 70), (px1 - 80, base_y + 70), 90 * q, 1)
            cv.rect(px0 + 80, base_y + 66, px0 + 80 + (px1 - px0 - 160) * float(eio(prog(b, 5.0, 7.4))), base_y + 69, 230)
        if b >= 5.5:
            self.fx["zoom"] *= zoom
            self.fx["ca"] = 1 + 6 * float(ei(prog(b, 5.5, 7.5)))
            sn = self.pulse("snare", .06)
            self.glitch(int(sn * 3))
            self.fx["flash"] = max(self.fx["flash"], .1 * float(sn > .4))
        self.fx["streak"] = .3

    def s_vac(self):
        q = prog(self.t, bt(7.5), bt(8)) if self.t < bt(8) else prog(self.t, bt(55.5), bt(56))
        self.cv.disc((CX, CY), 3 + 7 * q, 255)
        self.cv.disc((CX, CY), 3 + 7 * q, 255, "A")
        self.cv.line((CX - 800 * q, CY), (CX + 800 * q, CY), 130 * q, 1)
        self.fx["bloom"] = .7

    def s_title(self):
        t, cv = self.t, self.cv
        b = t / B
        k, k2 = self.hit()
        since = t - bt(8)
        self.shock(ART[0], ART[1], since, 240, 3000, 3.2, .9)
        self.rain(.55, 1.6, .2)
        self.draw_cloud(gain=1.0 + .3 * k, yaw=.1 * np.sin(t), litgain=.5 + k, fly=250 if b >= 10 else 0)
        self.draw_dust(.7)
        if b < 10:
            self.mark(ART[0], ART[1], 1.45, 235, float(eo(prog(since, 0, .3))))
            tw = self.W("Noctiluca", "serif", 250, 400)
            self.slam(tw, 130, 590, since, .3, 260, 180, "left", sx=1 + .02 * k, sy=1 + .02 * k)
            self.mono("ADAPTIVE PYTHON PRACTICE", 136, 660, 26, 190 * float(eo(prog(since, .3, .6))), tr=14)
            cv.line((136, 690), (136 + 560 * float(eio(prog(since, .2, .9))), 690), 120, 1)
        else:
            words = {10: "PYTHON,", 11: "AT THE", 12: "RIGHT", 13: "DEPTH."}
            bi = int(b)
            wd = self.fit(words[bi], "serif", 440, 1700, 400)
            sn = t - bt(bi)
            exit_q = prog(sn, B - .1, B)
            self.slam(wd, CX, 640, sn, .17, 240, 220, "center", alpha=1 - exit_q, extra_blur=exit_q * 200, sx=1 + .03 * k + exit_q * 1.0, sy=1 + .03 * k)
            ghost = self.fit(words[bi], "serif", 440, 1700, 400)
            draw_word(cv, ghost, CX, 640 - 300, "center", alpha=.15, stroke=2, sy=.5)
            depth = int(30 * (b - 10) ** 1.6 * 8)
            self.mono(f"DEPTH  {depth:04d} M", 136, 1000, 28, 220, tr=10)
            cv.line((136, 960), (136 + 460, 960), 100, 1)
            for j in range(12):
                cv.line((1760, 140 + j * 70), (1760 + (30 if j % 3 == 0 else 14), 140 + j * 70), 140, 1)
            cv.disc((1768, 140 + 70 * 11 * prog(b, 10, 14)), 5, 255)
            if sn < .06:
                self.fx["flash"] = max(self.fx["flash"], .3)
                self.glitch(3, bi)
        self.hud()
        self.fx["streak"] = .35 + .3 * k

    def hud(self, cap=None):
        self.mono("NOCTILUCA", 96, 82, 20, 140, tr=10)
        self.mono(f"{int(self.t // 60):02d}:{int(self.t % 60):02d}:{self.i % 30:02d}", 1824, 82, 20, 130, "right", tr=3)
        if cap:
            self.mono(cap, 96, 1006, 20, 150, tr=8)

    def s_ladder(self):
        t, cv = self.t, self.cv
        b = t / B
        k, k2 = self.hit(.7)
        idx = min(8, int((b - 14) // 2))
        s0 = 14 + idx * 2
        sb = b - s0
        sn = sb * B
        rating, title, code = LADDER[idx]
        heat = idx / 8.0
        self.rain(.55 + .45 * heat, 1.0 + 1.6 * heat, .10 + .25 * heat)
        self.draw_cloud(gain=.28 + .15 * k, yaw=t * .12, pitch=.1, fly=180, litgain=.5 + 1.0 * k)
        # ladder rail with nine rungs, the climb itself
        for j in range(9):
            y = 940 - j * 98
            on = j <= idx
            cv.line((96, y), (96 + (44 if on else 22), y), 255 if j == idx else (150 if on else 50), 1.6)
            if j == idx:
                cv.disc((96, y), 7, 255)
                cv.disc((96, y), 7, 255, "A")
        cv.line((96, 940), (96, 940 - 8 * 98), 70, 1)
        # left column: rating, title
        self.mono(f"LEVEL {idx + 1:02d}", 190, 330, 24, 210, tr=14)
        rr = int(rating * float(eo5(prog(sb, 0, .55))) + (rating - 160) * (1 - float(eo5(prog(sb, 0, .55)))) * 0)
        wr = self.W(f"{rr}", "serif", 190, 300)
        self.slam(wr, 190, 520, sn, .14, 120, 90, "left")
        self.mono("RATING", 194, 566, 22, 190, tr=14)
        tw = self.fit(title, "serif", 74, 480, 400)
        draw_word(cv, tw, 190, 660, "left", alpha=float(eo(prog(sb, .05, .4))))
        if idx >= 6:
            self.mono("EXPERT" if idx == 8 else "HARD", 194, 720, 26, 230, tr=18)
            self.fx["ca"] = max(self.fx["ca"], 2.0 + idx * .4)
        # code panel, sized to the snippet
        lines = code.count("\n") + 1
        maxlen = max(len(l_) for l_ in code.split("\n"))
        size = 72 if lines <= 3 else 56 if lines <= 5 else 44 if lines <= 8 else 36
        size = int(min(size, 1130 / (maxlen * .6)))
        lh = size * 1.32
        ph = lines * lh + 130
        y0 = 540 - ph / 2
        a = float(eo5(prog(sb, 0, .2)))
        self.panel(640, y0, 1860, y0 + ph, 150 * a)
        self.mono("main.py", 750, y0 + 36, 20, 160 * a, tr=4)
        n_arp = self.env.count("arp", self.i) - self.env.count("arp", int(round(s0 * B * 30)) - 1)
        frac = float(np.clip((n_arp + 1) / 6.5, 0, 1))
        self.decode(code, frac, 730, y0 + 56 + size + 24, size, lh)
        done = frac >= 1.0
        if done and sb > 1.55:
            q = float(eo5(prog(sb, 1.55, 1.8)))
            ps = self.W("PASS", "mono", 44, 700, 14)
            draw_word(cv, ps, 1850, y0 + ph + 70, "right", alpha=q, layer="A")
            draw_word(cv, ps, 1850, y0 + ph + 70, "right", alpha=q)
            self.mono(f"+{40 + idx * 15} XP", 1850, y0 - 30, 26, 220 * q, "right", tr=6)
            self.shock(1740, y0 + ph + 56, (sb - 1.55) * B, 150, 1500, 2.0, .45)
        if sn < .07:
            self.fx["flash"] = max(self.fx["flash"], .09 + .008 * idx)
            self.glitch(2 + idx // 3, idx)
        self.hud("FROM print() TO ALGORITHMS")
        self.fx["streak"] = .3 + .3 * k

    def s_features(self):
        t, cv = self.t, self.cv
        b = t / B
        sel = int(min(3, (b - 32) // 2))
        idx = [2, 1, 4, 7][sel]
        sb = (b - (32 + sel * 2))
        sn = sb * B
        k, k2 = self.hit(.8)
        self.rain(.45, 1.4, .18)
        self.draw_cloud(gain=.5 + .5 * k, yaw=t * .2, pitch=.12, scale=1.0 + .03 * k, fly=-220, litgain=.6 + 1.1 * k, cx=ART[0] - 80, cy=540)
        self.draw_dust(.6)
        l1, l2 = FEATS[idx]
        ex = float(ei(prog(sb, 1.75, 2.0)))
        w1 = self.fit(l1, "serif", 230, 900, 400)
        w2 = self.fit(l2, "serif", 230, 900, 400)
        self.slam(w1, 130, 520, sn, .18, 200, 150, "left", alpha=1 - ex, extra_blur=ex * 100, dx=-ex * 180)
        self.slam(w2, 130, 740, sn - .04, .18, 200, 150, "left", alpha=1 - ex, extra_blur=ex * 100, dx=-ex * 180)
        self.mono(f"{sel + 1:02d}  /  04", 134, 340, 24, 190 * (1 - ex), tr=12)
        cv.line((136, 780), (136 + 520 * float(eio(prog(sb, .05, .5))), 780), 110, 1)
        self.feature_art(idx, sb, sn, k)
        self.hud("PYTHON, AT THE RIGHT DEPTH")
        if sn < .08:
            self.fx["flash"] = max(self.fx["flash"], .25)
            self.glitch(3, idx)

    def feature_art(self, idx, sb, sn, k):
        cv, t = self.cv, self.t
        ax, ay = ART[0] - 20, 540
        q = float(eo(prog(sb, 0, .4)))
        if idx == 0:
            cv.ring((ax, ay), 210, 120 * q, 1.4)
            cv.ring((ax, ay), 210, 255 * q, 3.0, -90, -90 + 360 * float(prog(sb, .1, 1.7)))
            self.mono("60s", ax, ay + 20, 70, 255 * q, "center", tr=4)
        elif idx == 1:
            rr = np.random.default_rng(self.i // 3)
            for gx in range(7):
                for gy in range(7):
                    cv.disc((ax - 210 + gx * 70, ay - 210 + gy * 70), 4 + 18 * rr.random() ** 2, 120 + 120 * rr.random())
            self.mono("157 DRILL FAMILIES  ·  SEEDED", ax, ay + 290, 20, 190, "center", tr=8)
        elif idx == 2:
            xs = np.linspace(-300, 300, 60)
            ys = -200 * (1 / (1 + np.exp(-(xs / 90))) - .5) * 1.6 + 8 * np.sin(xs / 24 + t * 3)
            pts = [(ax + x, ay + y * .9) for x, y in zip(xs, ys)]
            n = int(60 * float(prog(sb, .05, 1.6)))
            cv.rect(ax - 300, ay - 80, ax + 300, ay - 76, 40)
            cv.rect(ax - 300, ay + 52, ax + 300, ay + 56, 40)
            if n > 1:
                cv.poly(pts[:n], 240, 2.4)
                cv.disc(pts[n - 1], 9, 255)
                cv.disc(pts[n - 1], 9, 255, "A")
            self.mono("TARGET  72%", ax, ay + 200, 30, 220, "center", tr=10)
        elif idx == 3:
            days = [0, 1, 3, 7, 16, 35]
            for j, d in enumerate(days):
                x = ax - 300 + j * 120
                on = sb > .12 + .24 * j
                cv.disc((x, ay), 12 if on else 5, 255 if on else 90)
                if on:
                    cv.disc((x, ay), 12, 255, "A")
                self.mono(f"{d}D", x, ay + 56, 22, 200 if on else 80, "center", tr=2)
                if j:
                    cv.line((x - 120 + 14, ay), (x - 14, ay), 120 if on else 40, 1)
        elif idx == 4:
            self.panel(ax - 300, ay - 190, ax + 300, ay + 190, 150)
            self.mono(">>> print('hi')", ax - 260, ay - 40, 34, 240, tr=1)
            if sb > .8:
                self.mono("hi", ax - 260, ay + 30, 34, 255, tr=1)
            self.mono("PYODIDE  ·  WEB WORKER", ax, ay + 250, 20, 190, "center", tr=8)
        elif idx == 5:
            for j in range(3):
                cv.ellipse((ax, ay + 60), 70 + 60 * j, 70 + 60 * j, 0, 230 - 60 * j, 2.4, 215, 325)
            cv.disc((ax, ay + 70), 14, 255)
            cv.disc((ax, ay + 70), 14, 255, "A")
            sl = float(eo(prog(sb, .3, .6)))
            cv.line((ax - 180, ay - 130), (ax - 180 + 360 * sl, ay - 130 + 360 * sl * .72), 255, 3.0)
            self.mono("STILL RUNS", ax, ay + 250, 26, 220, "center", tr=14)
        elif idx == 6:
            self.panel(ax - 330, ay - 150, ax + 330, ay + 130, 150)
            self.mono("def add(x, items=[]):", ax - 290, ay - 20, 32, 240, tr=1)
            w = float(eio(prog(sb, .4, 1.0)))
            for j in range(int(18 * w)):
                cv.line((ax - 100 + j * 14, ay + 4 + (j % 2) * 4), (ax - 100 + j * 14 + 14, ay + 8 - (j % 2) * 4), 230, 1.6, "A")
            self.fx["tint"] = AMBER
            if sb > .8:
                self.mono("MUTABLE DEFAULT", ax - 290, ay + 80, 24, 230, tr=8, layer="A")
                self.mono("MUTABLE DEFAULT", ax - 290, ay + 80, 24, 200, tr=8)
        else:
            f = float(eo(prog(sb, .1, 1.5)))
            cv.poly([(ax - 300, ay - 14), (ax + 300, ay - 14), (ax + 300, ay + 14), (ax - 300, ay + 14)], 130, 1.4, True)
            cv.rect(ax - 298, ay - 12, ax - 298 + 596 * f, ay + 12, 240)
            cv.rect(ax - 298, ay - 12, ax - 298 + 596 * f, ay + 12, 180, "A")
            self.mono("LEVEL", ax - 300, ay - 70, 24, 190, tr=12)
            self.mono(f"{int(7 + (1 if f >= .99 else 0))}", ax + 300, ay - 70, 44, 255, "right", tr=2)
            if f >= .99:
                self.shock(ax, ay, sn - 1.2 * B, 200, 1400, 2.2, .5)

    def s_tracks(self):
        t, cv = self.t, self.cv
        b = t / B
        k, k2 = self.hit(.5)
        sb = b - 40
        self.fx["fade"] = 1.0
        d, s = self.since("downlift")
        self.fx["flash"] = max(self.fx["flash"], (0.35 * (1 - sb / .8)) if sb < .8 else 0)
        self.rain(.4, .8, .15)
        self.draw_cloud(gain=.9, yaw=t * .08, pitch=.5 + .1 * np.sin(t * .5), scale=1.0, litgain=.9 + 1.2 * self.pulse("tick", .08), cx=CX, cy=CY)
        self.draw_dust(.9)
        tick = self.env.count("tick", self.i)
        # five orbits, one lit cell each
        for j in range(5):
            on = prog(sb, .5 + j * .55, 1.5 + j * .55)
            rx, ry, ang = 200 + 120 * j, 110 + 70 * j, -24 + 11 * j
            cv.ellipse((CX, CY), rx, ry, ang, 150 * on, 1.4, 0, 360 * float(eo(on)))
            a = t * (.7 - .09 * j) + j * 1.3
            th = np.radians(ang)
            x, y = rx * np.cos(a), ry * np.sin(a)
            p = (CX + x * np.cos(th) - y * np.sin(th), CY + x * np.sin(th) + y * np.cos(th))
            if on > .5:
                cv.disc(p, 9 + 2 * j, 255)
                cv.disc(p, 9 + 2 * j, 255, "A")
                self.mono(TRACKS[j].upper(), p[0] + 22, p[1] - 14, 18, 200, tr=8)
        cv.disc((CX, CY), 40 + 6 * self.pulse("kick", .2, "heart"), 255)
        cv.disc((CX, CY), 40, 255, "A")
        # counts
        phase = min(3, int(sb // 4))
        if phase == 0:
            txt, sub = "5", "TRACKS"
        elif phase == 1:
            txt, sub = f"{int(round(29 * float(eo5(prog(sb, 4, 5.5)))))}", "CONCEPTS"
        elif phase == 2:
            txt, sub = f"{int(round(146 * float(eo5(prog(sb, 8, 10)))))}", "AUTHORED CHALLENGES"
        else:
            txt, sub = f"{int(round(157 * float(eo5(prog(sb, 12, 14)))))}", "SEEDED DRILL FAMILIES"
        pb = (phase) * 4
        wd = self.W(txt, "serif", 300, 300)
        draw_word(cv, wd, 130, 640, "left", alpha=float(eo(prog(sb, pb, pb + .5))), sx=1 + .01 * self.pulse("tick", .05))
        self.mono(sub, 138, 720, 30, 220 * float(eo(prog(sb, pb + .2, pb + .7))), tr=16)
        cv.line((138, 750), (138 + 520, 750), 110, 1)
        self.hud("29 CONCEPTS  ·  5 TRACKS")
        if b >= 52:
            sn = self.pulse("snare", .06)
            self.fx["invert"] = float(sn > .35) * .08 * prog(b, 52, 55.5)
            self.fx["ca"] = 1 + 5 * prog(b, 52, 55.5) ** 2
            self.glitch(int(sn * 3))
        if b >= 55.1:
            self.fx["zoom"] *= 1 + .9 * float(ei(prog(b, 55.1, 55.5)))
            self.fx["fade"] = 1 - float(ei(prog(b, 55.2, 55.5)))

    def s_drop2(self):
        t, cv = self.t, self.cv
        b = t / B
        k, k2 = self.hit()
        sb = b - 56
        since = t - bt(56)
        self.rain(.9, 2.4, .25) if b < 68 else None
        self.draw_cloud(gain=(.45 if 68 <= b < 72 else (.35 if 59 <= b < 64 else 1.0)) + .5 * k, yaw=t * .3, roll=t * .05, fly=500, litgain=.8 + 1.3 * k, scale=1.0 + .03 * k)
        self.draw_dust(.8)
        if b < 59:
            words = {56: "WRITE.", 57: "DEBUG.", 58: "TRACE."}
            bi = int(b)
            sn = t - bt(bi)
            wd = self.fit(words[bi], "serif", 500, 1750, 400)
            exit_q = prog(sn, B - .08, B)
            self.shock(CX, CY, since, 240, 3200, 3.4, .9) if bi == 56 else None
            self.slam(wd, CX, 680, sn, .14, 260, 240, "center", alpha=1 - exit_q, extra_blur=exit_q * 220, sx=1 + .035 * k + exit_q * 1.2, sy=1 + .03 * k)
            draw_word(cv, wd, CX, 680 - 330, "center", alpha=.16, stroke=2, sy=.5)
            draw_word(cv, wd, CX, 680 + 250, "center", alpha=.16, stroke=2, sy=.5)
            self.mono(["print(...)", "TypeError", "trace(n=3)"][bi - 56], 136, 980, 30, 220, tr=8)
            if sn < .06:
                self.glitch(4, bi)
                self.fx["flash"] = max(self.fx["flash"], .3)
        elif b < 64:
            hi = 0 if b < 61.5 else 1
            h0 = 59 + hi * 2.5
            sb2 = b - h0
            title, code = HARD[hi]
            lines = code.count("\n") + 1
            maxlen = max(len(l_) for l_ in code.split("\n"))
            size = int(min(58 if lines <= 8 else 42, 1620 / (maxlen * .6)))
            lh = size * 1.3
            x0 = 960 - maxlen * .6 * size / 2
            y0 = max(330, 575 - lines * lh / 2 + 50)
            n_arp = self.env.count("arp", self.i) - self.env.count("arp", int(round(bt(h0) * 30)) - 1)
            frac = float(np.clip((n_arp + 1) / 8.5, 0, 1))
            self.decode(code, frac, x0, y0, size, lh)
            self.mono("RATING 1600  ·  EXPERT", 136, 130, 26, 230, tr=14)
            wd = self.fit(title, "serif", 110, 1500, 400)
            self.slam(wd, 136, 240, sb2 * B, .14, 140, 100, "left")
            self.mono("MULTI-LINE  ·  REAL ALGORITHMS  ·  EVERY ONE VERIFIED", 136, 1000, 22, 200, tr=10)
            if sb2 * B < .05:
                self.fx["flash"] = max(self.fx["flash"], .2)
                self.glitch(4, hi)
            self.fx["ca"] = 3
        elif b < 68:
            self._debug(t, b)
        elif b < 72:
            self._gt(t, b)
        else:
            self._collapse(t, b)
        if b >= 56:
            self.hud()
        self.fx["streak"] = .35 + .3 * k

    def _debug(self, t, b):
        cv = self.cv
        sb = b - 64
        bad = sb < 1.5
        self.panel(300, 300, 1620, 760, 150)
        self.mono("main.py", 420, 336, 20, 150, tr=4)
        code = 'print("hello)' if bad else 'print("hello")'
        draw_word(cv, self.W(code, "mono", 100, 400, 0), 400, 560)
        if bad:
            self.fx["tint"] = ROSE
            w = float(eio(prog(sb, .2, 1.0)))
            for j in range(int(26 * w)):
                cv.line((400 + j * 22, 596 + (j % 2) * 5), (400 + j * 22 + 22, 596 + 5 - (j % 2) * 5), 255, 2.0, "A")
            self.mono("SyntaxError: unterminated string literal", 400, 700, 30, 235, tr=2, layer="A")
            self.mono("SyntaxError: unterminated string literal", 400, 700, 30, 220, tr=2)
            self.fx["ca"] = 2 + 6 * self.pulse("snare", .06)
            self.glitch(2)
        else:
            q = float(eo5(prog(sb, 1.5, 1.8)))
            self.mono("> hello", 400, 700, 52, 255 * q, tr=2)
            ps = self.W("PASS", "mono", 60, 700, 14)
            draw_word(cv, ps, 1560, 700, "right", alpha=q, layer="A")
            draw_word(cv, ps, 1560, 700, "right", alpha=q)
            self.shock(1500, 690, (sb - 1.5) * B, 200, 1800, 2.4, .6)
            if (sb - 1.5) * B < .05:
                self.fx["flash"] = max(self.fx["flash"], .35)
        lab = "DEBUG" if bad else "FIXED"
        self.mono(lab, 136, 980, 30, 230, tr=14, layer="L")
        if b >= 67:
            q = float(eo5(prog(b, 67, 67.3)))
            wd = self.W("LEVEL UP", "serif", 240, 400)
            self.slam(wd, CX, 960, (b - 67) * B, .15, 140, 120, "center", alpha=q)

    def _gt(self, t, b):
        cv = self.cv
        sb = b - 68
        ax, ay = ART[0] - 30, 540
        wd = self.W("Game theory,", "serif", 170, 400)
        w2 = self.W("in code.", "serif", 170, 400)
        self.slam(wd, 130, 440, sb * B, .18, 160, 120, "left")
        self.slam(w2, 130, 620, sb * B - .06, .18, 160, 120, "left")
        self.mono("TRACK 05  ·  STRATEGY, EQUILIBRIA, MECHANISMS", 136, 700, 22, 200 * float(eo(prog(sb, .3, .6))), tr=8)
        self.panel(130, 760, 1010, 1000, 130)
        code = "def best_response(a, b):"
        n = int(len(code) * prog(sb, .4, 2.4))
        draw_word(cv, self.W(code[:n] or " ", "mono", 38, 400, 0), 160, 900)
        self.draw_matrix_labels(ax, ay)
        self.fx["streak"] = .4

    def draw_matrix_labels(self, ax, ay):
        cv = self.cv
        for r_, txt in enumerate(["(3, 3)  (0, 5)", "(5, 0)  (1, 1)"]):
            self.mono(txt, ax, ay + 330 + r_ * 34, 22, 190, "center", tr=4)

    def _collapse(self, t, b):
        cv = self.cv
        sb = b - 72
        wd = self.W("READY?", "serif", 340, 400)
        self.slam(wd, CX, 660, sb * B, .2, 200, 150, "center")
        self.mono("YOUR MOVE", CX, 760, 28, 200, "center", tr=24)
        for j in range(12):
            ph = (j / 12 + sb * .35 * (1 + sb * .3)) % 1
            cv.ring((CX, CY), 30 + 900 * ph ** 2, 200 * ph, 1 + 2.5 * ph)
        sn = self.pulse("snare", .05)
        if b >= 73.0:
            self.fx["invert"] = float(sn > .35) * .15
            self.glitch(int(sn * 3))
        self.fx["ca"] = 1 + 5 * (sb / 3) ** 2
        if b >= 74.6:
            self.fx["zoom"] *= 1 + .8 * float(ei(prog(b, 74.6, 75.0)))
            self.fx["fade"] = 1 - float(ei(prog(b, 74.7, 75.0)))

    def s_resolve(self):
        t, cv = self.t, self.cv
        since = t - bt(75)
        k, k2 = self.hit()
        self.shock(ART[0], ART[1], since, 240, 3000, 3.2, 1.0)
        self.shock(ART[0], ART[1], since - .25, 150, 2200, 2.0, .8)
        self.draw_cloud(gain=1.0, litgain=.8 + k, fly=60 + 120 * np.exp(-since), cx=CX, cy=CY)
        self.draw_dust(.8)
        self.mark(ART[0], ART[1], 1.45, 240, float(eo(prog(since, .2, 1.0))))
        tw = self.W("Noctiluca", "serif", 250, 400)
        self.slam(tw, 130, 520, since, .4, 260, 200, "left", sx=1 + .015 * k, sy=1 + .015 * k)
        a = float(eo(prog(since, .8, 1.3)))
        tg = self.W("Python, at the right depth.", "serif", 82, 300)
        draw_word(cv, tg, 134, 640, "left", alpha=a)
        cv.line((136, 690), (136 + 560 * float(eio(prog(since, .7, 1.4))), 690), 130 * a, 1)
        cta = float(eo(prog(t, 31.0, 31.5)))
        if cta > 0:
            bx, by, bw, bh = 136, 770, 340, 76
            cv.poly([(bx, by), (bx + bw, by), (bx + bw, by + bh), (bx, by + bh)], 230 * cta, 1.6, True)
            draw_word(cv, self.W("START CODING", "sans", 28, 400, 10), bx + bw / 2, by + 49, "center", alpha=cta)
            br = (since * .8) % 1
            cv.poly([(bx - 22 * br, by - 22 * br), (bx + bw + 22 * br, by - 22 * br), (bx + bw + 22 * br, by + bh + 22 * br), (bx - 22 * br, by + bh + 22 * br)], 90 * cta * (1 - br), 1.0, True)
            self.mono("noctilucapy.github.io", bx + bw + 40, by + 48, 28, 235 * float(eo(prog(t, 31.2, 31.8))), tr=3)
        self.fx["fade"] = float(1 - eio(prog(t, 32.2, 33.0)))
        self.fx["bloom"] = .6

    def render(self, i, post=True):
        self.begin(i)
        b = self.t / B
        if b < 7.5:
            self.s_open()
        elif b < 8:
            self.s_vac()
        elif b < 14:
            self.s_title()
        elif b < 32:
            self.s_ladder()
        elif b < 40:
            self.s_features()
        elif b < 55.5:
            self.s_tracks()
        elif b < 56:
            self.s_vac()
        elif b < 75:
            self.s_drop2()
        else:
            self.s_resolve()
        return self.post.run(self.cv, self.fx) if post else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--save")
    ap.add_argument("--width", type=int, default=1920)
    ap.add_argument("--audio", default=None)
    ap.add_argument("--sheet")
    ap.add_argument("--out", default="sheet.png")
    ap.add_argument("--frames", default=None, help="a:b frame range, video only segment")
    ap.add_argument("--crf", type=int, default=20)
    a = ap.parse_args()
    p = Promo(a.width)
    if a.sheet:
        fr = sorted(set(int(round(float(x) * 30)) for x in a.sheet.split(",")))
        got = {}
        for i in range(max(fr) + 1):
            if i in fr:
                got[i] = p.render(i)
            else:
                p.render(i, post=False)
        ims = [cv2.resize(got[i], (480, 270)) for i in fr]
        cols = 4
        rows = (len(ims) + cols - 1) // cols
        sheet = np.zeros((rows * 270, cols * 480, 3), np.uint8)
        for k, im in enumerate(ims):
            sheet[(k // cols) * 270:(k // cols + 1) * 270, (k % cols) * 480:(k % cols + 1) * 480] = im
        cv2.imwrite(a.out, sheet[..., ::-1])
        return
    if a.frames:
        f0, f1 = [int(x) for x in a.frames.split(":")]
        out = c.FFOut(a.save, 30, a.crf, audio=None)
        for i in range(f1):
            im = p.render(i, post=(i >= f0))
            if i >= f0:
                out.write(im)
        out.close()
        return
    wav = a.audio or str(HERE / "score.wav")
    if not os.path.exists(wav):
        sc.render_audio(wav)
    out = c.FFOut(a.save, 30, a.crf, audio=wav)
    t0 = time.time()
    for i in range(990):
        out.write(p.render(i))
        if i % 90 == 0:
            print(f"frame {i}/990  {time.time() - t0:.0f}s", flush=True)
    out.close()


if __name__ == "__main__":
    main()
