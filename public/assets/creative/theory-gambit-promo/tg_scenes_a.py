"""Scenes A: VOID (0-8 s), BUILD (8-16 s), DROP I (16-32 s)."""
import numpy as np

import tg_core as c
import tg_score as sc
from tg_base import Base, CX, CY, HC, TAU, CHAPTERS
from tg_core import G, draw_word, eo, eo5, eio, ei, prog, lerp, clamp

OFF_HC = np.array([HC[0] - CX, HC[1] - CY, 0.0], np.float32)

DROP1 = [  # (entry name, point-cloud shape, layout)
    ("Dominant Strategy", "matrix", dict(discs=(.5, .3, 1.0, .8), show=(1, 1, 1, 1))),
    ("Prisoner's Dilemma", "matrix", dict(discs=(.9, .08, 1.0, .42), show=(1, 1, 1, 1))),
    ("Nash Equilibrium", "tris", {}),
    ("Stag Hunt", "stag", {}),
    ("Ultimatum Game", "split", {}),
    ("Chicken and Hawk-Dove", "collide", {}),
    ("Matching Pennies and Rock-Paper-Scissors", "coin", {}),
    ("Tragedy of the Commons", "commons", {}),
]


class ScenesA:
    # ------------------------------------------------------------ scheduling of cloud targets
    def build_schedule(self):
        S = self.sched

        def at(t, fn):
            S.append((t, fn))

        def mark(self, omega, stagger, scale=1.0, off=OFF_HC):
            p = self.shape("brand") * scale + off
            self.cloud.set_target(p, omega, stagger)

        at(0.0, lambda s: setattr(s.cloud, "tgt", s.cloud.pos.copy()))
        at(4.8, lambda s: (s.cloud.__setattr__("talpha", np.ones_like(s.cloud.talpha)), mark(s, 1.5, 1.1)))
        at(7.55, lambda s: s.cloud.set_target(s.shape("brand") * 0.55 + OFF_HC, 6.0, .4))
        at(8.0, lambda s: s.cloud.set_target(s.shape("rings"), 5.0, .5))
        at(15.45, lambda s: s.cloud.set_target(np.zeros((s.N, 3), np.float32) + s.cloud.rng.standard_normal((s.N, 3)).astype(np.float32) * 6, 9.0, .3))
        at(15.74, lambda s: s.cloud.__setattr__("talpha", np.zeros_like(s.cloud.talpha)))
        at(15.99, lambda s: (s.cloud.__setattr__("alpha", np.ones_like(s.cloud.alpha)), s.cloud.__setattr__("talpha", np.ones_like(s.cloud.talpha)),
                             s.cloud.explode(2100.0, spin=300.0), s.cloud.set_target(s.shape("brand") * 1.35 + np.array([330, 0, 0], np.float32), 3.2, .9)))
        at(18.0, lambda s: s.cloud.set_target(s.shape("rings"), 4.0, .5))
        # montage A: one shape per beat
        for k, (name, shape, kw) in enumerate(DROP1):
            def f(s, shape=shape, kw=kw, k=k):
                p = s.shape(shape, **kw) if shape == "matrix" else s.shape(shape)
                off = np.array([-330.0 if k % 2 else 330.0, 0, 0], np.float32)
                if k % 4 == 3:
                    off = np.array([0, 0, 0], np.float32)
                s.cloud.set_target(p * (0.72 if shape != "matrix" else 1.0) + off * 0.8, 14.0, .7)
            at(20.0 + k * 0.5, f)
        at(24.0, lambda s: s.cloud.set_target(s.shape("rings"), 3.0, .4))
        for k in range(10):
            def g(s, k=k):
                w = s.W(CHAPTERS[k][0], "serif", 640, 400)
                s.cloud.set_target(c.word_points(w, s.N, np.random.default_rng(k + 5), 1.0, (0, -60)) if False else s._numeral_pts(k), 16.0, .8)
            at(28.0 + k * 0.4, g)

    def _numeral_pts(self, k):
        key = ("num", k)
        if key not in self.shapes:
            w = self.W(CHAPTERS[k][0], "serif", 640, 400)
            p = c.word_points(w, self.N, np.random.default_rng(k + 5), 1.0, (0, 130))
            self.shapes[key] = np.concatenate([p, np.zeros((self.N, 1), np.float32)], 1)
        return self.shapes[key].copy()

    # ------------------------------------------------------------ helpers
    def rise(self, word, x, y, t0, t, stagger=0.05, dur=0.9, dist=70, align="left", v=1.0, extra_a=1.0):
        n = word.n
        i = np.arange(n)
        p = np.clip((t - t0 - i * stagger) / dur, 0, 1)
        a = eo(p) * v * extra_a
        dy = (1 - eo(p)) * dist
        draw_word(self.cv, word, x, y, align, a=a, dy=dy)

    def slam_word(self, word, x, y, since, dur=0.36, tr0=240.0, blur0=150.0, align="left", alpha=1.0, extra_blur=0.0, sx=1.0, sy=1.0, dx=0.0, stroke=0, layer="L"):
        p = prog(since, 0, dur)
        e = eo5(p)
        tr = lerp(tr0, 0.0, e)
        blur = lerp(blur0, 0.0, e) + extra_blur
        a = alpha * float(np.clip(p * 5, 0, 1))
        # keep the word visually centred / anchored while tracking collapses
        draw_word(self.cv, word, x + dx, y, align, alpha=a, tr=tr, blur=blur, sx=sx, sy=sy, stroke=stroke, layer=layer)

    # ------------------------------------------------------------ 0-8 s : VOID
    def s_void(self):
        t, cv = self.t, self.cv
        self.fx["fade"] = float(eo(prog(t, 0.0, 1.4)))
        heart = self.kick(0.22, heart=True)
        self.draw_dust(0.8)
        # horizon hairline growing from the heart
        p = eio(prog(t, 0.5, 2.6))
        cv.line((HC[0] - 1250 * p, HC[1]), (HC[0] + 1250 * p, HC[1]), 34, 1)
        # the first point
        cv.disc(HC, 3.0 + 4.0 * heart, 255)
        cv.ring(HC, 16 + 90 * heart, 120 * heart, 1.2)
        cv.ring(HC, 16 + 190 * heart, 60 * heart, 1.0)
        # opened rings, one per bell
        R = [132, 184, 238, 296, 360]
        for k in range(5):
            tk = 1.0 + .5 * k
            rev = float(eo5(prog(t, tk, tk + 1.1)))
            if rev <= 0:
                continue
            ping = float(np.exp(-(t - tk) / .45)) if t > tk else 0.0
            a0 = (k * 71 + t * (9 + 3 * k) * (1 if k % 2 == 0 else -1)) % 360
            sweep = (330 - 14 * k) * rev
            v = (215 - 24 * k) + 70 * ping
            cv.ring(HC, R[k] * (1 + .02 * heart * (k + 1) / 5), v, 2.3 - .25 * k, a0, a0 + sweep)
        # triangle + silk echoes + thread
        rv = float(eo(prog(t, 3.4, 4.8)))
        if rv > 0:
            self.brand_mark(HC[0], HC[1], r=104, v=235, reveal=rv, rings=False, thread=True, lag=1.0)
        # title lines
        a = self.W("Every choice", "serif", 168, 400)
        b = self.W("is a game.", "serif", 168, 400)
        out = float(ei(prog(t, 7.05, 7.55)))
        if out < 1:
            for wd, y, t0 in ((a, 468, 3.0), (b, 646, 4.0)):
                if out > 0:
                    draw_word(cv, wd, 108, y, alpha=1 - out, blur=out * 260, sx=1 + out * 1.8)
                else:
                    self.rise(wd, 108, y, t0, t, 0.055, 1.0, 80, extra_a=1.0)
        tag = self.W("FEEL  /  SEE  /  PROVE", "mono", 24, 400, 10)
        if t > 5.0 and out < 1:
            ta = float(eo(prog(t, 5.0, 5.8))) * (1 - out)
            draw_word(cv, tag, 112, 780, alpha=ta * .62)
            cv.line((112, 748), (112 + 520 * eio(prog(t, 5.0, 6.0)), 686), 120 * ta, 1)
        # countdown ticks (tension) 6.0-8.0
        tn = prog(t, 6.2, 7.9)
        if tn > 0:
            rr = 470
            for j in range(48):
                ang = j / 48 * TAU
                s = j / 48 <= tn
                l = 14 if j % 4 else 28
                x0, y0 = HC[0] + np.cos(ang) * rr, HC[1] + np.sin(ang) * rr
                x1, y1 = HC[0] + np.cos(ang) * (rr + l), HC[1] + np.sin(ang) * (rr + l)
                cv.line((x0, y0), (x1, y1), 200 if s else 40, 1)
            self.fx["ca"] = 2.2 * tn
        self.draw_cloud(gain=.6 * float(eo(prog(t, 4.8, 6.0))))
        self.hud("001 / DOMINANT STRATEGY", show=float(eo(prog(t, 1.2, 2.4))) * (1 - out * .0))
        if t > 7.75:
            self.fx["flash"] = float(eo(prog(t, 7.8, 7.98))) * .45
        self.fx["bloom"] = .5 + .3 * heart

    # ------------------------------------------------------------ 8-16 s : BUILD
    FSP = [(8.0, "FEEL", "01  /  FEEL", "Play first."), (10.0, "SEE", "02  /  SEE", "See the structure."),
           (12.0, "PROVE", "03  /  PROVE", "Prove it on new numbers.")]

    def s_build(self):
        t, cv = self.t, self.cv
        k = self.punch(0.018, 3.0, 1.2)
        kk = self.kick(0.2)
        # ring tunnel breathing behind
        self.draw_cloud(gain=.55 + .35 * kk, yaw=t * .35, pitch=.18 * np.sin(t * .6), scale=1.0 + .06 * kk, cam_z=-300 + 160 * np.sin(t * .5))
        self.draw_dust(.7)
        self.hud(None, show=1.0)
        if t < 14.0:
            idx = int((t - 8.0) // 2)
            t0, word, label, tagline = self.FSP[idx]
            since = t - t0
            wd = self.W(word, "serif", 400 if word != "PROVE" else 330, 400)
            exit_q = prog(t, t0 + 1.72, t0 + 2.0)
            dxo = -float(ei(exit_q)) * 520
            slam = self.W(word, "serif", 400 if word != "PROVE" else 330, 400)
            self.slam_word(slam, 108, 610, since, 0.36, 240, 150, "left", alpha=1 - exit_q, extra_blur=exit_q * 110, sx=1 + .02 * kk, sy=1 + .02 * kk, dx=dxo)
            # mono label + tagline
            self.mono(label, 112, 318, 26, 190 * float(eo(prog(since, .15, .55))) * (1 - exit_q), tr=10)
            cv.line((112, 340), (112 + 640 * float(eio(prog(since, .1, .8))), 340), 90 * (1 - exit_q), 1)
            tw = self.W(tagline, "serif", 70, 300)
            self.rise(tw, 112, 716, t0 + .45, t, .02, .55, 36, extra_a=(1 - exit_q))
            self._build_matrix(t, idx, t0, exit_q)
        else:
            self._your_move(t)
        # beat ticks: hairline frame flashes on kicks
        if t < 14.0:
            cv.ring((1390, 540), 360 + 40 * kk, 70 * kk, 1.0)
        d, s = self.impact_flash()
        if d < .2 and t < 14:
            self.fx["flash"] *= .35
        self.fx["streak"] = .22 + .2 * kk

    def _build_matrix(self, t, idx, t0, exit_q):
        cx, cy, cell = 1390, 560, 215
        grow = [0, 0, 0, 0]
        arrows, hl_row, hl = 0.0, None, 0.0
        discs = (.5, .3, 1.0, .8)
        if idx == 0:
            for j in range(4):
                grow[j] = prog(t, t0 + .5 * j, t0 + .5 * j + .3)
        elif idx == 1:
            grow = [1, 1, 1, 1]
            arrows = prog(t, t0 + .5, t0 + 1.0)
            if t > t0 + 1.0:
                a2 = prog(t, t0 + 1.0, t0 + 1.5)
                arrows = 1.0
            hl_row = None
        else:
            discs = (.8, .2, 1.0, .5)
            grow = [1, 1, 1, 1]
            hl_row = 1 if t > t0 + .5 else None
            hl = float(eo(prog(t, t0 + .5, t0 + .9)))
        a = 1 - exit_q
        cen = self.fig_matrix(cx, cy, cell, discs, [g * 1.0 for g in grow], rings=True, arrows=arrows, hl_row=hl_row, hl=hl, v=235 * a)
        if idx == 1 and t > t0 + 1.0:
            self.mono("SAME ROW WINS BOTH TIMES", cx - 215, cy + 2 * 215 + 56, 20, 170 * float(eo(prog(t, t0 + 1.0, t0 + 1.3))) * a, tr=5)
        if idx == 2:
            # a check mark closes a ring around the winning row
            q = float(eo(prog(t, t0 + 1.0, t0 + 1.45)))
            if q > 0:
                cy2 = cy + cell / 2
                cv = self.cv
                cv.ring((cx, cy2), cell * 1.26, 230 * a, 2.0, -90, -90 + 360 * q)
                p0 = (cx - 60, cy2 + 4)
                p1 = (cx - 14, cy2 + 48)
                p2 = (cx + 80, cy2 - 52)
                m = float(eo(prog(t, t0 + 1.3, t0 + 1.6)))
                if m > 0:
                    cv.poly([p0, (lerp(p0[0], p1[0], min(1, m * 2)), lerp(p0[1], p1[1], min(1, m * 2)))] if m < .5 else
                            [p0, p1, (lerp(p1[0], p2[0], (m - .5) * 2), lerp(p1[1], p2[1], (m - .5) * 2))], 255 * a, 3.0)
            if t > t0 + 1.3:
                self.mono("PROVEN", cx - 56, cy + 2 * 215 + 56, 22, 200 * float(eo(prog(t, t0 + 1.3, t0 + 1.6))) * a, tr=10)
            if 1.3 < t - t0 < 1.36:
                self.cloud.kick(120.0)

    def _your_move(self, t):
        cv = self.cv
        since = t - 14.0
        snares = self.pulse("snare", .06)
        # ring tunnel rushing toward the camera, accelerating (snare roll)
        sp = (since / 2.0) ** 2
        for j in range(14):
            ph = (j / 14.0 + sp * 3.0) % 1.0
            r = 60 + 1500 * ph ** 2.2
            cv.ring((CX, CY), r, 220 * ph ** .8, 1.2 + 3 * ph)
        a = self.W("YOUR", "serif", 420, 400)
        b = self.W("MOVE.", "serif", 420, 400)
        self.slam_word(a, CX, 540, t - 14.0, .34, 260, 160, "center")
        self.slam_word(b, CX, 940, t - 14.5, .34, 260, 160, "center")
        if t > 15.0:
            n = int(prog(t, 15.0, 15.75) * 6)
            self.fx["invert"] = float(snares > .3) * min(1.0, since / 2.0)
        self.fx["ca"] = 1.5 + 5 * (since / 2) ** 2
        if t > 15.5:
            q = prog(t, 15.5, 15.75)
            self.fx["zoom"] = 1 + .9 * float(ei(q))
            self.fx["fade"] = 1 - float(ei(prog(t, 15.62, 15.75)))
        self.glitch_bands(int(snares * 4))
        self.fx["shake"] = (float(self.frng.standard_normal()) * 5 * since, float(self.frng.standard_normal()) * 5 * since)

    # ------------------------------------------------------------ 15.75-16 s : vacuum
    def s_vacuum(self):
        t = self.t
        # one heartbeat point, a hairline, nothing else: the held breath before the drop
        q = prog(t, 15.75, 16.0)
        self.cv.disc((CX, CY), 2.5 + 3 * q, 255)
        self.cv.line((CX - 900 * q, CY), (CX + 900 * q, CY), 120 * q, 1)
        self.fx["bloom"] = .6
        self.draw_cloud(gain=.3 * float(q > .8), scale=1 - .0)

    # ------------------------------------------------------------ 16-32 s : DROP I
    def s_drop1(self):
        t = self.t
        if t < 18.0:
            self._title(t)
        elif t < 20.0:
            self._marquee(t)
        elif t < 24.0:
            self._montage_a(t)
        elif t < 28.0:
            self._warp(t)
        else:
            self._chapters(t)

    def _title(self, t):
        cv = self.cv
        d, s = self.impact_flash()
        k = self.punch(0.03, 7.0, 2.5)
        since = t - 16.0
        self.shock(HC[0], HC[1], since, 235, 2900, 3.0, .85)
        self.spokes(HC[0], HC[1], since, 90, 210, .55)
        self.draw_cloud(gain=1.15, yaw=0.0, pitch=0.0, scale=1.0 + .03 * k)
        self.draw_dust(.9)
        tw = self.W("Theory", "serif", 372, 400)
        gw = self.W("Gambit", "serif", 372, 400)
        self.slam_word(tw, 100, 520, since, .42, 300, 200, "left", sx=1 + .018 * k, sy=1 + .018 * k)
        self.slam_word(gw, 100, 850, since - .1, .42, 300, 200, "left", sx=1 + .018 * k, sy=1 + .018 * k)
        a = float(eo(prog(since, .7, 1.1)))
        cv.line((108, 905), (108 + 840 * float(eio(prog(since, .6, 1.4))), 905), 120 * a, 1)
        self.mono("FEEL  /  SEE  /  PROVE", 112, 964, 26, 170 * a, tr=12)
        self.hud("001 / DOMINANT STRATEGY", show=a, matrix=True)
        self.fx["bloom"] = .5 + .5 * k
        # ghost-slice on the beat
        if self.since("kick", ["drop"])[0] < .07:
            self.glitch_bands(2, seed=4)

    def _marquee(self, t):
        cv = self.cv
        since = t - 18.0
        k = self.punch(0.02, 5.0, 3.0)
        self.draw_cloud(gain=.5 + .4 * k, yaw=t * .5, pitch=.2, scale=1.0, cam_z=-200)
        rows = [("THEORY GAMBIT", 1, 1500, True), ("THEORY GAMBIT", -1, 2300, False), ("FEEL SEE PROVE", 1, 3100, True),
                ("THEORY GAMBIT", -1, 1900, False), ("FEEL SEE PROVE", 1, 2700, True), ("THEORY GAMBIT", -1, 3500, False), ("THEORY GAMBIT", 1, 2100, True)]
        base_y = 140
        for r, (txt, dir_, speed, outline) in enumerate(rows):
            y = base_y + r * 128
            if r == 3:
                continue
            w = self.W(txt + "   /   ", "serifup", 132, 500, 6) if r % 2 == 0 else self.W(txt + "   /   ", "sans", 118, 300, 14, True)
            period = w.width / G.u
            appear = float(eo5(prog(since, r * .035, r * .035 + .22)))
            xoff = (since * speed * dir_ + 1300 * (1 - appear) * dir_ * -1) % period
            blur = 90 * (1 - appear) + speed / 70.0
            buf, ox, oy = w.full()
            if blur > 3:
                buf = c.mblur(buf, blur)
            for rep in range(-1, int(1920 // period) + 3):
                xx = (rep * period - xoff) * G.u + ox
                if outline:
                    pass
                c.blit(cv.L, buf, xx, y * G.u + oy, 0.95 if not outline else .55)
        # clear central hero line over the ribbons
        cv.rect(0, 520 + 12, 1920, 520 + 12 + 1, 0)
        hero = self.W("Theory Gambit", "serif", 250, 400)
        hy = 600 + 0
        cv.rect(300, hy - 190, 1620, hy + 70, 0)
        self.slam_word(hero, CX, hy, since + .1 if since < 0.2 else .6, .3, 120, 80, "center", sx=1 + .02 * k, sy=1 + .02 * k)
        self.hud(None, show=1.0)
        self.fx["streak"] = .3 + .3 * k
        if since < .2:
            self.fx["flash"] = .2 * (1 - since / .2)

    def _montage_a(self, t):
        cv = self.cv
        idx = int((t - 20.0) // 0.5)
        idx = min(idx, 7)
        since = t - (20.0 + idx * 0.5)
        name, shape, kw = DROP1[idx]
        num = self.names.index(name) + 1 if name in self.names else idx + 1
        k = self.punch(0.026, 6.0, 3.0)
        left = (idx % 2 == 0)
        center = (idx % 4 == 3)
        cx_shape = HC[0] + 80 if left else 560
        self.draw_cloud(gain=1.1 + .4 * k, yaw=0.25 * np.sin(t * .8), pitch=0.0, scale=1.0 + .02 * k, cx=CX)
        # giant outlined index numeral behind
        nw = self.W(f"{num:03d}", "mono", 520, 700, -10)
        draw_word(cv, nw, 960, 760, "center", alpha=.26, stroke=2, tr=0)
        # name, split on two lines if long
        words = name.split(" ")
        if len(name) > 14:
            mid = len(words) // 2 if len(words) > 2 else 1
            lines = [" ".join(words[:mid]), " ".join(words[mid:])]
        else:
            lines = [name]
        size_max = 230 if len(lines) == 1 else 190
        y0 = 560 if len(lines) == 1 else 470
        for li, ln in enumerate(lines):
            wd = self.fit(ln, "serif", size_max, 900 if not center else 1500, 400)
            x = 108 if left else 1920 - 108
            al = "left" if left else "right"
            if center:
                x, al = CX, "center"
            self.slam_word(wd, x, y0 + li * 200, since - li * .03, .2, 150, 120, al)
        label = f"{num:03d} / 116"
        self.mono(label, 112 if left else 1920 - 112, 300 if len(lines) == 1 else 250, 26, 200 * float(eo(prog(since, .05, .2))), "left" if left else "right", tr=10)
        self.mono(["FEEL IT", "SEE IT", "PROVE IT"][idx % 3], 112 if left else 1920 - 112, y0 + 60 + 200 * (len(lines) - 1) + 64, 22, 140, "left" if left else "right", tr=10)
        self.hud(f"{num:03d} / {name.upper()[:34]}", show=1.0)
        # per-beat cut feel: flash + slices on the first 3 frames
        if since < .1:
            self.fx["flash"] = max(self.fx["flash"], .32 * (1 - since / .1))
            self.glitch_bands(3, seed=idx)
        # shock ring from shape centre
        self.shock(HC[0] if left else 560, 540, since, 210, 1900, 2.0, .45)
        # last beat: 1/8 fill
        if t >= 23.5:
            self.fx["ca"] = 3.5

    def _warp(self, t):
        cv = self.cv
        since = t - 24.0
        k = self.punch(0.024, 6.0, 3.0)
        # tunnel flight: rings stream toward camera
        speed = 1.2 + .3 * np.sin(since * 1.7)
        for j in range(22):
            ph = (j / 22.0 + since * speed * .45) % 1.0
            r = 40 + 1900 * ph ** 2.4
            cv.ring((CX, CY), r, 235 * (1 - ph * .5) * min(1, ph * 6), 1.2 + 3.2 * ph)
        self.draw_cloud(gain=.9 + .4 * k, yaw=since * .6, roll=since * .25, pitch=.1, scale=1.0 + .03 * k, cam_z=-600 + 500 * np.sin(since * .8))
        # words flying through the camera at beat times
        names = ["FEEL IT.", "SEE IT.", "PROVE IT."]
        for j in range(8):
            tj = 24.0 + j * 0.5
            if j >= 6:
                pass
            q = (t - tj) / 0.5
            if q < 0 or q > 1.4:
                continue
            word = ["FEEL IT.", "SEE IT.", "PROVE IT.", "PLAY IT.", "FEEL IT.", "SEE IT.", "PROVE IT.", "WIN IT."][j]
            wd = self.W(word, "serif", 300, 400)
            z = float(ei(prog(q, 0, 1.4)))
            s = .18 + 4.2 * z ** 1.6
            a = float(np.clip(q * 6, 0, 1)) * float(1 - np.clip((q - .8) / .6, 0, 1))
            off = ((j * 53) % 7 - 3) * 40 * z
            draw_word(cv, wd, CX + off * 5, CY + 90 + (j % 3 - 1) * 60 * z, "center", alpha=a, sx=s, sy=s, blur=40 * z ** 2 + 10, rot=((j % 3) - 1) * 3 * z)
        # ribbons in bar 14
        if t >= 26.0:
            q = prog(t, 26.0, 26.4)
            for r in range(5):
                y = 220 + r * 150
                w = self.W("THEORY GAMBIT  ·  PLAY  ·  ", "sans", 74, 300, 22, True)
                period = w.width / G.u
                dir_ = 1 if r % 2 == 0 else -1
                xoff = ((t - 26.0) * 2200 * dir_ * (1 + .3 * r)) % period
                buf, ox, oy = w.full()
                buf = c.mblur(buf, 60 + 20 * r)
                for rep in range(-1, int(1920 // period) + 3):
                    c.blit(cv.L, buf, (rep * period - xoff) * G.u + ox, y * G.u + oy, .5 * q)
        self.hud(None, show=1.0)
        self.fx["streak"] = .35
        if since < .15:
            self.fx["flash"] = max(self.fx["flash"], .5 * (1 - since / .15))

    def _chapters(self, t):
        cv = self.cv
        since = t - 28.0
        k = self.punch(0.022, 5.0, 3.0)
        if since < 4.0:
            slot = min(9, int(since // 0.4))
            ss = since - slot * 0.4
            if t >= 30.0 and False:
                pass
            num, title = CHAPTERS[slot]
            self.draw_cloud(gain=1.15 + .3 * k, yaw=0.0, scale=1.0 + .02 * k, cam_z=0.0)
            nw = self.W(num, "serif", 640, 400)
            # outlined numeral huge behind, filled slam in front
            draw_word(cv, nw, CX, 800, "center", alpha=.25, stroke=2)
            tw = self.fit(title, "serif", 150, 1500, 300)
            self.slam_word(tw, CX, 940, ss, .16, 100, 80, "center")
            self.mono(f"CHAPTER {num}", CX, 140, 26, 190, "center", tr=14)
            cv.line((CX - 200, 168), (CX + 200, 168), 90, 1)
            # chapter progress ticks
            for j in range(10):
                x = CX - 270 + j * 60
                cv.rect(x, 1000 + 40, x + 36, 1000 + 42, 230 if j <= slot else 50)
            if ss < .06:
                self.fx["flash"] = max(self.fx["flash"], .25)
                self.glitch_bands(2, seed=slot)
            self.fx["ca"] = 2.5
        self.hud("116 THEORIES  /  10 CHAPTERS", show=1.0)
        if t >= 31.4:
            q = prog(t, 31.4, 31.98)
            self.fx["invert"] = float(self.pulse("snare", .05) > .3)
            self.fx["zoom"] *= 1 + .5 * float(ei(q))
        if t >= 31.75:
            self.fx["fade"] = 1 - float(prog(t, 31.8, 31.99))
