"""Point-cloud shapes. Each returns an (n, 3) float32 array in design px, centred on (0,0), y down.

Every shape is a visual noun for a game-theory idea, built only from the site's grammar:
discs, rings, hairlines. Area carries value.
"""
import numpy as np

TAU = 2 * np.pi


def _r(seed):
    return np.random.default_rng(seed)


def seg(p0, p1, n, rng, jit=1.2):
    t = rng.random(n)[:, None]
    p0, p1 = np.asarray(p0, np.float32), np.asarray(p1, np.float32)
    return p0 + (p1 - p0) * t + (rng.random((n, 2)) - .5) * jit


def disc(c, r, n, rng):
    a = rng.random(n) * TAU
    rr = r * np.sqrt(rng.random(n))
    return np.stack([c[0] + rr * np.cos(a), c[1] + rr * np.sin(a)], 1)


def ring(c, r, n, rng, jit=1.5, a0=0.0, a1=TAU):
    a = a0 + (a1 - a0) * rng.random(n)
    rr = r + (rng.random(n) - .5) * jit
    return np.stack([c[0] + rr * np.cos(a), c[1] + rr * np.sin(a)], 1)


def poly_edges(pts, n, rng, closed=True):
    pts = np.asarray(pts, np.float32)
    k = len(pts)
    edges = [(pts[i], pts[(i + 1) % k]) for i in range(k if closed else k - 1)]
    lens = np.array([np.linalg.norm(b - a) for a, b in edges])
    cnt = np.maximum(1, (n * lens / lens.sum()).astype(int))
    out = [seg(a, b, c, rng) for (a, b), c in zip(edges, cnt)]
    return np.concatenate(out, 0)


def pack(parts, n, rng, z=0.0, zspread=0.0):
    """concatenate parts [(pts, weight)] to exactly n points, with optional z."""
    ws = np.array([w for _, w in parts], np.float64)
    cnt = np.maximum(1, np.round(n * ws / ws.sum()).astype(int))
    cnt[-1] += n - cnt.sum()
    out = []
    for (p, _), c in zip(parts, cnt):
        if c <= 0:
            continue
        idx = rng.integers(0, len(p), c)
        out.append(np.asarray(p, np.float32)[idx])
    P = np.concatenate(out, 0)[:n]
    if len(P) < n:
        P = np.concatenate([P, P[rng.integers(0, len(P), n - len(P))]], 0)
    zz = np.full(n, z, np.float32) + (rng.random(n).astype(np.float32) - .5) * zspread
    return np.concatenate([P[:, :2].astype(np.float32), zz[:, None]], 1)


def gen(fn, n, seed=1):
    return fn(n, _r(seed))


# ---------------------------------------------------------------- shapes
def triangle_mark(n, rng, r=230):
    """the brand mark: downward triangle, echoes, three opened rings."""
    tri = lambda s: [(0, s * r * .62), (-s * r * .535, -s * r * .31), (s * r * .535, -s * r * .31)]
    parts = [(poly_edges(tri(1.0), 4000, rng), 3), (poly_edges(tri(.62), 2500, rng), 1.2), (poly_edges(tri(.3), 1500, rng), .6),
             (disc((0, -r * .06), r * .5, 2500, rng), 0.8)]
    for k, (rad, gap) in enumerate([(r * 1.05, .9), (r * 1.45, 1.1), (r * 1.9, 1.3)]):
        parts.append((ring((0, 0), rad, 3500, rng, 1.6, gap, TAU + gap - .6), 2.4 - .4 * k))
    return pack(parts, n, rng, 0, 18)


def rings3d(n, rng, count=9, r0=120, dr=70, dz=140, tilt=0.0):
    parts = []
    for k in range(count):
        p = ring((0, 0), r0 + dr * k, 2500, rng, 2.0)
        parts.append((np.concatenate([p, np.full((len(p), 1), (k - count / 2) * dz)], 1), 1.0 + .15 * k))
    ws = np.array([w for _, w in parts], np.float64)
    cnt = np.maximum(1, np.round(n * ws / ws.sum()).astype(int)); cnt[-1] += n - cnt.sum()
    out = [p[rng.integers(0, len(p), c)] for (p, _), c in zip(parts, cnt)]
    return np.concatenate(out, 0)[:n].astype(np.float32)


def sphere(n, rng, r=380):
    i = np.arange(n) + .5
    phi = np.arccos(1 - 2 * i / n)
    th = np.pi * (1 + 5 ** .5) * i
    return np.stack([r * np.cos(th) * np.sin(phi), r * np.sin(th) * np.sin(phi), r * np.cos(phi)], 1).astype(np.float32)


def torus(n, rng, R=330, r=120):
    u, v = rng.random(n) * TAU, rng.random(n) * TAU
    return np.stack([(R + r * np.cos(v)) * np.cos(u), (R + r * np.cos(v)) * np.sin(u), r * np.sin(v)], 1).astype(np.float32)


def saddle(n, rng, size=360, h=330):
    """the minimax saddle: z = x^2 - y^2 surface sampled on a jittered grid, plus the equilibrium point."""
    x, y = (rng.random(n) * 2 - 1), (rng.random(n) * 2 - 1)
    z = (x ** 2 - y ** 2)
    P = np.stack([x * size * 1.25, z * h * .62, y * size * 1.25], 1)
    k = n // 40
    P[:k] = np.stack([rng.standard_normal(k) * 6, rng.standard_normal(k) * 6, rng.standard_normal(k) * 6], 1)
    return P.astype(np.float32)


def galaxy(n, rng, R=620, arms=3, twist=5.0):
    r = R * rng.random(n) ** .65
    a = rng.integers(0, arms, n) * TAU / arms + r / R * twist + (rng.standard_normal(n) * .18) * (1.1 - r / R)
    y = rng.standard_normal(n) * 26 * (1 - r / R * .7)
    return np.stack([r * np.cos(a), y, r * np.sin(a)], 1).astype(np.float32)


def helix(n, rng, R=210, H=700, turns=4.5):
    t = rng.random(n)
    k = rng.integers(0, 2, n)
    a = t * turns * TAU + k * np.pi
    return np.stack([R * np.cos(a), (t - .5) * H, R * np.sin(a)], 1).astype(np.float32) + rng.standard_normal((n, 3)).astype(np.float32) * 3


def matrix2x2(n, rng, cell=210, discs=(.9, .4, 1.0, .6), vals=None, show=(1, 1, 1, 1), rings_top=True, dominant=None):
    """the site's payoff table: dotted hairlines, discs (area = payoff), rings for the other player."""
    parts = []
    s = cell
    for i in range(3):
        parts.append((seg((-s + i * s, -s), (-s + i * s, s), 400, rng, .8), 0.4))
        parts.append((seg((-s, -s + i * s), (s, -s + i * s), 400, rng, .8), 0.4))
    for k, (dx, dy) in enumerate([(-s / 2, -s / 2), (s / 2, -s / 2), (-s / 2, s / 2), (s / 2, s / 2)]):
        if show[k]:
            r = s * .38 * np.sqrt(discs[k])
            parts.append((disc((dx, dy), r, 1800, rng), 1.6 * discs[k] + .3))
    if rings_top:
        for dx in (-s / 2, s / 2):
            parts.append((ring((dx, -s - 46), 16, 260, rng, 1.4), .35))
    return pack(parts, n, rng, 0, 4)


def treeg(n, rng, depth=4, W=900, H=640):
    parts = []

    def rec(x, y, w, d):
        if d == 0:
            parts.append((disc((x, y), 14, 350, rng), 0.35))
            return
        for s in (-1, 1):
            nx, ny = x + s * w / 2, y + H / depth
            parts.append((seg((x, y), (nx, ny), 260, rng, 1.2), 0.5))
            rec(nx, ny, w / 2.05, d - 1)
    parts.append((disc((0, -H / 2), 16, 300, rng), .35))
    rec(0, -H / 2, W / 2.0, depth)
    return pack(parts, n, rng, 0, 6)


def bell(n, rng, W=900, H=420, fill=True):
    x = (rng.random(n) * 2 - 1)
    y = np.exp(-(x * 2.6) ** 2 / 2)
    if fill:
        yy = rng.random(n) * y
        return np.stack([x * W / 2, H / 2 - yy * H, np.zeros(n)], 1).astype(np.float32)
    return np.stack([x * W / 2, H / 2 - y * H, np.zeros(n)], 1).astype(np.float32)


def scurve(n, rng, W=720):
    """prospect theory value function: concave gains, convex steeper losses."""
    x = (rng.random(n) * 2 - 1)
    y = np.where(x >= 0, np.abs(x) ** .6, -2.25 * np.abs(x) ** .6) * W * .26
    curve = np.stack([x * W / 2, -y, np.zeros(n)], 1)
    ax = np.concatenate([seg((-W / 2, 0), (W / 2, 0), n // 3, rng, .8), seg((0, -W * .42), (0, W * .42), n // 3, rng, .8)], 0)
    ax = np.concatenate([ax, np.zeros((len(ax), 1))], 1)
    return pack([(curve + rng.standard_normal((n, 3)) * 1.1, 3), (ax, 1)], n, rng)


def bars(n, rng, k=7, W=860, H=520):
    parts = []
    for i in range(k):
        h = H * (.25 + .75 * ((i * 37) % 11) / 11)
        x = -W / 2 + (i + .5) * W / k
        pts = np.stack([x + (rng.random(900) - .5) * W / k * .55, H / 2 - rng.random(900) * h], 1)
        parts.append((pts, 1.0))
    return pack(parts, n, rng, 0, 4)


def network(n, rng, nodes=14, R=360):
    a = rng.random(nodes) * TAU
    rr = R * np.sqrt(rng.random(nodes))
    P = np.stack([rr * np.cos(a) * 1.4, rr * np.sin(a)], 1)
    parts = [(disc(P[i], 12 + 6 * (i % 3), 260, rng), .6) for i in range(nodes)]
    for i in range(nodes):
        for j in range(i + 1, nodes):
            if np.linalg.norm(P[i] - P[j]) < R * .85:
                parts.append((seg(P[i], P[j], 160, rng, .8), .22))
    return pack(parts, n, rng, 0, 40)


def split(n, rng, gap=210):
    """ultimatum: a pie split in two; the rejection scatters it."""
    a = disc((-gap, 0), 190, 3000, rng)
    b = disc((gap, 0), 110, 2000, rng)
    return pack([(a, 3), (b, 2), (ring((-gap, 0), 232, 800, rng), .6), (ring((gap, 0), 150, 600, rng), .5)], n, rng, 0, 10)


def collide(n, rng):
    """chicken: two arrows head on."""
    parts = []
    for s in (-1, 1):
        parts.append((seg((s * 520, 0), (s * 120, 0), 1500, rng, 3), 1.2))
        parts.append((poly_edges([(s * 120, 0), (s * 230, -80), (s * 230, 80)], 1200, rng), 1.0))
        parts.append((disc((s * 560, 0), 56, 1200, rng), .9))
    parts.append((ring((0, 0), 90, 700, rng), .6))
    return pack(parts, n, rng, 0, 12)


def coin(n, rng):
    return pack([(ring((0, 0), 300, 3500, rng, 3), 2), (ring((0, 0), 262, 2200, rng, 2), 1), (disc((0, 0), 44, 900, rng), .7),
                 (seg((-250, 0), (250, 0), 1000, rng, 2), .5)], n, rng, 0, 80)


def commons(n, rng):
    """tragedy of the commons: a shared disc being eaten by many small bites."""
    a = disc((0, 0), 330, 8000, rng)
    keep = np.hypot(a[:, 0], a[:, 1]) > 0
    for k in range(9):
        ang = k * 0.7
        c = (330 * np.cos(ang), 330 * np.sin(ang))
        keep &= np.hypot(a[:, 0] - c[0], a[:, 1] - c[1]) > 70 + 9 * k
    return pack([(a[keep], 4), (ring((0, 0), 360, 1200, rng), 1)], n, rng, 0, 20)


def stag(n, rng):
    """stag hunt: one big disc needs two small ones to meet."""
    return pack([(disc((0, -20), 170, 3000, rng), 3), (disc((-330, 0), 52, 800, rng), 1), (disc((330, 0), 52, 800, rng), 1),
                 (seg((-280, 0), (-160, -14), 300, rng), .3), (seg((280, 0), (160, -14), 300, rng), .3)], n, rng, 0, 12)


def staircase(n, rng):
    parts = []
    for i in range(8):
        x = -420 + i * 120
        h = 60 + i * 52
        parts.append((np.stack([x + rng.random(600) * 96, 300 - rng.random(600) * h], 1), 1))
    return pack(parts, n, rng, 0, 6)


def triangle_stack(n, rng):
    parts = []
    for k in range(7):
        s = 1 - k * .13
        r = 300 * s
        parts.append((poly_edges([(0, r * .62), (-r * .535, -r * .31), (r * .535, -r * .31)], 700, rng), 1))
    return pack(parts, n, rng, 0, 30)


def lattice(n, rng, k=9, step=96):
    g = np.array([(i, j) for i in range(k) for j in range(k)], np.float32)
    g = (g - (k - 1) / 2) * step
    pts = g[rng.integers(0, len(g), n)] + rng.standard_normal((n, 2)).astype(np.float32) * 4
    return np.concatenate([pts, np.zeros((n, 1), np.float32)], 1)


def voronoi_like(n, rng, k=12, R=380):
    c = np.stack([(rng.random(k) * 2 - 1) * R * 1.3, (rng.random(k) * 2 - 1) * R], 1)
    pts = np.stack([(rng.random(n * 2) * 2 - 1) * R * 1.4, (rng.random(n * 2) * 2 - 1) * R], 1)
    d = np.linalg.norm(pts[:, None, :] - c[None], axis=2)
    s = np.sort(d, 1)
    edge = (s[:, 1] - s[:, 0]) < 6
    pts = pts[edge]
    keep = np.concatenate([pts, c], 0)
    return pack([(keep, 3), (np.concatenate([disc(ci, 9, 80, rng) for ci in c]), 1)], n, rng, 0, 6)


def shape_for(name, n, rng):
    return {
        "mark": triangle_mark, "rings": rings3d, "sphere": sphere, "torus": torus, "saddle": saddle, "galaxy": galaxy,
        "helix": helix, "matrix": matrix2x2, "tree": treeg, "bell": bell, "s": scurve, "bars": bars, "net": network,
        "split": split, "collide": collide, "coin": coin, "commons": commons, "stag": stag, "stairs": staircase,
        "tris": triangle_stack, "brand": brand_mark_pts, "lattice": lattice, "voronoi": voronoi_like,
    }[name](n, rng)


def brand_mark_pts(n, rng, r=120.0, ring_count=5, phase=0.0):
    """point cloud of the vector hero mark in tg_base.brand_mark: downward triangle, echoes, opened rings."""
    tri = lambda s: [(s * r * np.cos(np.pi / 2 + k * TAU / 3), s * r * np.sin(np.pi / 2 + k * TAU / 3)) for k in range(3)]
    parts = [(poly_edges(tri(.9), 4200, rng), 4.0), (disc((0, -r * .1), r * .42, 1800, rng), .8)]
    for e in range(1, 6):
        parts.append((poly_edges(tri(.9 * (1 - .13 * e)), 900, rng), .5))
    gaps = [(.9, 0.0), (1.1, 1.2), (1.3, 2.4), (1.5, 3.4), (1.7, 4.4)]
    for k in range(ring_count):
        g, ph = gaps[k]
        rad = r * (1.35 + .52 * k)
        sweep = TAU - g * .55
        parts.append((ring((0, 0), rad, 4200, rng, 1.8, ph + phase, ph + phase + sweep), 3.0 - .35 * k))
    return pack(parts, n, rng, 0, 14)


# ---------------------------------------------------------------- Woodland Chess shapes
def halo(n, rng, radii=(300, 372, 452, 540), dashes=(0, 90, 60, 0)):
    parts = []
    for k, r in enumerate(radii):
        a = rng.random(6000) * TAU
        if dashes[k]:
            keep = (a * dashes[k] / TAU) % 1.0 < .62
            a = a[keep]
        rr = r + (rng.random(len(a)) - .5) * 1.8
        parts.append((np.stack([rr * np.cos(a), rr * np.sin(a)], 1), 1.0 - .12 * k))
    return pack(parts, n, rng, 0, 10)


def chip(n, rng, s=210):
    parts = [(poly_edges([(-s, -s), (s, -s), (s, s), (-s, s)], 3000, rng), 2), (poly_edges([(-s * .5, -s * .5), (s * .5, -s * .5), (s * .5, s * .5), (-s * .5, s * .5)], 2000, rng), 1.4),
             (disc((0, 0), s * .16, 800, rng), .6)]
    for k in range(-3, 4):
        x = k * s * .28
        for sg in (-1, 1):
            parts.append((seg((x, sg * s), (x, sg * (s + 70)), 220, rng, 1.0), .3))
            parts.append((seg((sg * s, x), (sg * (s + 70), x), 220, rng, 1.0), .3))
    return pack(parts, n, rng, 0, 16)


def globe(n, rng, R=300):
    parts = []
    for lat in np.linspace(-70, 70, 7):
        a = rng.random(900) * TAU
        r = R * np.cos(np.radians(lat))
        parts.append((np.stack([r * np.cos(a), R * np.sin(np.radians(lat)) + 0 * a, R * np.sin(a) * np.cos(np.radians(lat)) * 0 + r * np.sin(a)], 1), 1.0))
    for lon in np.linspace(0, np.pi, 8, endpoint=False):
        a = rng.random(900) * TAU
        x = R * np.cos(a) * np.cos(lon)
        z = R * np.cos(a) * np.sin(lon)
        parts.append((np.stack([x, R * np.sin(a), z], 1), 1.0))
    ws = np.array([w for _, w in parts], np.float64)
    cnt = np.maximum(1, np.round(n * ws / ws.sum()).astype(int)); cnt[-1] += n - cnt.sum()
    out = [p[rng.integers(0, len(p), c)] for (p, _), c in zip(parts, cnt)]
    return np.concatenate(out, 0)[:n].astype(np.float32)


def board_flat(n, rng, cell=120, dark_density=.25):
    """8x8 board as a dot lattice: light squares dense, dark squares sparse, plus hairline edges (plane y=0, x/z)."""
    pts = []
    for i in range(8):
        for j in range(8):
            light = (i + j) % 2 == 0
            m = 520 if light else 120
            x = (i - 3.5) * cell + (rng.random(m) - .5) * cell * .92
            z = (j - 3.5) * cell + (rng.random(m) - .5) * cell * .92
            pts.append(np.stack([x, np.zeros(m), z], 1))
    for k in range(9):
        o = (k - 4) * cell
        t = rng.random(400) * 8 * cell - 4 * cell
        pts.append(np.stack([o + 0 * t, np.zeros(400), t], 1))
        pts.append(np.stack([t, np.zeros(400), o + 0 * t], 1))
    P = np.concatenate(pts, 0)
    idx = rng.integers(0, len(P), n)
    return P[idx].astype(np.float32)
