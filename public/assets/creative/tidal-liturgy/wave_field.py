"""Raking-light wave render, ported from the one-slit pipeline (center source only).

Pipeline (same order as the reference renderer):
  1. 5-point Laplacian + damped leapfrog solve, 4 steps per frame
  2. Ricker pulses injected at the centre cell (+4 neighbours), looped schedule,
     3 warm-up cycles so the 120-frame loop is a near periodic steady state
  3. distance display gain + height compression   (display only, never fed back)
  4. surface normals from the height gradient, low raking light
  5. cast-shadow visibility from 12 height samples toward the light
  6. two fixed grain samples -> threshold: grains light up where crests catch light

Usage:
    python wave_field.py --save wave.mp4            # 1500x500, 24 fps, 5 s loop
    python wave_field.py --save wave.mp4 --scale 4  # 3000x1000 (smoother normals)
    python wave_field.py --still frame.png          # single frame
Requires: numpy, scipy, pillow (stills), ffmpeg on PATH (video).
"""
import argparse
import subprocess
from dataclasses import dataclass

import numpy as np
from scipy.ndimage import map_coordinates, zoom


@dataclass(frozen=True)
class Config:
    nx: int = 750                 # simulation grid
    ny: int = 250
    scale: int = 2                # render pixels per sim cell
    fps: int = 24
    frames: int = 120             # loop length
    sub: int = 4                  # solver steps per frame
    warm: int = 3                 # warm-up cycles
    c2: float = 0.25              # squared Courant number
    margin: int = 26              # absorbing border (cells)
    absorb: float = 0.12          # peak damping at the outer edge
    power: int = 2                # damping grading (3 = PML-like, gentler entry)
    offsets: tuple = (0, 37, 71, 109)  # per-source time offsets in steps (phase)
    wavelength: float = 11.0      # cells
    pulse_amp: float = 0.3
    sources: int = 1              # 1 = centre only; 2-4 = extra phase-shifted sources
    mur: bool = False             # first-order Mur absorbing edge on top of the sponge
    seed: int = 7102026
    # light direction (azimuth, elevation in radians)
    az: float = -0.5
    el: float = 0.3
    grain_seed: int = 20261104


# ------------------------------------------------------------------ solver
def ricker(tau, f0):
    y = (np.pi * f0 * tau) ** 2
    return (1 - 2 * y) * np.exp(-y)


def source_schedule(cfg):
    """Uneven pulse times (in steps) and three amplitude levels, centre only."""
    rng = np.random.default_rng(cfg.seed)
    gaps = np.array([1, .8, 1.9, .9, 1.3, .7])
    total = cfg.frames * cfg.sub
    times = np.cumsum(np.r_[0, gaps[:-1]]) / gaps.sum() * total
    amps = np.where((r := rng.random(len(gaps))) < .25, 1.7, np.where(r < .65, 1.0, .6))
    return times, amps


def source_points(cfg):
    """(x, y, time offset in steps). The first source is always the centre."""
    nx, ny = cfg.nx, cfg.ny
    layout = [(.50, .50), (.30, .35), (.70, .68), (.42, .72)]
    n = max(1, min(4, cfg.sources))
    offs = (tuple(cfg.offsets) + (0, 0, 0, 0))[:4]
    return [(int(nx * fx), int(ny * fy), offs[i]) for i, (fx, fy) in enumerate(layout[:n])]


def solve(cfg):
    nx, ny = cfg.nx, cfg.ny
    pts = source_points(cfg)
    k_mur = (np.sqrt(cfg.c2) - 1) / (np.sqrt(cfg.c2) + 1)
    f0 = 0.5 / cfg.wavelength
    total = cfg.frames * cfg.sub
    times, amps = source_schedule(cfg)

    yy, xx = np.mgrid[0:ny, 0:nx]
    m = np.minimum.reduce([xx, yy, nx - 1 - xx, ny - 1 - yy])
    damp = np.where(m < cfg.margin, cfg.absorb * (1 - m / cfg.margin) ** cfg.power, 0.0).astype(np.float32)
    inv = 1.0 / (1.0 + damp)

    a = np.zeros((ny, nx), np.float32)
    b = np.zeros_like(a)
    out = np.zeros((cfg.frames, ny, nx), np.float32)
    s = 0
    for cycle in range(cfg.warm + 1):
        for fr in range(cfg.frames):
            if cycle == cfg.warm:
                out[fr] = a
            for _ in range(cfg.sub):
                p = np.pad(a, 1, mode="edge")
                lap = p[1:-1, :-2] + p[1:-1, 2:] + p[:-2, 1:-1] + p[2:, 1:-1] - 4 * a
                nxt = (2 * a - b * (1 - damp) + cfg.c2 * lap) * inv
                if cfg.mur:
                    nxt[:, 0] = a[:, 1] + k_mur * (nxt[:, 1] - a[:, 0])
                    nxt[:, -1] = a[:, -2] + k_mur * (nxt[:, -2] - a[:, -1])
                    nxt[0, :] = a[1, :] + k_mur * (nxt[1, :] - a[0, :])
                    nxt[-1, :] = a[-2, :] + k_mur * (nxt[-2, :] - a[-1, :])
                b, a = a, nxt
                for sx, sy, toff in pts:
                    for t0, w in zip(times, amps):
                        d = ((s % total - t0 - toff) + total * 1.5) % total - total / 2
                        if abs(d) < 46:
                            q = ricker(d, f0) * w * cfg.pulse_amp
                            a[sy, sx] += q
                            a[sy, sx + 1] += q * .5
                            a[sy, sx - 1] += q * .5
                            a[sy + 1, sx] += q * .5
                            a[sy - 1, sx] += q * .5
                s += 1
    return out


# ---------------------------------------------------------------- rendering
def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


class Renderer:
    def __init__(self, cfg):
        self.cfg = cfg
        S = cfg.scale
        self.H, self.W = cfg.ny * S, cfg.nx * S
        yy, xx = np.mgrid[0:cfg.ny, 0:cfg.nx]
        r = np.min([np.hypot(xx - sx, yy - sy) for sx, sy, _ in source_points(cfg)], axis=0)
        self.gain = np.minimum(26, 7.5 * np.sqrt(1 + r / 5)).astype(np.float32)

        az, el = cfg.az, cfg.el
        L = np.array([np.cos(az) * np.cos(el), np.sin(az) * np.cos(el), np.sin(el)])
        self.L = L
        # fixed grain: two stationary samples of one gaussian texture
        rng = np.random.default_rng(cfg.grain_seed)
        tex = np.clip(128 + rng.standard_normal((540, 540)) * 42, 0, 255) / 255
        py, px = np.mgrid[0:self.H, 0:self.W].astype(np.float32)
        a = (cfg.nx * S / 540.0, cfg.ny * S / 540.0)
        u, v = (px + .5) / self.W, (py + .5) / self.H
        def samp(su, sv):
            return map_coordinates(tex, [(sv * a[1] * 540) - .5, (su * a[0] * 540) - .5],
                                   order=1, mode="grid-wrap")
        g = np.clip((samp(u, v) - .22) / .56, 0, 1)
        g1 = np.clip((samp(u * 1.87 + .37 / a[0], v * 1.87 + .37 / a[1]) - .22) / .56, 0, 1)
        self.t0 = (g * .6 + g1 * .4).astype(np.float32)
        self.coords = np.mgrid[0:self.H, 0:self.W].astype(np.float32)

    def frame(self, u):
        c, S, L = self.cfg, self.cfg.scale, self.L
        z = u * self.gain
        z = z / (1 + np.abs(z) * .22)                      # range compression
        h = zoom(z, S, order=3, mode="nearest")            # smooth sub-cell height
        h = h[:self.H, :self.W].astype(np.float32)

        # normals: central differences over one sim cell (S pixels)
        p = np.pad(h, S, mode="edge")
        dx = p[S:-S, 2 * S:] - p[S:-S, :-2 * S]
        dy = p[2 * S:, S:-S] - p[:-2 * S, S:-S]
        nx_, ny_, nz_ = -dx * .5, -dy * .5, np.ones_like(h)
        inv = 1 / np.sqrt(nx_**2 + ny_**2 + nz_**2)
        ndl = np.maximum(0, (nx_ * L[0] + ny_ * L[1] + nz_ * L[2]) * inv)

        # cast shadows: 12 samples toward the light, spacing grows
        st = L[:2] / np.linalg.norm(L[:2])
        tn = L[2] / np.linalg.norm(L[:2])
        Y, X = self.coords
        vis = np.ones_like(h)
        d = 2.0
        for _ in range(12):
            zz = map_coordinates(h, [Y + st[1] * d * S, X + st[0] * d * S], order=1, mode="nearest")
            over = zz - (h + d * tn)
            vis = np.minimum(vis, 1 - np.clip(over / 1.2 + .5, 0, 1))
            d = d * 1.28 + .8

        r = ndl / L[2] * vis
        up, dn = np.maximum(0, r - 1), np.maximum(0, 1 - r)
        cat = smoothstep(self.t0 - .06, self.t0 + .06, up * .62) * smoothstep(.02, .1, up)

        bg = np.array([.0431, .0431, .0471], np.float32)
        ice = np.array([.46, .49, .64], np.float32)
        col = bg * (1 - .5 * smoothstep(0, 1, dn))[..., None]
        col = col + ice * (.17 * smoothstep(0, 1.3, up))[..., None]
        col = col * (1 - cat[..., None]) + np.array([.93, .94, .97], np.float32) * cat[..., None]
        # image row 0 = top; solver y points up, so flip
        return (np.clip(col[::-1], 0, 1) * 255 + .5).astype(np.uint8)


# ------------------------------------------------------------------- driver
def preview(fields, rend, cfg):
    import matplotlib.pyplot as plt
    from matplotlib.animation import FuncAnimation

    print("pre-rendering preview frames...")
    cache = [rend.frame(f) for f in fields]
    fig = plt.figure(figsize=(rend.W / 100, rend.H / 100), facecolor="black")
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_axis_off()
    im = ax.imshow(cache[0], interpolation="nearest")

    def update(i):
        im.set_data(cache[i % len(cache)])
        return [im]

    anim = FuncAnimation(fig, update, frames=len(cache), interval=1000 / cfg.fps,
                         blit=True, repeat=True)
    plt.show()
    return anim


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--save", help="output .mp4")
    ap.add_argument("--still", help="output .png of one frame")
    ap.add_argument("--scale", type=int, default=2)
    ap.add_argument("--frame", type=int, default=60)
    ap.add_argument("--sources", type=int, default=1, help="1-4 phase-shifted sources")
    ap.add_argument("--offsets", default="0,37,71,109", help="time offsets (steps) per source, e.g. 0,20,55")
    ap.add_argument("--pml", action="store_true", help="wide graded absorbing margin (PML-like)")
    ap.add_argument("--mur", action="store_true", help="Mur absorbing boundary")
    ap.add_argument("--preview", action="store_true", help="live preview window")
    args = ap.parse_args()
    extra = dict(margin=48, absorb=0.2, power=3) if args.pml else {}
    cfg = Config(scale=args.scale, sources=args.sources, mur=args.mur,
                 offsets=tuple(int(v) for v in args.offsets.split(",")), **extra)

    print("solving...")
    fields = solve(cfg)
    rend = Renderer(cfg)

    if args.preview or not (args.save or args.still):
        preview(fields, rend, cfg)
    if args.still:
        from PIL import Image
        Image.fromarray(rend.frame(fields[args.frame])).save(args.still)
        print("saved", args.still)
    if args.save:
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
               "-s", f"{rend.W}x{rend.H}", "-r", str(cfg.fps), "-i", "-",
               "-c:v", "libx264", "-preset", "slow", "-crf", "12", "-pix_fmt", "yuv420p",
               "-movflags", "+faststart", args.save]
        pipe = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        for i in range(cfg.frames):
            pipe.stdin.write(rend.frame(fields[i]).tobytes())
        pipe.stdin.close()
        pipe.wait()
        print("saved", args.save)


if __name__ == "__main__":
    main()