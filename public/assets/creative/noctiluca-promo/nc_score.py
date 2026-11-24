"""NOCTILUCA promo - the score.

Rave action meets Hollywood: 150 BPM, C minor. 30 fps gives 12 frames per beat and 3 per 16th, so every
hit, key click and acid note lands on a whole frame. 82.5 beats = exactly 33.000 s.

    beats 0-8     COLD OPEN  typed `print("hello")` (one key click per character), riser, snare roll, a breath of silence
    beat 8        DROP I     distorted kick, rumble bass, acid 303, hoover stabs, braam: the lit cell ignites
    beats 8-40    FEATURES   four-on-the-floor, 16th hats, supersaw, rave siren, fills every 8 beats
    beats 40-56   BREAKDOWN  kick out, choir + strings-like pads + bells, riser, 1/8 -> 1/32 roll, vacuum
    beats 56-75   DROP II    everything, double-time hats, hoover lead, crashes every bar
    beats 75-82.5 RESOLVE    C-major impact, bells state the motif, long tail

The renderer reads the same `build_events()`; picture and sound share one clock.
"""
import numpy as np
from scipy.io import wavfile
from scipy.signal import lfilter

from nc_dsp import (SR, TAU, mtof, lp, hp, bp, sat, place, blsaw, reverb_ir, reverb, v_bell, v_riser, v_whoosh, v_impact,
                    v_downlift, v_reverse_crash, v_snare, v_clap, v_hat, v_sub)

BPM = 150
BEAT = 60.0 / BPM          # 0.4 s
DUR = 33.0
FPS = 30


def bt(b):
    return b * BEAT


# C minor: i  VI  VII  v   (bass midi, triad midi)
CM, AB, BBM, GM = (36, [60, 63, 67]), (37, [61, 65, 68]), (34, [58, 62, 65]), (31, [55, 59, 62])
CMAJ = (36, [60, 64, 67])
CH = [CM, AB, BBM, GM]
ACID = [0, 0, 12, 0, 3, 0, 12, 7, 0, 0, 12, 0, 10, 0, 5, 7]
ACC = [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1]
CODE = 'print("hello")'


def chord_at(b):
    return CH[int(b // 4) % 4]


def build_events():
    ev = {k: [] for k in ("kick", "clap", "snare", "hat", "ohat", "acid", "hoover", "chord", "braam", "taiko", "choir", "riser", "vacuum",
                          "whoosh", "impact", "crash", "key", "bell", "siren", "word", "downlift", "rumble", "tick", "psybass", "arp", "blip", "zap", "swell")}

    def add(k, b, s=1.0, x=None):
        ev[k].append((float(bt(b)), float(s), x))

    # ---------------- COLD OPEN (0-8): typing, riser, snare roll
    for i, ch in enumerate(CODE):
        add("key", 1.0 + i * .25, .8 + .2 * (i % 2), ch)
    add("key", 5.0, 1.0, "enter")
    add("choir", 0.0, .8, 0)
    add("kick", 0.0, .5, "heart")
    add("kick", 2.0, .5, "heart")
    add("kick", 4.0, .6, "heart")
    add("kick", 6.0, .7, "heart")
    add("riser", 3.0, 1.0, 4.5 * BEAT)
    add("whoosh", 7.0, .9)
    roll = [5.0 + i * .5 for i in range(2)] + [6.0 + i * .25 for i in range(4)] + [7.0 + i * .125 for i in range(4)]
    for i, r in enumerate(roll):
        add("snare", r, .35 + .65 * i / (len(roll) - 1), "roll")
    add("vacuum", 7.5, 1.0, .5 * BEAT)
    add("word", 0.0, 1.0, "boot")
    rb = np.random.default_rng(12)
    for q in range(14):
        add("blip", 1.5 + q * .45 + rb.random() * .2, .5 + .3 * rb.random(), 84 + int(rb.random() * 14))
    add("swell", 4.0, .8, 3.5 * BEAT)

    # ---------------- DROP I (8-40) and DROP II (56-75): shared groove generator
    SCALE = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16, 17, 19]          # C phrygian dominant, two octaves
    PAT = [0, 2, 4, 6, 7, 6, 4, 2, 1, 3, 5, 7, 8, 7, 5, 3]

    def groove(b0, b1, level, double=False):
        b = b0
        while b < b1 - 1e-6:
            add("kick", b, 1.0, "hard")
            add("ohat", b + .5, .8)
            if int(b) % 2 == 1:
                add("clap", b, 1.0)
            for q in (1, 2, 3):                      # the rolling psy bass: three notes between kicks
                add("psybass", b + q * .25, 1.0 if q == 1 else .8, chord_at(b)[0] + (12 if q == 3 and int(b) % 4 == 3 else 0))
            for q in range(4):
                if double or q % 2 == 1:
                    add("hat", b + q * .25, .35 if q % 2 else .25)
            b += 1.0
        bar = b0
        while bar < b1 - 1e-6:
            ch = chord_at(bar)
            for st in range(16):
                if bar + st * .25 >= b1:
                    break
                add("arp", bar + st * .25, 1.0 if st % 4 == 0 else .65, 60 + SCALE[PAT[(st + int(bar // 4) * 3) % 16] % 12] + (0 if int(bar // 8) % 2 == 0 else 0))
            if level >= 2:
                add("chord", bar, 1.0, ch)
                add("hoover", bar, .8, (bar, ch))
                add("hoover", bar + 1.5, .7, (bar + 1.5, ch))
            add("crash", bar, .5 if bar > b0 else 1.0)
            bar += 4.0

    add("impact", 8, 1.0, "drop")
    add("braam", 8, 1.0, 36)
    add("taiko", 8, 1.0)
    add("crash", 8, 1.0)
    add("whoosh", 8, 1.0)
    groove(8, 40, 1)
    groove(24, 40, 2)
    for r0 in (15, 23, 31, 39):             # fills before the section turns
        for i in range(8):
            add("snare", r0 + i * .125, .4 + .08 * i, "fill")
    for b in (16, 24, 32):
        add("braam", b, .6, 31 if b != 24 else 32)
        add("taiko", b, .8)
        add("impact", b, .55, "small")
        add("siren", b, .5, 0)
    for b in (31.0, 39.0, 63.0, 71.0):
        add("zap", b, .8)
        add("zap", b + .5, .7)
    add("riser", 24, .8, 4 * BEAT)
    add("riser", 36, 1.0, 4 * BEAT)
    for b, nm in ((10, "PYTHON"), (11, "AT THE"), (12, "RIGHT"), (13, "DEPTH.")):
        add("word", b, 1.0, nm)
    for i, b in enumerate((24, 26, 28, 30, 32, 34, 36, 38)):
        add("word", b, 1.0, f"feat{i}")

    # ---------------- BREAKDOWN (40-56)
    add("downlift", 40, 1.0, 2 * BEAT)
    add("impact", 40, .8, "soft")
    for q in range(22):
        add("blip", 40.3 + q * .66 + rb.random() * .25, .45 + .3 * rb.random(), 76 + int(rb.random() * 18))
    add("swell", 46.0, 1.0, 9.5 * BEAT)
    for q in range(0, 32):
        add("arp", 48 + q * .25, .35 + .02 * q, 72 + SCALE[PAT[q % 16] % 12])
    for b in range(40, 56, 4):
        add("choir", b, 1.0, b)
        add("kick", b, .4, "heart")
        add("kick", b + 2, .3, "heart")
    for q in range(0, 32):
        add("bell", 40 + q * .5, .5 + .1 * (q % 2), 72 + [0, 3, 7, 10, 12, 15, 19, 22][q % 8] + (12 if (q // 8) % 2 else 0))
    for q in range(0, 64):
        add("tick", 40 + q * .25, .25 + .2 * q / 64)
    add("riser", 48, 1.0, 8 * BEAT)
    roll = [52 + i * .5 for i in range(4)] + [54 + i * .25 for i in range(8)] + [55 + i * .125 for i in range(4)]
    for i, r in enumerate(roll):
        add("snare", r, .3 + .7 * i / (len(roll) - 1), "roll")
    for b in (48, 50, 52, 54):
        add("taiko", b, .6 + .06 * (b - 48))
    add("whoosh", 55.0, 1.0)
    add("vacuum", 55.5, 1.0, .5 * BEAT)
    for i, b in enumerate((40, 44, 48, 52)):
        add("word", b, 1.0, f"trk{i}")
    add("word", 50, 1.0, "count")

    # ---------------- DROP II (56-75)
    add("impact", 56, 1.0, "drop2")
    add("braam", 56, 1.0, 36)
    add("braam", 56, .8, 48)
    add("taiko", 56, 1.0)
    add("crash", 56, 1.0)
    add("whoosh", 56, 1.0)
    groove(56, 75, 2, True)
    add("siren", 56, 1.0, 0)
    for b in (64, 72):
        add("braam", b, .7, 31)
        add("taiko", b, .9)
        add("impact", b, .6, "small")
        add("siren", b, .7, 0)
    for r0 in (63, 71):
        for i in range(8):
            add("snare", r0 + i * .125, .45 + .07 * i, "fill")
    add("riser", 68, .9, 4 * BEAT)
    for b, nm in ((56, "WRITE."), (57, "DEBUG."), (58, "TRACE."), (60, "29"), (62, "146"), (64, "157"), (68, "LEVEL"), (72, "GT")):
        add("word", b, 1.0, nm)

    # ---------------- RESOLVE (75-82.5)
    add("impact", 75, 1.0, "final")
    add("braam", 75, 1.0, 36)
    add("braam", 75, .8, 48)
    add("taiko", 75, 1.0)
    add("crash", 75, 1.0)
    add("choir", 75, 1.0, "res")
    add("downlift", 75, 1.0, 2 * BEAT)
    add("kick", 75, 1.0, "hard")
    add("kick", 76.5, .8, "hard")
    for b, m, s in ((76, 72, .9), (77, 79, .8), (78, 76, .8), (79, 84, .9), (80, 88, .8), (81, 91, .7)):
        add("bell", b, s, m)
    add("word", 75, 1.0, "CTA")
    for k in ev:
        ev[k].sort(key=lambda e: e[0])
    return ev


# ------------------------------------------------------------------ voices
def reso_lp(x, fc, q=4.0, chunk=32):
    """resonant low-pass (RBJ biquad) with a per-sample cutoff curve, run in short blocks."""
    y = np.zeros_like(x)
    zi = np.zeros(2)
    for i in range(0, len(x), chunk):
        f = float(np.clip(fc[min(i + chunk // 2, len(fc) - 1)], 40, SR * .45))
        w0 = TAU * f / SR
        a = np.sin(w0) / (2 * q)
        cw = np.cos(w0)
        b0, b1, b2 = (1 - cw) / 2, 1 - cw, (1 - cw) / 2
        a0, a1, a2 = 1 + a, -2 * cw, 1 - a
        y[i:i + chunk], zi = lfilter([b0 / a0, b1 / a0, b2 / a0], [1, a1 / a0, a2 / a0], x[i:i + chunk], zi=zi)
    return y


def nsaw(f, n, det=0.0, phase0=0.0):
    ph = np.cumsum(np.full(n, f * (2 ** (det / 12)) / SR)) + phase0
    return 2 * (ph % 1.0) - 1


def v_hardkick(s=1.0):
    n = int(.34 * SR)
    t = np.arange(n) / SR
    f = 46 + 260 * np.exp(-t / .016)
    body = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / .16)
    tail = np.sin(TAU * 47 * t) * np.exp(-t / .22) * .5
    rng = np.random.default_rng(9)
    click = hp(rng.standard_normal(n), 2500) * np.exp(-t / .004) * .35
    x = np.tanh((body * 1.5 + tail) * 3.2) * .95 + click
    return x * s


def v_acid(midi, s=1.0, dur=.16, accent=True):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(midi)
    x = nsaw(f, n) * .6 + np.sign(np.sin(TAU * f * t)) * .25
    env = np.minimum(1, t / .003) * np.exp(-t / (dur * .8)) * np.minimum(1, (dur - t) / .01)
    fc = 280 + (2600 if accent else 1200) * np.exp(-t / .05) * s + 1800 * t / dur * (1 if accent else .3)
    y = reso_lp(x, fc, 9.0 if accent else 5.0)
    return np.tanh(y * 3.0) * env * .45 * s


def v_hoover(midi, s=1.0, dur=.34):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f0 = mtof(midi)
    bend = 2 ** ((3.0 * np.exp(-t / .05)) / 12)
    x = np.zeros(n)
    for det in (-.3, -.15, 0, .15, .3, .45, -.45):
        ph = np.cumsum(f0 * bend * 2 ** (det / 12) / SR)
        x += 2 * (ph % 1) - 1
    env = np.minimum(1, t / .004) * np.exp(-t / (dur * .55)) * np.minimum(1, (dur - t) / .02)
    fc = 700 + 4500 * np.exp(-t / .08)
    y = reso_lp(x / 5, fc, 2.2)
    return np.tanh(y * 2.2) * env * .38 * s


def v_chord(chord, s=1.0, dur=1.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for m in chord[1] + [chord[1][0] + 12]:
        for det in (-.2, 0, .2):
            x += nsaw(mtof(m + 12), n, det)
    env = np.minimum(1, t / .01) * np.exp(-t / .5) * np.minimum(1, (dur - t) / .05)
    return lp(x / 8, 5200, 2) * env * .3 * s


def v_rumble(midi, s=1.0, dur=.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(midi)
    x = np.sin(TAU * f * t) + .5 * nsaw(f, n)
    env = np.minimum(1, t / .004) * np.exp(-t / (dur * .6)) * np.minimum(1, (dur - t) / .01)
    return np.tanh(lp(x, 220, 2) * 2.4) * env * .8 * s


def v_siren(dur=2.4, s=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 520 + 1300 * (t / dur) ** 1.5 + 80 * np.sin(TAU * 6 * t)
    x = np.sign(np.sin(TAU * np.cumsum(f) / SR)) * .5 + np.sin(TAU * np.cumsum(f * 2) / SR) * .25
    return lp(x, 5000, 2) * np.minimum(1, t / .05) * np.exp(-t / (dur * .6)) * .28 * s


def v_key(ch, s=1.0):
    n = int(.045 * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(abs(hash(str(ch))) % 1000)
    f = 1800 + (abs(hash(str(ch))) % 7) * 130
    x = np.sin(TAU * f * t) * np.exp(-t / .006) * .8 + hp(rng.standard_normal(n), 3000) * np.exp(-t / .004) * .6
    if ch == "enter":
        x = x * 1.3 + np.sin(TAU * 220 * t) * np.exp(-t / .03)
    return x * .5 * s


def v_braam(root, s=1.0, dur=2.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for m, g in ((root, 1.0), (root + 12, .8), (root + 19, .55), (root + 24, .35)):
        for det in (-.14, -.05, .05, .14):
            x += g * nsaw(mtof(m), n, det)
    env = np.minimum(1, t / .04) * np.exp(-t / (dur * .4))
    y = lp(x, 400, 2) * .55 + lp(x, 1600, 2) * .45 * np.exp(-t / .6) + lp(x, 5000, 2) * .4 * np.exp(-t / .2)
    return np.tanh(y * env * .36 * 2.2) * .85 * s


def v_taiko(s=1.0):
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    f = 46 + 90 * np.exp(-t / .07)
    body = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / .34)
    rng = np.random.default_rng(31)
    return np.tanh((body * 1.1 + bp(rng.standard_normal(n), 120, 600, 2) * np.exp(-t / .09) * .8) * 1.4) * .9 * s


def v_choir(chord, s=1.0, dur=3.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for m in chord[1] + [chord[0] + 12]:
        for det in (-.1, 0, .1):
            x += nsaw(mtof(m + 12 if m < 50 else m), n, det) * .4
    y = bp(x, 560, 900, 2) + bp(x, 1000, 1500, 2) * .55 + bp(x, 2400, 3300, 2) * .25
    return y * np.minimum(1, t / .8) * np.minimum(1, (dur - t) / .7) * .3 * s


def v_crash(s=1.0, dur=2.2):
    rng = np.random.default_rng(55)
    n = int(dur * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 3000) * (np.exp(-t / .8) * .7 + np.exp(-t / .1) * .6) * .5 * s


def v_psybass(midi, s=1.0, dur=.1):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(midi)
    x = nsaw(f, n) * .8 + np.sin(TAU * f * t) * .9
    env = np.minimum(1, t / .002) * np.exp(-t / (dur * .55)) * np.minimum(1, (dur - t) / .008)
    fc = 160 + 1300 * np.exp(-t / .03) * s
    y = reso_lp(x, fc, 5.0)
    return np.tanh(y * 2.4) * env * .85 * s


def v_psyarp(midi, s=1.0, dur=.105):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(midi)
    x = nsaw(f, n, .08) * .5 + nsaw(f, n, -.08) * .5 + np.sign(np.sin(TAU * f * t)) * .22
    env = np.minimum(1, t / .002) * np.exp(-t / (dur * .6)) * np.minimum(1, (dur - t) / .008)
    fc = 500 + 5200 * np.exp(-t / .03) * s
    return reso_lp(x, fc, 3.2) * env * .34 * s


def v_blip(midi, s=1.0):
    n = int(.28 * SR)
    t = np.arange(n) / SR
    f = mtof(midi) * (1 + .5 * np.exp(-t / .03))
    x = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / .07)
    return x * .22 * s


def v_zap(s=1.0):
    n = int(.35 * SR)
    t = np.arange(n) / SR
    f = 3800 * np.exp(-t / .07) + 180
    x = np.sign(np.sin(TAU * np.cumsum(f) / SR)) * .5 + np.sin(TAU * np.cumsum(f * 1.5) / SR) * .3
    return lp(x, 7000, 2) * np.exp(-t / .1) * .3 * s


def v_swell(dur, s=1.0):
    """reversed shimmering pad: the psychedelic inhale before a drop."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for m in (60, 65, 68, 72, 77):
        for det in (-.12, .12):
            x += nsaw(mtof(m), n, det) * .3
    x = lp(x, 3500, 2) * (t / dur) ** 2.2
    return x * .35 * s


def pingpong(buf, delay, fb=.5, taps=5, mix=.55):
    """stereo ping-pong echo (dotted-eighth feel)."""
    out = np.zeros_like(buf)
    d = int(delay * SR)
    for k in range(1, taps + 1):
        g = mix * fb ** (k - 1)
        src = buf[0] if k % 2 else buf[1]
        dst = 1 if k % 2 else 0
        if k * d < buf.shape[1]:
            out[dst, k * d:] += src[:buf.shape[1] - k * d] * g
    return out


def flanger(buf, depth=.0018, rate=.23, mix=.5):
    n = buf.shape[1]
    t = np.arange(n) / SR
    out = np.zeros_like(buf)
    for c_ in range(2):
        d = (.0032 + depth * np.sin(TAU * rate * t + c_ * 1.6)) * SR
        idx = np.arange(n) - d
        out[c_] = np.interp(idx, np.arange(n), buf[c_], left=0)
    return buf * (1 - mix * .5) + out * mix


def trance_gate(buf, t0, t1, rate=BEAT / 4, depth=.55):
    i0, i1 = int(t0 * SR), int(t1 * SR)
    t = (np.arange(i1 - i0) / SR) % rate / rate
    g = 1 - depth * (t > .5)
    smooth = np.convolve(g, np.ones(60) / 60, "same")
    buf[:, i0:i1] *= smooth


def render_audio(path_wav, quiet=False):
    ev = build_events()
    N = int(DUR * SR)
    z = lambda: np.zeros((2, N))
    kick, perc, bass, lead, pads, bells, fx = z(), z(), z(), z(), z(), z(), z()
    for t, s, x in ev["kick"]:
        place(kick, v_hardkick(s) if x == "hard" else v_hardkick(s * .9)[:int(.5 * SR)] * 0.6, t)
    for i, (t, s, x) in enumerate(ev["clap"]):
        place(perc, v_clap(s, i % 4), t, .85)
    for i, (t, s, x) in enumerate(ev["snare"]):
        place(perc, v_snare(s, i % 8), t, .7)
    for i, (t, s, x) in enumerate(ev["hat"]):
        place(perc, v_hat(s, False, i % 16), t, .5, pan=.25 if i % 2 else -.25)
    for i, (t, s, x) in enumerate(ev["ohat"]):
        place(perc, v_hat(s, True, i % 8), t, .45)
    for t, s, x in ev["key"]:
        place(perc, v_key(x, s), t, .8)
    for i, (t, s, x) in enumerate(ev["tick"]):
        n = int(.02 * SR)
        place(perc, np.sin(TAU * 3400 * np.arange(n) / SR) * np.exp(-np.arange(n) / SR / .004) * .25 * s, t, .6, pan=.5 if i % 2 else -.5)
    for t, s, x in ev["taiko"]:
        place(perc, v_taiko(s), t)
    for t, s, m in ev["psybass"]:
        place(bass, v_psybass(m, s), t)
    arp = z()
    for i, (t, s, m) in enumerate(ev["arp"]):
        place(arp, v_psyarp(m, s), t, .8, pan=.35 if i % 2 else -.35)
    for t, s, m in ev["blip"]:
        place(bells, v_blip(m, s), t, 1.0, pan=np.sin(t * 5.1) * .8)
    for t, s, x in ev["zap"]:
        place(fx, v_zap(s), t)
    for t, s, d in ev["swell"]:
        place(pads, v_swell(d, s), t)
    for i, (t, s, x) in enumerate(ev["hoover"]):
        place(lead, v_hoover(x[1][1][0], s, .34), t, .8)
    for t, s, ch in ev["chord"]:
        place(lead, v_chord(ch, s, 1.5), t, .7)
    for t, s, root in ev["braam"]:
        place(lead, v_braam(root, s), t, 1.0)
    for t, s, x in ev["choir"]:
        ch = CMAJ if x == "res" else CH[int((x if isinstance(x, (int, float)) else 0) // 4) % 4]
        place(pads, v_choir(ch, 1.0, 4 * BEAT + .8 if x != "res" else 6.0), t)
    place(pads, v_sub(24, 12.0, .9, 3.0), 0.0)
    place(pads, v_sub(24, 7.0, .9, .5), bt(75))
    for t, s, m in ev["bell"]:
        place(bells, v_bell(m, s), t, 1.0, pan=np.sin(t * 2.7) * .5)
    for t, s, dur in ev["riser"]:
        place(fx, v_riser(dur, s), t)
    for i, (t, s, x) in enumerate(ev["whoosh"]):
        place(fx, v_whoosh(1.0, s, True, i), t - .5)
    for t, s, kind in ev["impact"]:
        place(fx, v_impact(kind, s), t)
    for t, s, x in ev["crash"]:
        place(fx, v_crash(s), t)
    for t, s, x in ev["siren"]:
        place(fx, v_siren(2.4, s), t)
    for t, s, d in ev["downlift"]:
        place(fx, v_downlift(d, s), t)
    for t, s, d in ev["vacuum"]:
        place(fx, v_reverse_crash(1.0, .8), t - 1.0 + d)

    arp = flanger(arp, .0015, .31, .7) + pingpong(arp, BEAT * .75, .55, 6, .6)
    lead = lead + arp
    for tg in (3.2, 9.6, 22.4):
        pass
    trance_gate(pads, bt(24), bt(40), BEAT / 4, .5)
    trance_gate(pads, bt(56), bt(75), BEAT / 4, .5)
    # sidechain: bass, lead, pads duck under hard kicks
    duck = np.ones(N)
    for t, s, x in ev["kick"]:
        if x != "hard":
            continue
        i = int(t * SR)
        n = int(.2 * SR)
        k = np.arange(min(n, N - i)) / n
        duck[i:i + len(k)] *= 1 - .8 * (1 - k ** 1.4)
    bass *= duck
    lead *= (.25 + .75 * duck)
    pads *= (.4 + .6 * duck)
    gate = np.ones(N)
    for t, s, d in ev["vacuum"]:
        i0, i1 = int(t * SR), int((t + d) * SR)
        f = int(.003 * SR)
        gate[i0:i1] = 0
        gate[i0 - f:i0] = np.linspace(1, 0, f)
        gate[i1:i1 + f] = np.linspace(0, 1, f)
    for L in (kick, perc, bass, lead):
        L *= gate
    pads *= np.maximum(gate, .15)
    hall = reverb_ir(3.4, 2.2, seed=21, damp=6500)
    room = reverb_ir(.9, .4, seed=4, damp=5000)
    mix = (kick * 1.05 + perc * .9 + bass * .95 + lead * .85 + pads * .9 + bells * .9 + fx * .85
           + reverb(lead, hall, .22) + reverb(pads, hall, .5) + reverb(bells, hall, .9) + reverb(fx, hall, .3) + reverb(perc, room, .12) + reverb(kick, room, .05))
    tt = np.arange(N) / SR
    sec = np.interp(tt, [0, 3.0, 3.19, 3.2, 15.9, 16.0, 22.2, 22.4, 33], [.55, .8, .8, 1.0, 1.0, .8, .72, 1.0, 1.0])
    mix *= sec
    mix[0], mix[1] = hp(mix[0], 22, 2), hp(mix[1], 22, 2)
    mix = sat(mix * .85, 1.4)
    mix = mix / np.max(np.abs(mix)) * .66
    mix *= np.minimum(1, tt / .2) * np.minimum(1, (DUR - tt) / 1.8) ** 1.4
    wavfile.write(path_wav, SR, (np.clip(mix.T, -1, 1) * 32767).astype(np.int16))
    if not quiet:
        print(f"audio {DUR:.1f}s peak {np.max(np.abs(mix)):.2f}")
    return ev


if __name__ == "__main__":
    import sys
    render_audio(sys.argv[1] if len(sys.argv) > 1 else "score.wav")
