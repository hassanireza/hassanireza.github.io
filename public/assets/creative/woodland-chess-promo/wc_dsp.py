"""DSP helpers and voices shared by the Woodland Chess score."""

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


