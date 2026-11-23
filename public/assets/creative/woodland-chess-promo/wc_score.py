"""WOODLAND CHESS promo - the score.

Epic, philosophical, Hollywood-trailer: D minor, 90 BPM. 30 fps gives 20 frames per beat, 5 frames per
16th, so every hit lands on a whole frame. 22.5 beats = exactly 15.000 s.

    beats 0-4    VOID    sub drone, heartbeat, glass-bell motif, trident of points assembling
    beat 4       HIT I   braam + taiko + boom; words PLAY / WITH / INTENT on the next three beats
    beats 4-16   OSTINATO strings in 3+3+2, choir pad, taiko on every mode change (8, 10, 12)
    beats 13-16  BUILD   snare roll 1/8 -> 1/16 -> 1/32, riser, one held breath of silence
    beat 16      DROP    full orchestra, crash, bars open, lockup
    beats 18-22.5 RESOLVE bells state the motif, D major, long tail

The renderer reads the same `build_events()`; picture and sound share one clock.
"""
import numpy as np
from scipy.io import wavfile

from wc_dsp import (SR, TAU, mtof, lp, hp, bp, sat, place, blsaw, reverb_ir, reverb, v_bell, v_riser, v_whoosh, v_impact,
                    v_downlift, v_reverse_crash, v_snare, v_kick, v_arp, v_sub)

BPM = 90
BEAT = 60.0 / BPM            # 0.6667 s
DUR = 15.0
FPS = 30


def bt(b):
    return b * BEAT


# D minor chords: (bass midi, triad midi)
DM, BB, F_, GM, A_, C_, DMAJ = (38, [62, 65, 69]), (34, [58, 62, 65]), (41, [57, 60, 65]), (43, [58, 62, 67]), (45, [61, 64, 69]), (36, [60, 64, 67]), (38, [62, 66, 69])
PROG = [(4, DM), (8, BB), (12, GM), (14, A_), (16, DM), (20, DMAJ)]


def build_events():
    ev = {k: [] for k in ("kick", "taiko", "braam", "impact", "knock", "riser", "vacuum", "whoosh", "snare", "bell", "str",
                          "choir", "crash", "word", "mode", "downlift", "boom")}

    def add(k, b, s=1.0, x=None):
        ev[k].append((float(bt(b)), float(s), x))

    # ---- VOID (0-4)
    for b, s in ((0.0, .30), (0.75, .22), (1.5, .34), (2.25, .28), (2.9, .38), (3.35, .30), (3.7, .42)):
        add("kick", b, s, "heart")
    for b, m, s in ((1.0, 74, .8), (1.75, 81, .7), (2.5, 77, .8), (3.25, 84, .7)):
        add("bell", b, s, m)
    add("riser", 1.0, .7, 3 * BEAT)
    add("whoosh", 3.5, .8)
    add("word", 0.5, 1.0, "ignite")

    # ---- HIT I and the three words
    add("impact", 4, 1.0, "drop")
    add("braam", 4, 1.0, 38)
    add("taiko", 4, 1.0)
    add("crash", 4, .7)
    add("knock", 4, 1.0)
    for k, w in ((4, "PLAY"), (5, "WITH"), (6, "INTENT.")):
        add("word", k, 1.0, w)
    add("taiko", 5, .75)
    add("taiko", 6, 1.0)
    add("knock", 5, .8)
    add("knock", 6, 1.0)
    add("impact", 6, .6, "small")

    # ---- ostinato strings (8ths, accents 3+3+2) from beat 4 to beat 16
    prog = [(b, c) for b, c in PROG]
    def chord_at(b):
        cur = prog[0][1]
        for pb, c in prog:
            if b >= pb:
                cur = c
        return cur
    step = 0
    b = 4.0
    while b < 16.0 - 1e-6:
        ch = chord_at(b)
        tri = ch[1]
        notes = [tri[0] - 12, tri[1] - 12, tri[2] - 12, tri[0], tri[1] - 0, tri[2]]
        n = notes[step % len(notes)] if (step // 6) % 2 == 0 else notes[(step * 5) % len(notes)]
        acc = 1.0 if step % 8 in (0, 3, 6) else .55
        add("str", b, acc * min(1.0, .55 + .05 * (b - 4)), n)
        b += 0.5
        step += 1
    # 16ths fill into the drop (beats 14-16) and full-time ostinato in the resolve
    for i in range(int((16 - 14) * 4)):
        bb = 14 + i * .25
        ch = chord_at(bb)
        add("str", bb, .5 + .02 * i, ch[1][i % 3])
    b = 16.0
    step = 0
    while b < 19.0:
        ch = chord_at(b)
        add("str", b, 1.0 if step % 8 in (0, 3, 6) else .65, ch[1][step % 3] + (12 if step % 6 > 2 else 0))
        b += .25 if b < 18 else .5
        step += 1

    # ---- choir pad on each chord
    for pb, ch in PROG:
        add("choir", pb, 1.0, pb)
    # ---- modes
    for k, name in ((8, "COMPUTER"), (10, "ONLINE"), (12, "PUZZLES")):
        add("mode", k, 1.0, name)
        add("taiko", k, 1.0)
        add("knock", k, 1.0)
        add("braam", k, .55, 38 if k != 12 else 43)
        add("impact", k, .55, "small")
        add("whoosh", k - .5, .6)
    add("taiko", 9, .5)
    add("taiko", 11, .5)
    add("knock", 9.5, .7)
    add("knock", 11.5, .7)

    # ---- build 13-16
    roll = []
    for i in range(4):
        roll.append(13 + i * .5)
    for i in range(8):
        roll.append(14 + i * .25)
    for i in range(8):
        roll.append(15 + i * .125)
    roll = [r for r in roll if r < 15.5]
    for i, r in enumerate(roll):
        add("snare", r, .3 + .7 * i / max(1, len(roll) - 1), "roll")
    add("riser", 12, 1.0, 4 * BEAT)
    add("whoosh", 15.0, 1.0)
    add("vacuum", 15.5, 1.0, .5 * BEAT)

    # ---- DROP
    add("impact", 16, 1.0, "final")
    add("braam", 16, 1.0, 38)
    add("braam", 16, .8, 50)
    add("taiko", 16, 1.0)
    add("taiko", 16.5, .8)
    add("crash", 16, 1.0)
    add("knock", 16, 1.0)
    add("boom", 16, 1.0)
    for b in (17, 18):
        add("taiko", b, .8)
    add("downlift", 18, .9, 2 * BEAT)
    # bells state the motif, then resolve in D major
    for b, m, s in ((18.0, 74, .9), (18.75, 81, .8), (19.5, 78, .8), (20.25, 86, .9), (21.0, 90, .8), (21.75, 93, .7)):
        add("bell", b, s, m)
    add("word", 18.0, 1.0, "CTA")
    for k in ev:
        ev[k].sort(key=lambda e: e[0])
    return ev


# ------------------------------------------------------------------ cinematic voices
def v_braam(root, strength=1.0, dur=3.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for m, g in ((root, 1.0), (root + 12, .8), (root + 19, .55), (root + 24, .35)):
        f = mtof(m)
        for det in (-.14, -.05, .05, .14):
            x += g * blsaw(f * 2 ** (det / 12), n, 10)
    env = np.minimum(1, t / 0.05) * np.exp(-t / (dur * .42))
    cut = 200 + 3600 * np.exp(-t / .5)
    a, b2, c2 = lp(x, 380, 2), lp(x, 1400, 2), lp(x, 4200, 2)
    m1 = np.clip(1 - t / .25, 0, 1)
    y = a * (.35 + .65 * (1 - m1)) + b2 * .5 * np.exp(-t / .6) + c2 * .45 * m1
    return sat(y * env * .35, 2.0) * .8 * strength


def v_taiko(strength=1.0):
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    f = 46 + 90 * np.exp(-t / .07)
    body = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / .38)
    rng = np.random.default_rng(31)
    skin = bp(rng.standard_normal(n), 120, 600, 2) * np.exp(-t / .09) * .8
    slap = hp(rng.standard_normal(n), 2500) * np.exp(-t / .012) * .35
    return sat((body * 1.1 + skin + slap) * 1.2, 1.4) * .95 * strength


def v_knock(strength=1.0):
    """a wooden piece landing on the board."""
    n = int(.25 * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(77)
    tone = np.sin(TAU * 360 * t) * np.exp(-t / .045) * .8 + np.sin(TAU * 910 * t) * np.exp(-t / .02) * .5
    tick = bp(rng.standard_normal(n), 1800, 5200, 2) * np.exp(-t / .006)
    return (tone + tick * .6) * strength * .55


def v_str(midi, strength=1.0, dur=.34):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(midi)
    x = blsaw(f * 1.004, n, 12) + blsaw(f * .996, n, 12)
    env = np.minimum(1, t / .012) * np.exp(-t / (dur * .55)) * np.minimum(1, (dur - t) / .02)
    y = lp(x, 900 + 2600 * strength, 2) * env
    return y * .22 * strength


def v_choir(chord, strength=1.0, dur=3.2, bright=.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for m in chord[1] + [chord[0] + 12]:
        f = mtof(m + 12 if m < 50 else m)
        for det in (-.1, 0.0, .1):
            x += blsaw(f * 2 ** (det / 12), n, 14) * .4
    y = bp(x, 560, 900, 2) * 1.0 + bp(x, 1000, 1500, 2) * .55 + bp(x, 2400, 3300, 2) * .25
    env = np.minimum(1, t / 1.0) * np.minimum(1, (dur - t) / .8)
    return y * env * .30 * strength


def v_crash2(strength=1.0, dur=2.6):
    rng = np.random.default_rng(55)
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = hp(rng.standard_normal(n), 3000) * (np.exp(-t / .9) * .7 + np.exp(-t / .12) * .6)
    return x * .5 * strength


def render_audio(path_wav, quiet=False):
    ev = build_events()
    N = int(DUR * SR)
    z = lambda: np.zeros((2, N))
    drums, music, pads, bells, fx = z(), z(), z(), z(), z()

    # drone: D1 + A1 swelling under the whole film
    place(pads, v_sub(26, 11.0, .95, 3.0), 0.0)
    place(pads, v_sub(33, 11.0, .5, 4.0), 0.0)
    place(pads, v_sub(26, 5.0, .9, 1.0), bt(16))
    for t, s, x in ev["kick"]:
        place(drums, v_kick(s, "heart"), t)
    for t, s, x in ev["taiko"]:
        place(drums, v_taiko(s), t)
    for i, (t, s, x) in enumerate(ev["snare"]):
        place(drums, v_snare(s, i % 8), t, .65)
    for t, s, x in ev["knock"]:
        place(drums, v_knock(s), t, .8)
    for t, s, root in ev["braam"]:
        place(music, v_braam(root, s), t, 1.0)
    for i, (t, s, m) in enumerate(ev["str"]):
        place(music, v_str(m, s), t, .8, pan=-.3 if i % 2 else .3)
    for pb, ch in PROG:
        dur = {4: 4.0, 8: 4.0, 12: 2.0, 14: 2.0, 16: 4.0, 20: 5.0}[pb] * BEAT + .8
        place(pads, v_choir(ch, 1.0, dur), bt(pb))
    for t, s, m in ev["bell"]:
        place(bells, v_bell(m, s), t, 1.0, pan=np.sin(t * 2.3) * .5)
    for t, s, dur in ev["riser"]:
        place(fx, v_riser(dur, s), t)
    for i, (t, s, x) in enumerate(ev["whoosh"]):
        place(fx, v_whoosh(1.2, s, True, i), t - .6)
    for t, s, kind in ev["impact"]:
        place(fx, v_impact(kind, s), t)
    for t, s, x in ev["crash"]:
        place(fx, v_crash2(s), t)
    for t, s, dur in ev["downlift"]:
        place(fx, v_downlift(dur, s), t)
    for t, s, dur in ev["vacuum"]:
        place(fx, v_reverse_crash(1.2, .8), t - 1.2 + dur)
    # vacuum: everything but the tail drops out for half a beat
    gate = np.ones(N)
    for t, s, dur in ev["vacuum"]:
        i0, i1 = int(t * SR), int((t + dur) * SR)
        f = int(.004 * SR)
        gate[i0:i1] = 0
        gate[i0 - f:i0] = np.linspace(1, 0, f)
        gate[i1:i1 + f] = np.linspace(0, 1, f)
    for L in (drums, music):
        L *= gate
    pads *= np.maximum(gate, .15)
    hall = reverb_ir(4.2, 3.0, seed=12, damp=6500)
    room = reverb_ir(1.1, .5, seed=3, damp=5000)
    mix = (drums * 1.0 + music * .85 + pads * .9 + bells * .9 + fx * .85
           + reverb(drums, hall, .22) + reverb(music, hall, .35) + reverb(pads, hall, .5) + reverb(bells, hall, .9) + reverb(fx, hall, .3)
           + reverb(drums, room, .1))
    tt = np.arange(N) / SR
    sec = np.interp(tt, [0, 3.5, 4.0, 9.8, 10.67, 15], [.6, .75, 1.0, 1.0, 1.0, 1.0])
    mix *= sec
    mix[0] = hp(mix[0], 22, 2)
    mix[1] = hp(mix[1], 22, 2)
    mix = sat(mix * .9, 1.3)
    mix = mix / np.max(np.abs(mix)) * .66
    mix *= np.minimum(1, tt / .35) * np.minimum(1, (DUR - tt) / 1.6) ** 1.5
    wavfile.write(path_wav, SR, (np.clip(mix.T, -1, 1) * 32767).astype(np.int16))
    if not quiet:
        print(f"audio {DUR:.1f}s peak {np.max(np.abs(mix)):.2f}")
    return ev


if __name__ == "__main__":
    import sys
    render_audio(sys.argv[1] if len(sys.argv) > 1 else "score.wav")
