"""Scenes B: BREAKDOWN (32-40), DROP II (40-56), RESOLVE (56-60), plus the Promo class and CLI."""
import argparse
import sys
import time

import cv2
import numpy as np

import tg_core as c
from tg_base import Base, CX, CY, HC, TAU, CHAPTERS
from tg_core import G, draw_word, eo, eo5, eio, ei, prog, lerp
from tg_scenes_a import ScenesA, OFF_HC

DROP2 = [("Minimax Theorem", "saddle"), ("Shapley Value", "net"), ("Dollar Auction", "stairs"), ("Prospect Theory", "s"),
         ("Axelrod's Tournaments and Tit for Tat", "helix"), ("Hotelling's Location Game", "voronoi"), ("Bayesian Games and Bayesian Nash Equilib", "bell"),
         ("Backward Induction", "tree"),
         ("Price of Anarchy", "galaxy"), ("Evolutionary Game Theory", "torus"), ("Mechanism Design", "lattice"), ("Signaling Games", "net"),
         ("Colonel Blotto", "bars"), ("Hypergame Theory", "sphere"), ("Cournot Competition", "bars"), ("Auctions", "stairs")]
SHORT = {"Axelrod's Tournaments and Tit for Tat": "Tit for Tat", "Bayesian Games and Bayesian Nash Equilib": "Bayesian Games",
         "Hotelling's Location Game": "Hotelling's Game", "Evolutionary Game Theory": "Evolution"}


class ScenesB:
    def sched_b(self):
        S = self.sched

        def at(t, fn):
            S.append((t, fn))
        at(32.0, lambda s: (s.cloud.__setattr__("alpha", np.ones_like(s.cloud.alpha) * .6), s.cloud.set_target(s.shape("galaxy"), 1.2, .8)))
        at(38.0, lambda s: s.cloud.set_target(s.shape("rings"), 2.5, .5))
        at(39.45, lambda s: s.cloud.set_target(np.zeros((s.N, 3), np.float32) + s.cloud.rng.standard_normal((s.N, 3)).astype(np.float32) * 5, 9.0, .3))
        at(39.74, lambda s: s.cloud.__setattr__("talpha", np.zeros_like(s.cloud.talpha)))
        at(39.99, lambda s: (s.cloud.__setattr__("alpha", np.ones_like(s.cloud.alpha)), s.cloud.__setattr__("talpha", np.ones_like(s.cloud.talpha)),
                             s.cloud.explode(2400.0, spin=400.0), s.cloud.set_target(s.shape("sphere") * .8, 2.0, .9)))
        for k, (name, shape) in enumerate(DROP2):
            t0 = 48.0 + k * 0.5 if k < 8 else 52.0 + (k - 8) * 0.25

            def f(s, shape=shape, k=k):
                off = np.array([440.0 if k % 2 == 0 else -440.0, 0, 0], np.float32)
                s.cloud.set_target(s.shape(shape) * .68 + off, 18.0, .6)
            at(t0, f)
        at(54.0, lambda s: s.cloud.set_target(s.shape("brand") * .3 + OFF_HC, 8.0, .5))
        at(55.5, lambda s: s.cloud.set_target(np.zeros((s.N, 3), np.float32) + s.cloud.rng.standard_normal((s.N, 3)).astype(np.float32) * 4, 10.0, .3))
        at(55.74, lambda s: s.cloud.__setattr__("talpha", np.zeros_like(s.cloud.talpha)))
        at(55.99, lambda s: (s.cloud.__setattr__("alpha", np.ones_like(s.cloud.alpha)), s.cloud.__setattr__("talpha", np.ones_like(s.cloud.talpha)),
                             s.cloud.explode(1500.0, spin=200.0), s.cloud.set_target(s.shape("brand") * 1.15 + OFF_HC, 2.6, .8)))

    # ------------------------------------------------------------ 32-40 s : BREAKDOWN
    def s_break(self):
        t, cv = self.t, self.cv
        since = t - 32.0
        heart = self.kick(0.22, heart=True)
        d, s = self.since("downlift")
        self.fx["flash"] = max(0.0, .5 * (1 - since / .5)) if since < .5 else 0.0
        self.draw_cloud(gain=.85, yaw=t * .12, pitch=.9 + .05 * np.sin(t * .3), scale=1.0, cam_z=-100)
        self.draw_dust(.8)
        self.fx["bloom"] = .55
        if t < 34.0:
            lines = [("No lectures.", 34.0 - 2 + .1), ("No tutorials.", 33.2), ("Just play.", 33.7)]
            for j, (txt, t0) in enumerate([("No lectures.", 32.3), ("No tutorials.", 32.9), ("Just play.", 33.4)]):
                w = self.W(txt, "serif", 150, 300)
                out = float(ei(prog(t, 33.8, 34.0)))
                self.rise(w, 130, 400 + j * 190, t0, t, .04, .9, 40, extra_a=1 - out)
            self.hud("THE METHOD", show=1.0)
        elif t < 36.0:
            self._phone(t)
            self.hud("MOBILE FIRST", show=1.0)
        elif t < 38.0:
            self._counter(t)
            self.hud("THE CURRICULUM", show=1.0)
        else:
            self._ready(t)
        self.fx["streak"] = .12

    def _phone(self, t):
        cv = self.cv
        since = t - 34.0
        px, py, pw, ph = 960 - 230, 70, 460, 940
        a = float(eo(prog(since, 0, .5)))
        v = 220 * a
        cv.poly([(px, py), (px + pw, py), (px + pw, py + ph), (px, py + ph)], v * .8, 1.5, True)
        cv.poly([(px + 10, py + 10), (px + pw - 10, py + 10), (px + pw - 10, py + ph - 10), (px + 10, py + ph - 10)], v * .25, 1.0, True)
        # three-beat progress bar (the site's grammar)
        beats = ["FEEL", "SEE", "PROVE"]
        stage = min(2, int(since // 0.67))
        for j in range(3):
            x0 = px + 40 + j * 130
            fill = float(eo(prog(since, j * .67, j * .67 + .5)))
            cv.rect(x0, py + 70, x0 + 118, py + 72, 60 * a)
            cv.rect(x0, py + 70, x0 + 118 * fill, py + 73, 240 * a)
            self.mono(beats[j], x0, py + 54, 16, (230 if j <= stage else 90) * a, tr=4)
        w = self.W(["Play first.", "See the structure.", "Prove it."][stage], "serif", 56, 300)
        draw_word(cv, w, px + 40, py + 170, alpha=a)
        # matrix with tapping finger ripples on the heartbeat
        grow = [prog(since, .1 + .25 * j, .35 + .25 * j) for j in range(4)]
        self.fig_matrix(960, py + 500, 150, (.5, .3, 1.0, .8), grow, rings=True, arrows=prog(since, .8, 1.4) if stage >= 1 else 0.0,
                        hl_row=1 if stage == 2 else None, hl=prog(since, 1.4, 1.7), v=235 * a)
        tick = self.since("tick")[0]
        if tick < .15:
            tx, ty = (960 - 75, py + 500 + 75) if stage == 0 else (960 + 75, py + 500 + 75)
            cv.ring((tx, ty), 10 + tick * 400, 200 * (1 - tick / .15), 1.5)
        self.mono("60 - 90 SEC", 960, py + ph - 50, 20, 150 * a, "center", tr=8)

    def _counter(self, t):
        cv = self.cv
        since = t - 36.0
        n = self.env.count("tick", self.i)
        n0 = self.env.count("tick", int(36.0 * 30))
        val = int(round(116 * float(eo5(prog(since, 0, 1.4)))))
        w = self.W(f"{val}", "serif", 520, 300)
        draw_word(cv, w, CX, 600, "center", alpha=1.0, sx=1 + .01 * self.pulse("tick", .05))
        self.mono("THEORIES", CX, 700, 34, 220 * float(eo(prog(since, .2, .6))), "center", tr=26)
        k = float(eo(prog(since, 1.4, 1.9)))
        if k > 0:
            self.mono("10 CHAPTERS    /    ONE GAME EACH    /    60 TO 90 SECONDS", CX, 880, 26, 190 * k, "center", tr=8)
            cv.line((CX - 560, 840), (CX + 560, 840), 100 * k, 1)
        for j in range(116):
            if j <= val:
                x = 150 + (j % 58) * 28.2
                y = 160 + (j // 58) * 18
                cv.disc((x, y), 2.2, 220)

    def _ready(self, t):
        cv = self.cv
        since = t - 38.0
        k = self.kick(.18)
        sn = self.pulse("snare", .06)
        for j in range(12):
            ph = (j / 12 + since * .5 * (1 + since)) % 1
            cv.ring((CX, CY), 30 + 760 * ph ** 2, 200 * ph, 1.0 + 2 * ph)
        w = self.W("READY?", "serif", 330, 400)
        self.slam_word(w, CX, 640, since, .5, 200, 120, "center", sx=1 + .03 * sn, sy=1 + .03 * sn)
        self.mono("YOUR MOVE", CX, 760, 28, 190, "center", tr=24)
        self.hud("THE CURRICULUM", show=1.0)
        self.fx["ca"] = 1 + 5 * (since / 2) ** 2
        if t > 39.0:
            self.fx["invert"] = float(sn > .35) * (since - 1) * .6
            self.glitch_bands(int(sn * 3))
        if t > 39.5:
            self.fx["zoom"] = 1 + .9 * float(ei(prog(t, 39.5, 39.75)))
            self.fx["fade"] = 1 - float(ei(prog(t, 39.62, 39.75)))

    # ------------------------------------------------------------ 40-56 s : DROP II
    def s_drop2(self):
        t = self.t
        if t < 48.0:
            self._assault(t)
        elif t < 55.0:
            self._montage_b(t)
        else:
            self._collapse(t)

    def _wave(self, t, v=235, tilt=0.0):
        kicks = [(a, s) for a, s, x in self.env.ev["kick"] if a <= t and a > t - 3.2 and x in ("drop2", "drop", "build")]
        self.wave.draw(self.cv, t, kicks, cy=640 + tilt, v=v * .6)

    def _assault(self, t):
        cv = self.cv
        since = t - 40.0
        d, s = self.impact_flash()
        k = self.punch(0.035, 9.0, 3.5)
        self._wave(t, 200, tilt=-60 * k)
        self.shock(CX, CY, since, 240, 3200, 3.5, .9)
        self.spokes(CX, CY, since, 100, 230, .5)
        self.draw_cloud(gain=.55 + .3 * k, yaw=t * .4, pitch=.25, scale=1.0 + .05 * k)
        words = [("OUTSMART.", 40.0), ("OUTPLAY.", 42.0), ("OUTTHINK.", 44.0)]
        if t < 46.0:
            idx = int((t - 40.0) // 2)
            txt, t0 = words[idx]
            ss = t - t0
            w = self.fit(txt, "serif", 430, 1740, 400)
            # slam, then 16th-note echo stutter with horizontal offsets
            jit = self.pulse("hat", .04)
            exit_q = prog(t, t0 + 1.8, t0 + 2.0)
            self.slam_word(w, CX, 640, ss, .3, 280, 220, "center", alpha=1 - exit_q, extra_blur=exit_q * 200, sx=1 + .03 * k + exit_q * 1.6, sy=1 + .03 * k)
            for e in range(1, 4):
                if ss > .3:
                    draw_word(cv, w, CX + e * 14 * jit * (1 if e % 2 else -1), 640, "center", alpha=.18 * jit / e, blur=30)
            # outline echo above/below
            ow = self.fit(txt, "serif", 430, 1740, 400)
            draw_word(cv, ow, CX, 640 - 330, "center", alpha=.18 * (1 - exit_q), stroke=2, sy=.5)
            draw_word(cv, ow, CX, 640 + 250, "center", alpha=.18 * (1 - exit_q), stroke=2, sy=.5)
            self.mono(["01  /  YOU", "02  /  THEM", "03  /  THE ROOM"][idx], 112, 250, 26, 200, tr=12)
        else:
            a = self.fit("EVERY", "serif", 520, 1700, 400)
            b = self.fit("RIVAL.", "serif", 520, 1700, 400)
            self.slam_word(a, CX, 560, t - 46.0, .25, 240, 200, "center", sx=1 + .03 * k, sy=1 + .03 * k)
            self.slam_word(b, CX, 980, t - 46.5, .25, 240, 200, "center", sx=1 + .03 * k, sy=1 + .03 * k)
            if t >= 47.0:
                sn = self.pulse("snare", .06)
                self.fx["invert"] = float(sn > .4) * .8
                self.glitch_bands(int(sn * 4))
            if t >= 47.7:
                self.fx["zoom"] *= 1 + .8 * float(ei(prog(t, 47.7, 47.99)))
        self.hud(None, show=1.0)
        self.fx["bloom"] = .55 + .4 * k
        self.fx["streak"] = .3 + .3 * k

    def _montage_b(self, t):
        cv = self.cv
        if t < 52.0:
            idx = int((t - 48.0) // 0.5)
            t0 = 48.0 + idx * .5
        else:
            idx = 8 + min(7, int((t - 52.0) // 0.25))
            t0 = 52.0 + (idx - 8) * .25
        since = t - t0
        name, shape = DROP2[idx]
        num = self.names.index(name) + 1 if name in self.names else idx + 1
        k = self.punch(0.03, 7.0, 3.5)
        d, s = self.since("impact")
        self.draw_cloud(gain=1.2 + .4 * k, yaw=.3 * np.sin(t), pitch=.12, scale=1.0 + .03 * k)
        self._wave(t, 90, tilt=250)
        label = SHORT.get(name, name)
        left = idx % 2 == 0
        nw = self.W(f"{num:03d}", "mono", 600, 700, -12)
        draw_word(cv, nw, CX, 800, "center", alpha=.2, stroke=2)
        words = label.split(" ")
        if len(label) > 13 and len(words) > 1:
            mid = max(1, len(words) // 2)
            lines = [" ".join(words[:mid]), " ".join(words[mid:])]
        else:
            lines = [label]
        for li, ln in enumerate(lines):
            wd = self.fit(ln, "serif", 250 if len(lines) == 1 else 200, 1000, 400)
            x, al = (108, "left") if left else (1812, "right")
            self.slam_word(wd, x, 600 + li * 210 - (80 if len(lines) > 1 else 0), since - li * .02, .14 if idx >= 8 else .2, 140, 110, al)
        self.mono(f"{num:03d} / 116", 112 if left else 1808, 280, 26, 200, "left" if left else "right", tr=10)
        self.hud(f"{num:03d} / {name.upper()[:30]}", show=1.0)
        if since < .08:
            self.fx["flash"] = max(self.fx["flash"], .3 * (1 - since / .08))
            self.glitch_bands(3, seed=idx)
        if t >= 52.0:
            self.fx["ca"] = 4
        self.shock(1420 if left else 500, 540, since, 210, 1900, 2.0, .4)

    def _collapse(self, t):
        cv = self.cv
        since = t - 54.0
        k = self.punch(0.03, 6.0, 3.0)
        self.draw_cloud(gain=1.3, yaw=0.0, scale=1.0 + .03 * k)
        
        # three words on the 8th notes of bar 28
        parts = [("PLAY", 54.0), ("THE", 54.5), ("THEORY.", 55.0)]
        x = 100
        y = 620
        for txt, t0 in parts:
            wd = self.W(txt, "serif", 210, 400)
            self.slam_word(wd, x, y, t - t0, .2, 200, 150, "left")
            x += wd.width / G.u + 40
        self.hud("PLAY THE THEORY", show=1.0)
        if t >= 55.0:
            sn = self.pulse("snare", .05)
            self.fx["invert"] = float(sn > .4) * .7
            self.glitch_bands(int(sn * 4))
        if t >= 55.5:
            q = prog(t, 55.5, 55.74)
            self.fx["zoom"] *= 1 + .9 * float(ei(q))
            self.fx["fade"] = 1 - float(ei(prog(t, 55.6, 55.74)))

    # ------------------------------------------------------------ 56-60 s : RESOLVE
    def s_resolve(self):
        t, cv = self.t, self.cv
        since = t - 56.0
        d, s = self.impact_flash()
        k = self.punch(0.012, 3.0, 1.5) if t < 58 else 0.0
        self.shock(HC[0], HC[1], since, 230, 2400, 3.0, 1.1)
        self.spokes(HC[0], HC[1], since, 80, 200, .6, seed=9)
        self.draw_cloud(gain=1.1, scale=1.0)
        self.draw_dust(.8)
        # vector mark settles over the point cloud, warm champagne accent
        rv = float(eo(prog(since, .35, 1.4)))
        self.brand_mark(HC[0], HC[1], r=120, v=240, reveal=rv, rings=True, thread=True, lag=1.0, warm=True)
        self.fx["warm"] = .35 * rv
        tw = self.W("Theory", "serif", 340, 400)
        gw = self.W("Gambit", "serif", 340, 400)
        self.slam_word(tw, 100, 500, since, .5, 220, 160, "left")
        self.slam_word(gw, 100, 810, since - .1, .5, 220, 160, "left")
        a = float(eo(prog(since, 1.0, 1.6)))
        cv.line((108, 860), (108 + 560 * float(eio(prog(since, .9, 1.7))), 860), 130 * a, 1)
        self.mono("FEEL  /  SEE  /  PROVE", 112, 912, 26, 190 * a, tr=12)
        u = float(eo(prog(since, 1.8, 2.4)))
        self.mono("theorygambit.github.io", 112, 970, 30, 235 * u, tr=4)
        # call to action: hairline button with a breathing ring
        b = float(eo(prog(since, 2.2, 2.8)))
        if b > 0:
            bx, by, bw, bh = 1250 - 150, 940, 300, 72
            cv.poly([(bx, by), (bx + bw, by), (bx + bw, by + bh), (bx, by + bh)], 220 * b, 1.5, True)
            pw = self.W("PLAY NOW", "sans", 30, 400, 10)
            draw_word(cv, pw, 1250, by + 47, "center", alpha=b)
            br = (since * .9) % 1
            cv.poly([(bx - 20 * br, by - 20 * br), (bx + bw + 20 * br, by - 20 * br), (bx + bw + 20 * br, by + bh + 20 * br), (bx - 20 * br, by + bh + 20 * br)], 90 * b * (1 - br), 1.0, True)
        self.hud(None, show=.6, matrix=False)
        self.mono("hassanireza.github.io", 1920 - 112, 1080 - 86, 18, 110 * u, "right", tr=3)
        self.fx["fade"] = float(1 - eio(prog(t, 59.35, 60.0)))
        self.fx["bloom"] = .55


class Promo(ScenesB, ScenesA, Base):
    def build_schedule(self):
        ScenesA.build_schedule(self)
        self.sched_b()
        self.sched.sort(key=lambda e: e[0])

    def render(self, i, post=True):
        self.begin(i)
        t = self.t
        if t < 8.0:
            self.s_void()
        elif t < 15.75:
            self.s_build()
        elif t < 16.0:
            self.s_vacuum()
        elif t < 32.0:
            self.s_drop1()
        elif t < 39.75:
            self.s_break()
        elif t < 40.0:
            self.s_vacuum()
        elif t < 55.75:
            self.s_drop2()
        elif t < 56.0:
            self.s_vacuum()
        else:
            self.s_resolve()
        return self.post.run(self.cv, self.fx) if post else None


def main():
    ap = argparse.ArgumentParser(description="Theory Gambit promo: 60 s, 16:9, 30 fps, rendered in code.")
    ap.add_argument("--save", help="output mp4 (with music)")
    ap.add_argument("--width", type=int, default=1920)
    ap.add_argument("--audio", default=None, help="wav path (rendered if missing)")
    ap.add_argument("--stills", help="comma separated seconds -> PNGs in --out")
    ap.add_argument("--sheet", help="contact sheet png of key moments")
    ap.add_argument("--out", default=".")
    ap.add_argument("--range", default=None, help="start:end seconds")
    ap.add_argument("--crf", type=int, default=19)
    ap.add_argument("--frames", default=None, help="a:b frame range, video only segment")
    a = ap.parse_args()
    import tg_score as sc
    p = Promo(a.width, 1800, assets=c.HERE / "assets")
    if a.stills or a.sheet:
        ts = [float(x) for x in a.stills.split(",")] if a.stills else [float(x) for x in a.sheet.split(",")]
        frames = sorted(set(int(round(x * 30)) for x in ts))
        got = {}
        for i in range(0, max(frames) + 1):
            if i in frames:
                got[i] = p.render(i)
            else:
                p.render(i) if i >= max(0, min(frames)) - 0 and False else p.begin(i) and None
        # note: begin() is cheap, but scenes must run to keep state; stills only need cloud state, which begin() advances
        if a.stills:
            for i, im in got.items():
                cv2.imwrite(f"{a.out}/f_{i / 30:05.2f}.png", im[..., ::-1])
        else:
            ims = [cv2.resize(got[i], (480, 270)) for i in frames]
            cols = 4
            rows = (len(ims) + cols - 1) // cols
            sheet = np.zeros((rows * 270, cols * 480, 3), np.uint8)
            for k, im in enumerate(ims):
                sheet[(k // cols) * 270:(k // cols + 1) * 270, (k % cols) * 480:(k % cols + 1) * 480] = im
            cv2.imwrite(a.sheet if a.sheet.endswith(".png") else "sheet.png", sheet[..., ::-1])
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
    wav = a.audio or "score.wav"
    import os
    if not os.path.exists(wav):
        sc.render_audio(wav)
    out = c.FFOut(a.save, 30, a.crf, audio=wav)
    t0 = time.time()
    for i in range(1800):
        out.write(p.render(i))
        if i % 60 == 0:
            print(f"frame {i}/1800  {time.time() - t0:.0f}s", flush=True)
    out.close()


if __name__ == "__main__":
    main()
