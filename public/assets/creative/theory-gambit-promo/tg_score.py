"""THEORY GAMBIT promo - the score.

One timeline drives everything. 120 BPM, 4/4, 30 bars = exactly 60.000 s, 30 fps = 60 frames per
bar, 15 frames per beat, so every beat lands on a whole frame. The synth below renders the music
from `build_events()`, and the renderer reads the very same events (kicks, snares, arps, hits,
risers, drops) to fire its visuals. Nothing is "timed by eye": picture and sound share one clock.

Sections (bars are 1-based)
    1-4    VOID        ambient: sub drone, FM bells, rings opening, heartbeat
    5-8    BUILD       kick enters, hats, arp, snare roll, riser, one beat of vacuum
    9-16   DROP I      full techno: kick, rolling bass, clap, hats, arps, stabs
    17-20  BREAK       ambient pads, bells, ticking counter, riser, vacuum
    21-28  DROP II     peak: heavier kick, acid-ish bass, 16th arps, fills, riser
    29-30  RESOLVE     impact, reverb tail, major resolve, fade
"""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 44100
BPM = 120
BEAT = 60.0 / BPM          # 0.5 s
BAR = 4 * BEAT             # 2.0 s
DUR = 30 * BAR             # 60.0 s
FPS = 30
TAU = 2 * np.pi

# A minor, "epic": Am - F - C - G  (i VI III VII)
def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)

A1, A2, A3 = 33, 45, 57
CHORDS = [  # root midi (bass octave), triad (pad octave)
    (33, [57, 60, 64]),   # Am
    (29, [53, 57, 60]),   # F
    (36, [55, 60, 64]),   # C
    (31, [55, 59, 62]),   # G
]
RES_CHORD = (33, [57, 61, 64, 69])   # A major, the resolve (picardy third)
PENTA = [0, 3, 5, 7, 10]             # A minor pentatonic offsets


def bar_t(bar, beat=0.0):
    """time in seconds of 1-based bar, beat offset in beats."""
    return (bar - 1) * BAR + beat * BEAT


# ------------------------------------------------------------------ events
def build_events():
    """Everything that happens on the timeline. type -> list of (t, strength, extra)."""
    ev = {k: [] for k in ("kick", "clap", "snare", "hat", "ohat", "arp", "bass", "stab", "bell",
                          "impact", "riser", "vacuum", "downlift", "tick", "word", "wave", "pad", "whoosh", "glitch")}

    def add(k, t, s=1.0, x=None):
        ev[k].append((float(t), float(s), x))

    # -------- section 1: VOID (bars 1-4)
    add("pad", bar_t(1), 0.5, 0)
    add("pad", bar_t(3), 0.6, 1)
    # heartbeat: soft sub thumps (visual pulse + audio)
    for b in range(1, 5):
        add("kick", bar_t(b, 0), 0.38 + 0.04 * b, "heart")
        add("kick", bar_t(b, 0.75), 0.2 + 0.03 * b, "heart")
    # bells: rings opening, one per beat from beat 3 of bar 1
    bell_notes = [0, 7, 12, 15, 19]
    for i in range(5):
        add("bell", bar_t(1, 2 + i * 1.0), 0.7, 69 + bell_notes[i])
    add("bell", bar_t(3, 0), 0.9, 81)
    add("bell", bar_t(3, 2), 0.6, 76)
    add("bell", bar_t(4, 0), 0.8, 79)
    add("bell", bar_t(4, 2), 0.7, 84)
    add("riser", bar_t(4, 0), 0.6, BAR)          # soft riser into the build
    add("whoosh", bar_t(4, 3.5), 0.6)

    # -------- section 2: BUILD (bars 5-8)
    for b in range(5, 9):
        for beat in range(4):
            s = 0.55 + 0.1 * (b - 5)
            add("kick", bar_t(b, beat), min(s, 0.95), "build")
    # off-beat hats (every "and") from bar 6, 16ths from bar 7
    for b in range(6, 9):
        for beat in range(4):
            add("hat", bar_t(b, beat + 0.5), 0.6, None)
    for b in (7, 8):
        for s16 in range(16):
            if s16 % 4 != 2:
                add("hat", bar_t(b, s16 * 0.25), 0.28, "ghost")
    # arp plucks (16ths) enter bar 6
    for b in range(6, 9):
        ch = CHORDS[(b - 5) % 4]
        for s16 in range(16):
            if b == 6 and s16 % 2: continue
            note = 57 + PENTA[(s16 * 3 + b) % 5] + (12 if s16 % 8 > 3 else 0)
            add("arp", bar_t(b, s16 * 0.25), 0.4 + 0.04 * (b - 5), note)
    # FEEL / SEE / PROVE words on bar downbeats 5, 6.5?, ... : on beats
    add("word", bar_t(5, 0), 1.0, "FEEL")
    add("word", bar_t(6, 0), 1.0, "SEE")
    add("word", bar_t(7, 0), 1.0, "PROVE")
    for k in (bar_t(5, 0), bar_t(6, 0), bar_t(7, 0)):
        add("impact", k, 0.6, "small")
    # snare roll bar 8 : 1/8 -> 1/16 -> 1/32
    roll = []
    t = bar_t(8, 0)
    for i in range(4):
        roll.append(t + i * 0.5 * BEAT)
    t = bar_t(8, 2)
    for i in range(8):
        roll.append(t + i * 0.25 * BEAT)
    t = bar_t(8, 4 - 1)
    for i in range(8):
        roll.append(bar_t(8, 3.0) + i * 0.125 * BEAT)
    # keep the roll up to the vacuum beat (last beat of bar 8 is silence at 16.0 - BEAT*0.5)
    roll = [r for r in roll if r < bar_t(9) - 0.5 * BEAT]
    for i, r in enumerate(roll):
        add("snare", r, 0.35 + 0.6 * i / max(1, len(roll) - 1), "roll")
    add("riser", bar_t(7, 0), 1.0, 2 * BAR)
    add("vacuum", bar_t(9) - 0.5 * BEAT, 1.0, 0.5 * BEAT)
    add("whoosh", bar_t(8, 0), 0.7)

    # -------- section 3: DROP I (bars 9-16)
    add("impact", bar_t(9), 1.0, "drop")
    add("whoosh", bar_t(9), 1.0)
    for b in range(9, 17):
        ch = CHORDS[(b - 9) % 4]
        for beat in range(4):
            add("kick", bar_t(b, beat), 1.0, "drop")
        add("clap", bar_t(b, 1), 0.9)
        add("clap", bar_t(b, 3), 0.9)
        for beat in range(4):
            add("ohat", bar_t(b, beat + 0.5), 0.8)
        for s16 in range(16):
            if s16 % 2 == 1 or s16 % 4 == 0:
                add("hat", bar_t(b, s16 * 0.25), 0.4 if s16 % 4 else 0.3, None)
        # rolling bass: 16th pattern off the kick
        for s16 in range(16):
            if s16 % 4 != 0:
                add("bass", bar_t(b, s16 * 0.25), 0.9 if s16 % 4 == 2 else 0.7, ch[0] + (12 if s16 in (7, 15) else 0))
        # arps: 16ths, accent every 3rd
        for s16 in range(16):
            note = 69 + PENTA[(s16 * 2 + (b - 9)) % 5] + (12 if (s16 // 4) % 2 else 0) + (0 if (b - 9) % 4 < 2 else -2)
            add("arp", bar_t(b, s16 * 0.25), 0.9 if s16 % 3 == 0 else 0.5, note)
        add("pad", bar_t(b), 0.7, (b - 9) % 4)
        # stab on the "and of 2" and "4"
        add("stab", bar_t(b, 1.5), 0.8, (b - 9) % 4)
        add("stab", bar_t(b, 3.5), 0.7, (b - 9) % 4)
    for b in (12, 16):   # fills
        for i in range(8):
            add("snare", bar_t(b, 3.0) + i * 0.125 * BEAT, 0.5 + 0.06 * i, "fill")
    add("riser", bar_t(15), 0.9, 2 * BAR)
    add("whoosh", bar_t(16, 0), 0.9)
    add("whoosh", bar_t(12, 3.5), 0.6)

    # -------- section 4: BREAKDOWN (bars 17-20)
    add("downlift", bar_t(17), 1.0, 2 * BEAT)
    add("impact", bar_t(17), 0.8, "soft")
    for b in range(17, 21):
        add("pad", bar_t(b), 0.9, (b - 17) % 4)
        add("kick", bar_t(b, 0), 0.3, "heart")
        add("kick", bar_t(b, 2), 0.22, "heart")
        for q in range(8):
            add("bell", bar_t(b, q * 0.5), 0.45 + 0.1 * (q % 2), 69 + 12 + PENTA[(q * 2 + b) % 5] - (12 if q > 3 else 0))
    for i in range(4):   # ticking counter
        pass
    for b in range(18, 21):
        for q in range(16):
            add("tick", bar_t(b, q * 0.25), 0.25 + 0.12 * (b - 17) / 3, None)
    for b in (19, 20):
        for beat in range(4):
            add("kick", bar_t(b, beat), 0.5 + 0.12 * (b - 19), "build")
    # hats come back and arp thickens in 19-20
    for b in (19, 20):
        for beat in range(4):
            add("hat", bar_t(b, beat + 0.5), 0.5, None)
        for s16 in range(16):
            note = 69 + PENTA[(s16 * 3 + b) % 5] + 12
            add("arp", bar_t(b, s16 * 0.25), 0.3 + 0.05 * (b - 19), note)
    roll = []
    for i in range(4):
        roll.append(bar_t(20, 0) + i * 0.5 * BEAT)
    for i in range(8):
        roll.append(bar_t(20, 2) + i * 0.25 * BEAT)
    for i in range(8):
        roll.append(bar_t(20, 3) + i * 0.125 * BEAT)
    roll = [r for r in roll if r < bar_t(21) - 0.5 * BEAT]
    for i, r in enumerate(roll):
        add("snare", r, 0.3 + 0.65 * i / max(1, len(roll) - 1), "roll")
    add("riser", bar_t(19), 1.0, 2 * BAR)
    add("vacuum", bar_t(21) - 0.5 * BEAT, 1.0, 0.5 * BEAT)
    add("whoosh", bar_t(20, 0), 0.8)

    # -------- section 5: DROP II (bars 21-28)
    add("impact", bar_t(21), 1.0, "drop2")
    add("whoosh", bar_t(21), 1.0)
    for b in range(21, 29):
        ch = CHORDS[(b - 21) % 4]
        for beat in range(4):
            add("kick", bar_t(b, beat), 1.0, "drop2")
        add("clap", bar_t(b, 1), 1.0)
        add("clap", bar_t(b, 3), 1.0)
        for beat in range(4):
            add("ohat", bar_t(b, beat + 0.5), 0.9)
        for s16 in range(16):
            add("hat", bar_t(b, s16 * 0.25), 0.45 if s16 % 2 else 0.3, None)
        for s16 in range(16):
            if s16 % 4 != 0:
                add("bass", bar_t(b, s16 * 0.25), 1.0 if s16 % 4 == 2 else 0.8, ch[0] + (12 if s16 in (3, 7, 11, 15) else 0))
        for s16 in range(16):
            note = 69 + PENTA[(s16 * 2 + b) % 5] + (12 if (s16 // 2) % 2 else 0) + (0 if (b - 21) % 4 < 2 else -2)
            add("arp", bar_t(b, s16 * 0.25), 1.0 if s16 % 3 == 0 else 0.6, note)
        add("pad", bar_t(b), 0.8, (b - 21) % 4)
        add("stab", bar_t(b, 1.5), 0.9, (b - 21) % 4)
        add("stab", bar_t(b, 3.5), 0.8, (b - 21) % 4)
        add("stab", bar_t(b, 2.75), 0.6, (b - 21) % 4)
    for b in (24, 28):
        for i in range(16):
            add("snare", bar_t(b, 2.0) + i * 0.125 * BEAT, 0.4 + 0.04 * i, "fill")
    add("riser", bar_t(27), 1.0, 2 * BAR)
    add("whoosh", bar_t(24, 3.5), 0.7)
    add("whoosh", bar_t(28, 0), 1.0)
    # bar 29 is the resolve: the last drop-II beat of bar 28 cuts to a vacuum
    add("vacuum", bar_t(29) - 0.5 * BEAT, 1.0, 0.5 * BEAT)

    # -------- section 6: RESOLVE (bars 29-30)
    add("impact", bar_t(29), 1.0, "final")
    add("pad", bar_t(29), 1.0, "res")
    add("bell", bar_t(29, 0.0), 1.0, 81)
    add("bell", bar_t(29, 1.0), 0.8, 85)
    add("bell", bar_t(29, 2.0), 0.8, 88)
    add("bell", bar_t(29, 3.0), 0.7, 93)
    add("bell", bar_t(30, 0.0), 0.7, 88)
    add("bell", bar_t(30, 2.0), 0.9, 81)
    add("downlift", bar_t(29), 1.0, 2 * BEAT)
    add("kick", bar_t(29, 0), 1.0, "final")
    add("kick", bar_t(30, 0), 0.35, "heart")

    # ripples for the wave surface: every kick of the drops
    for t, s, x in ev["kick"]:
        add("wave", t, s, x)
    for k in ev:
        ev[k].sort(key=lambda e: e[0])
    return ev


# ------------------------------------------------------------------ DSP helpers
def env_exp(n, decay):
    t = np.arange(n) / SR
    return np.exp(-t / decay)


def lp(x, fc, order=2):
    sos = butter(order, min(fc, SR * 0.45) / (SR / 2), "low", output="sos")
    return sosfilt(sos, x)


def hp(x, fc, order=2):
    sos = butter(order, fc / (SR / 2), "high", output="sos")
    return sosfilt(sos, x)


def bp(x, lo, hi, order=2):
    sos = butter(order, [lo / (SR / 2), min(hi, SR * 0.45) / (SR / 2)], "band", output="sos")
    return sosfilt(sos, x)


def sat(x, g=1.0):
    return np.tanh(x * g) / np.tanh(g)


def place(buf, sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= buf.shape[1]:
        return
    n = min(len(sig), buf.shape[1] - i)
    if n <= 0:
        return
    l = gain * np.cos((pan + 1) * np.pi / 4)
    r = gain * np.sin((pan + 1) * np.pi / 4)
    buf[0, i:i + n] += sig[:n] * l
    buf[1, i:i + n] += sig[:n] * r


def saw(freq, n, phase=0.0):
    t = np.arange(n) / SR
    ph = (freq * t + phase) % 1.0
    return 2 * ph - 1


def blsaw(freq, n, harmonics=24):
    """band-limited-ish saw via additive sum (cheap at low harmonics counts)."""
    t = np.arange(n) / SR
    out = np.zeros(n)
    k = int(min(harmonics, (SR / 2) // max(freq, 1)))
    for h in range(1, k + 1):
        out += np.sin(TAU * freq * h * t) / h
    return out * (2 / np.pi)


def reverb_ir(seconds=3.0, decay=1.4, seed=1, damp=6000):
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = [rng.standard_normal(n) * np.exp(-t * (6.9 / decay)) for _ in range(2)]
    ir = [lp(c, damp, 1) for c in ir]
    ir = [c * np.minimum(1, t * 40) for c in ir]    # tiny predelay-ish fade in
    ir = np.stack(ir)
    ir /= np.sqrt((ir ** 2).sum(1, keepdims=True)) + 1e-9
    return ir


def reverb(buf, ir, wet=0.3):
    out = np.zeros_like(buf)
    for c in range(2):
        out[c] = fftconvolve(buf[c], ir[c])[:buf.shape[1]]
    return out * wet


# ------------------------------------------------------------------ voices
def v_kick(strength=1.0, kind="drop"):
    dur = 0.42 if kind not in ("heart",) else 0.5
    n = int(dur * SR)
    t = np.arange(n) / SR
    f0, f1 = (160.0, 46.0) if kind != "heart" else (90.0, 38.0)
    decay_p = 0.035 if kind != "heart" else 0.06
    f = f1 + (f0 - f1) * np.exp(-t / decay_p)
    ph = TAU * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / (0.16 if kind != "heart" else 0.2))
    click = np.random.default_rng(3).standard_normal(n) * np.exp(-t / 0.004) * 0.25
    click = hp(click, 1500)
    k = body + click
    if kind in ("drop2", "final"):
        k = sat(k * 1.5, 1.6)
    elif kind != "heart":
        k = sat(k * 1.2, 1.3)
    return k * strength


def v_clap(strength=1.0, seed=0):
    rng = np.random.default_rng(100 + seed)
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    env = np.zeros(n)
    for d in (0.0, 0.011, 0.022, 0.034):
        i = int(d * SR)
        env[i:] += np.exp(-(t[:n - i]) / 0.012) * 0.7
    env += np.exp(-t / 0.09) * 0.55
    x = bp(noise, 900, 6500, 2) * env
    return sat(x * 1.6, 1.4) * 0.9 * strength


def v_snare(strength=1.0, seed=0):
    rng = np.random.default_rng(200 + seed)
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    noise = hp(rng.standard_normal(n), 1800) * np.exp(-t / 0.06)
    tone = np.sin(TAU * 190 * t) * np.exp(-t / 0.05) * 0.5
    return (noise * 0.9 + tone) * strength


def v_hat(strength=1.0, open_=False, seed=0):
    rng = np.random.default_rng(300 + seed)
    dur = 0.22 if open_ else 0.05
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = hp(rng.standard_normal(n), 7000)
    return noise * np.exp(-t / (0.07 if open_ else 0.014)) * strength * (0.45 if open_ else 0.4)


def v_bass(midi, strength=1.0, dur=0.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(midi)
    x = blsaw(f, n, 14) * 0.7 + np.sin(TAU * f * t) * 0.9 + np.sin(TAU * f * 0.5 * t) * 0.35
    env = np.minimum(1, t / 0.003) * np.exp(-t / (dur * 0.7)) * np.minimum(1, (dur - t) / 0.012)
    x = lp(x, 520 + 1800 * strength, 2) * env
    return sat(x * 1.8, 1.5) * 0.7 * strength


def v_arp(midi, strength=1.0, dur=0.22):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(midi)
    x = (blsaw(f * 1.003, n, 10) + blsaw(f * 0.997, n, 10)) * 0.5 + 0.35 * np.sign(np.sin(TAU * f * t))
    env = np.minimum(1, t / 0.002) * np.exp(-t / 0.075)
    cutoff = 700 + 5200 * np.exp(-t / 0.06) * strength
    # time-varying lowpass: blend of two static filters
    a = lp(x, 900, 2)
    b = lp(x, 6200, 2)
    mix = np.exp(-t / 0.05)
    y = (a * (1 - mix) + b * mix) * env
    return y * 0.32 * strength


def v_bell(midi, strength=1.0, dur=3.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(midi)
    mod = np.sin(TAU * f * 3.5 * t) * 2.2 * np.exp(-t / 0.5)
    x = np.sin(TAU * f * t + mod) * np.exp(-t / 1.2)
    x += 0.4 * np.sin(TAU * f * 2.01 * t + mod * 0.5) * np.exp(-t / 0.7)
    x += 0.2 * np.sin(TAU * f * 4.2 * t) * np.exp(-t / 0.25)
    x *= np.minimum(1, t / 0.004)
    return x * 0.3 * strength


def v_stab(chord_idx, strength=1.0, dur=0.35):
    n = int(dur * SR)
    t = np.arange(n) / SR
    root, triad = CHORDS[chord_idx % 4]
    x = np.zeros(n)
    for m in triad:
        f = mtof(m + 12)
        x += blsaw(f * 1.004, n, 8) + blsaw(f * 0.996, n, 8)
    env = np.minimum(1, t / 0.002) * np.exp(-t / 0.11)
    x = lp(x, 3200, 2) * env
    return sat(x * 0.5, 1.5) * 0.25 * strength


def v_pad(chord, strength=1.0, dur=BAR + 0.6, bright=0.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    triad = chord[1]
    x = np.zeros(n)
    for m in triad:
        f = mtof(m)
        for det in (-0.12, 0.0, 0.11):
            x += blsaw(f * (2 ** (det / 12)), n, 6) * 0.5
    atk = np.minimum(1, t / (0.7 + 0.5 * (1 - bright)))
    rel = np.minimum(1, (dur - t) / 0.6)
    x = lp(x, 700 + 2600 * bright, 2) * atk * rel
    return x * 0.16 * strength


def v_sub(midi, dur, strength=1.0, fade=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(midi)
    x = np.sin(TAU * f * t) + 0.2 * np.sin(TAU * 2 * f * t)
    return x * np.minimum(1, t / fade) * np.minimum(1, (dur - t) / fade) * 0.35 * strength


def v_riser(dur, strength=1.0, seed=0):
    rng = np.random.default_rng(400 + seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    p = t / dur
    noise = rng.standard_normal(n)
    # sweep a bandpass upward by crossfading a few band-limited noises
    out = np.zeros(n)
    centres = np.geomspace(300, 9000, 14)
    for i, c in enumerate(centres):
        band = bp(noise, c * 0.7, c * 1.4, 2)
        w = np.exp(-((p - i / (len(centres) - 1)) ** 2) / 0.02)
        out += band * w
    pitch = np.sin(TAU * np.cumsum(120 * 2 ** (p * 3.6)) / SR) * 0.35
    shimmer = np.sin(TAU * np.cumsum(600 * 2 ** (p * 2.5)) / SR) * 0.15
    env = p ** 1.8
    return (out * 0.55 + pitch + shimmer) * env * 0.55 * strength


def v_whoosh(dur=1.2, strength=1.0, up=True, seed=0):
    rng = np.random.default_rng(500 + seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    p = t / dur
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    centres = np.geomspace(250, 7000, 12)
    for i, c in enumerate(centres):
        band = bp(noise, c * 0.75, c * 1.3, 2)
        pos = (i / (len(centres) - 1)) if up else 1 - i / (len(centres) - 1)
        w = np.exp(-((p - pos) ** 2) / 0.03)
        out += band * w
    env = np.sin(np.pi * np.clip(p, 0, 1)) ** 1.5
    return out * env * 0.5 * strength


def v_impact(kind="drop", strength=1.0):
    dur = {"small": 1.6, "drop": 3.4, "drop2": 3.8, "soft": 2.6, "final": 6.0}[kind]
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(600)
    f = 36 + 120 * np.exp(-t / 0.05)
    boom = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / (0.7 if kind != "small" else 0.35))
    crash = hp(rng.standard_normal(n), 4000) * np.exp(-t / (0.5 if kind != "final" else 1.2))
    sub = np.sin(TAU * 27.5 * t) * np.exp(-t / 1.2) * 0.9
    top = bp(rng.standard_normal(n), 300, 2500, 2) * np.exp(-t / 0.18) * 0.5
    x = boom * 1.0 + crash * 0.28 + sub * 0.6 + top
    if kind == "small":
        x *= 0.6
    return sat(x, 1.3) * 0.8 * strength


def v_downlift(dur=1.0, strength=1.0):
    rng = np.random.default_rng(700)
    n = int(dur * SR * 2)
    t = np.arange(n) / SR
    p = t / (dur * 2)
    noise = rng.standard_normal(n)
    x = np.zeros(n)
    centres = np.geomspace(8000, 300, 12)
    for i, c in enumerate(centres):
        band = bp(noise, c * 0.7, c * 1.4, 2)
        w = np.exp(-((p - i / (len(centres) - 1)) ** 2) / 0.03)
        x += band * w
    return x * np.exp(-t / (dur * 0.9)) * 0.5 * strength


def v_tick(strength=1.0):
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    return np.sin(TAU * 3200 * t) * np.exp(-t / 0.004) * 0.25 * strength


def v_reverse_crash(dur=2.0, strength=1.0):
    rng = np.random.default_rng(800)
    n = int(dur * SR)
    t = np.arange(n) / SR
    c = hp(rng.standard_normal(n), 3500) * np.exp(-t / 0.5)
    return c[::-1] * 0.35 * strength


# ------------------------------------------------------------------ mix
def render_audio(path_wav, quiet=False):
    ev = build_events()
    N = int(DUR * SR)
    music = np.zeros((2, N))      # tonal / drums (sidechained)
    fx = np.zeros((2, N))         # risers etc, not sidechained
    pads = np.zeros((2, N))       # pads (heavily sidechained)
    drums = np.zeros((2, N))      # drums: dry, no sidechain
    bells = np.zeros((2, N))      # bells: reverb send

    # drone under the whole VOID + breakdown: A1 + E2, fades
    place(pads, v_sub(33, 8.0, 0.9, 2.0), 0.0, 1.0)
    place(pads, v_sub(40, 8.0, 0.5, 3.0), 0.0, 1.0)
    place(pads, v_sub(33, 8.0, 0.8, 1.0), bar_t(17), 1.0)
    place(pads, v_sub(33, 4.0, 0.7, 0.6), bar_t(29), 1.0)

    for t, s, x in ev["kick"]:
        place(drums, v_kick(s, x if isinstance(x, str) else "drop"), t, 1.0)
    for i, (t, s, x) in enumerate(ev["clap"]):
        place(drums, v_clap(s, i % 4), t, 0.8)
    for i, (t, s, x) in enumerate(ev["snare"]):
        place(drums, v_snare(s, i % 8), t, 0.7)
    for i, (t, s, x) in enumerate(ev["hat"]):
        place(drums, v_hat(s, False, i % 16), t, 0.55, pan=0.25 if i % 2 else -0.25)
    for i, (t, s, x) in enumerate(ev["ohat"]):
        place(drums, v_hat(s, True, i % 8), t, 0.5)
    for i, (t, s, x) in enumerate(ev["tick"]):
        place(drums, v_tick(s), t, 0.6, pan=0.5 if i % 2 else -0.5)

    # bass
    for t, s, midi in ev["bass"]:
        place(music, v_bass(midi, s, 0.2), t, 0.9)

    # arps with pseudo-stereo ping-pong
    for i, (t, s, midi) in enumerate(ev["arp"]):
        place(music, v_arp(midi, s), t, 0.55, pan=0.45 if i % 2 else -0.45)

    for t, s, ci in ev["stab"]:
        place(music, v_stab(ci, s), t, 0.6)

    # pads
    for t, s, ci in ev["pad"]:
        chord = RES_CHORD if ci == "res" else CHORDS[int(ci) % 4]
        dur = 6.0 if ci == "res" else BAR + 0.7
        place(pads, v_pad(chord, s, dur, bright=0.7 if ci == "res" else 0.4), t, 1.0)

    for t, s, midi in ev["bell"]:
        place(bells, v_bell(midi, s), t, 1.0, pan=np.sin(t * 3.1) * 0.5)

    # fx
    for t, s, dur in ev["riser"]:
        place(fx, v_riser(dur, s), t, 1.0)
    for i, (t, s, x) in enumerate(ev["whoosh"]):
        place(fx, v_whoosh(1.1, s, True, i), t - 0.55, 1.0)
    for t, s, kind in ev["impact"]:
        place(fx, v_impact(kind, s), t, 1.0)
    for t, s, dur in ev["downlift"]:
        place(fx, v_downlift(dur, s), t, 1.0)
    for t, s, dur in ev["vacuum"]:
        place(fx, v_reverse_crash(1.4, 0.8), t - 1.4 + dur, 1.0)

    # ---- sidechain: duck music + pads under kicks, strong in drops
    duck = np.ones(N)
    for t, s, kind in ev["kick"]:
        if kind == "heart":
            continue
        i = int(t * SR)
        n = int(0.28 * SR)
        k = np.arange(min(n, N - i)) / n
        depth = 0.72 if kind in ("drop", "drop2", "final") else 0.5
        duck[i:i + len(k)] *= 1 - depth * (1 - k ** 1.6)
    music *= duck
    pads *= (0.5 + 0.5 * duck)

    # ---- vacuum: duck everything (except fx) briefly before drops
    gate = np.ones(N)
    for t, s, dur in ev["vacuum"]:
        i0, i1 = int(t * SR), int((t + dur) * SR)
        gate[i0:i1] = 0.0
        # tiny fade in/out so there are no clicks
        f = int(0.004 * SR)
        gate[max(0, i0 - f):i0] = np.linspace(1, 0, f)[:i0 - max(0, i0 - f)]
        gate[i1:i1 + f] = np.linspace(0, 1, f)[:max(0, min(f, N - i1))]
    music *= gate
    drums *= gate
    pads *= np.maximum(gate, 0.15)

    # ---- reverb sends
    irA = reverb_ir(3.4, 2.2, seed=5, damp=7000)
    irB = reverb_ir(1.2, 0.5, seed=9, damp=6000)
    rv_bells = reverb(bells, irA, 0.9)
    rv_pads = reverb(pads, irA, 0.45)
    rv_music = reverb(music, irB, 0.12)
    rv_fx = reverb(fx, irA, 0.25)
    # drums get a small room only
    rv_drums = reverb(drums, irB, 0.08)

    mix = (music * 0.9 + pads * 0.9 + drums * 1.0 + bells * 0.9 + fx * 0.85
           + rv_bells + rv_pads + rv_music + rv_fx + rv_drums)

    # ---- section loudness map: ambient parts sit lower, drops full
    tt = np.arange(N) / SR
    gpts = [(0, .72), (6, .85), (15.7, 1.0), (16, 1.0), (31.9, 1.0), (33, .66), (38, .8), (39.7, 1.0), (40, 1.0), (60, 1.0)]
    sec = np.interp(tt, [p[0] for p in gpts], [p[1] for p in gpts])
    mix *= sec
    # ---- master: bus compression-ish (soft clip), high-pass 25, tilt EQ, limiter, fades
    mix[0] = hp(mix[0], 25, 2)
    mix[1] = hp(mix[1], 25, 2)
    mix = sat(mix * 0.95, 1.35)
    pk = np.max(np.abs(mix))
    mix = mix / pk * 0.62
    fade_in = np.minimum(1, np.arange(N) / (0.5 * SR))
    fade_out = np.minimum(1, (N - np.arange(N)) / (2.2 * SR)) ** 1.5
    mix *= fade_in * fade_out
    pcm = (np.clip(mix.T, -1, 1) * 32767).astype(np.int16)
    wavfile.write(path_wav, SR, pcm)
    if not quiet:
        rms = np.sqrt((mix ** 2).mean())
        print(f"audio {DUR:.1f}s  peak {np.max(np.abs(mix)):.2f}  rms {rms:.3f}")
    return ev


if __name__ == "__main__":
    import sys
    render_audio(sys.argv[1] if len(sys.argv) > 1 else "score.wav")
