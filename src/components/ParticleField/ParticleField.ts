export interface ParticleFieldOptions {
  particleCount?: number;
  fontSizeFactor?: number;
  label?: string;
  colorText?: string;
  colorAccent?: string;
  colorBgFade?: string;
}

interface Point {
  x: number;
  y: number;
}

const MAX_DEVICE_PIXEL_RATIO = 2;

const MOBILE_BREAKPOINT = 640;

class Particle {
  x = 0;
  y = 0;
  tx = 0;
  ty = 0;
  vx = 0;
  vy = 0;
  size = 0;
  baseAlpha = 0;
  alpha = 0;
  homed = false;
  delay = 0;
  color = "";

  private readonly index: number;
  private readonly width: number;
  private readonly height: number;
  private readonly colorText: string;
  private readonly colorAccent: string;
  private readonly sizeScale: number;

  constructor(
    index: number,
    width: number,
    height: number,
    colorText: string,
    colorAccent: string,
    sizeScale: number,
  ) {
    this.index = index;
    this.width = width;
    this.height = height;
    this.colorText = colorText;
    this.colorAccent = colorAccent;
    this.sizeScale = sizeScale;
    this.reset();
  }

  reset(): void {
    this.x = Math.random() * this.width;
    this.y = Math.random() * this.height;
    this.tx = this.x;
    this.ty = this.y;
    this.vx = 0;
    this.vy = 0;
    this.size = (Math.random() * 1.4 + 0.3) * this.sizeScale;
    this.baseAlpha = Math.random() * 0.4 + 0.05;
    this.alpha = this.baseAlpha;
    this.homed = false;
    this.delay = Math.random() * 120;
    this.color = Math.random() > 0.92 ? this.colorAccent : this.colorText;
  }

  assignTarget(points: readonly Point[]): void {
    if (points.length === 0) return;
    const point = points[this.index % points.length];
    if (!point) return;
    this.tx = point.x;
    this.ty = point.y;
    this.homed = true;
  }

  update(frame: number, mouse: Point): void {
    if (this.homed && frame > this.delay) {
      const ease = 0.055 + Math.random() * 0.005;
      this.vx += (this.tx - this.x) * ease;
      this.vy += (this.ty - this.y) * ease;
    } else {
      this.vx += (Math.random() - 0.5) * 0.12;
      this.vy += (Math.random() - 0.5) * 0.12;
    }

    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const repel = 90;
    if (dist < repel && dist > 0) {
      const force = (repel - dist) / repel;
      this.vx += (dx / dist) * force * 3.5;
      this.vy += (dy / dist) * force * 3.5;
    }

    this.vx *= 0.88;
    this.vy *= 0.88;
    this.x += this.vx;
    this.y += this.vy;

    const bright = this.homed && frame > this.delay + 40;
    this.alpha += ((bright ? this.baseAlpha * 2.2 : this.baseAlpha) - this.alpha) * 0.04;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.globalAlpha = Math.min(this.alpha, 1);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class ParticleField {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly particleCount: number;
  private readonly fontSizeFactor: number;
  private readonly label: string;
  private readonly colorText: string;
  private readonly colorAccent: string;
  private readonly colorBgFade: string;

  private width = 0;
  private height = 0;
  private dpr = 1;

  private particles: Particle[] = [];
  private mouse: Point = { x: -999, y: -999 };
  private frame = 0;
  private rafId = 0;
  private running = false;
  private destroyed = false;

  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, options: ParticleFieldOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;

    this.particleCount = options.particleCount ?? 1800;
    this.fontSizeFactor = options.fontSizeFactor ?? 0.22;
    this.label = options.label ?? "R \u00b7 H";
    this.colorText = options.colorText ?? "#e6e3da";
    this.colorAccent = options.colorAccent ?? "#7c8891";
    this.colorBgFade = options.colorBgFade ?? "rgba(8,9,11,0.22)";

    this.handleResize = this.handleResize.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.loop = this.loop.bind(this);
  }

  private static viewportScale(width: number): number {
    if (width >= MOBILE_BREAKPOINT) return 1;
    const floor = 0.55;
    const t = Math.max(width, 320) / MOBILE_BREAKPOINT;
    return floor + (1 - floor) * t;
  }

  private buildMask(w: number, h: number): Point[] {
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const g = off.getContext("2d");
    if (!g) return [];

    const maxWidth = w * 0.82;
    let fs = Math.min(w, h) * this.fontSizeFactor;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `300 ${fs}px 'Cormorant Garamond', Georgia, serif`;
    const measured = g.measureText(this.label).width;
    if (measured > maxWidth) {
      fs = fs * (maxWidth / measured);
      g.font = `300 ${fs}px 'Cormorant Garamond', Georgia, serif`;
    }
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#fff";
    g.fillText(this.label, w * 0.5, h * 0.48);

    const data = g.getImageData(0, 0, w, h).data;
    const pts: Point[] = [];
    const step = w < 420 ? 1.5 : w < MOBILE_BREAKPOINT ? 2 : 3;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const i = (Math.floor(y) * w + Math.floor(x)) * 4;
        const alpha = data[i + 3];
        if (alpha !== undefined && alpha > 60) pts.push({ x, y });
      }
    }
    return pts;
  }

  private handleResize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);

    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const scale = ParticleField.viewportScale(this.width);
    const pts = this.buildMask(this.width, this.height);
    const count = Math.round(this.particleCount * (0.6 + 0.4 * scale));

    this.particles = [];
    for (let i = 0; i < count; i++) {
      const p = new Particle(i, this.width, this.height, this.colorText, this.colorAccent, scale);
      if (i < pts.length) p.assignTarget(pts);
      this.particles.push(p);
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  }

  private handleTouchMove(e: TouchEvent): void {
    const touch = e.touches[0];
    if (!touch) return;
    this.mouse.x = touch.clientX;
    this.mouse.y = touch.clientY;
  }

  private handleMouseLeave(): void {
    this.mouse.x = -999;
    this.mouse.y = -999;
  }

  private loop(): void {
    if (!this.running) return;
    this.ctx.fillStyle = this.colorBgFade;
    this.ctx.fillRect(0, 0, this.width, this.height);
    for (const p of this.particles) {
      p.update(this.frame, this.mouse);
      p.draw(this.ctx);
    }
    this.ctx.globalAlpha = 1;
    this.frame++;
    this.rafId = requestAnimationFrame(this.loop);
  }

  async start(): Promise<void> {
    window.addEventListener("resize", this.handleResize);
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("touchmove", this.handleTouchMove, { passive: true });
    window.addEventListener("mouseleave", this.handleMouseLeave);

    await document.fonts.ready;
    if (this.destroyed) return;
    this.handleResize();
    this.running = true;
    this.loop();
  }

  destroy(): void {
    this.destroyed = true;
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("touchmove", this.handleTouchMove);
    window.removeEventListener("mouseleave", this.handleMouseLeave);
  }
}
