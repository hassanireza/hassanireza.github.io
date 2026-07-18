import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      render: (
        container: string | HTMLElement,
        options: Record<string, unknown>,
      ) => string;
    };
  }
}

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const TURNSTILE_SITE_KEY = "0x4AAAAAADvKA6Dsrk1YZ8Tr";

interface TurnstileCallbacks {
  onToken: (token: string) => void;
  onExpire: () => void;
}

class TurnstileWidget {
  private static scriptLoadPromise: Promise<void> | undefined;

  private readonly container: HTMLElement;
  private readonly callbacks: TurnstileCallbacks;
  private widgetId: string | undefined;
  private observer: IntersectionObserver | undefined;
  private destroyed = false;

  constructor(container: HTMLElement, callbacks: TurnstileCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  private static loadScript(): Promise<void> {
    if (window.turnstile) return Promise.resolve();

    TurnstileWidget.scriptLoadPromise ??= new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
      );
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Turnstile script failed to load")));
        return;
      }

      const script = document.createElement("script");
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", () => resolve());
      script.addEventListener("error", () => reject(new Error("Turnstile script failed to load")));
      document.body.appendChild(script);
    });

    return TurnstileWidget.scriptLoadPromise;
  }

  observe(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.observer?.disconnect();
          void this.render();
        }
      },
      { rootMargin: "200px" },
    );
    this.observer.observe(this.container);
  }

  private async render(): Promise<void> {
    try {
      await TurnstileWidget.loadScript();
    } catch {
      return;
    }
    if (this.destroyed || !window.turnstile) return;
    if (this.container.childElementCount > 0) return;

    this.widgetId = window.turnstile.render(this.container, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "dark",
      callback: (token: string) => this.callbacks.onToken(token),
      "expired-callback": () => this.callbacks.onExpire(),
    });
  }

  reset(): void {
    if (this.widgetId) window.turnstile?.reset(this.widgetId);
    this.callbacks.onExpire();
  }

  destroy(): void {
    this.destroyed = true;
    this.observer?.disconnect();
    if (this.widgetId) {
      window.turnstile?.remove(this.widgetId);
      this.widgetId = undefined;
    }
  }
}

export function useTurnstile(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [token, setToken] = useState("");
  const widgetRef = useRef<TurnstileWidget | undefined>(undefined);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const widget = new TurnstileWidget(container, {
      onToken: setToken,
      onExpire: () => setToken(""),
    });
    widgetRef.current = widget;
    widget.observe();

    return () => {
      widget.destroy();
      widgetRef.current = undefined;
    };
  }, [containerRef]);

  function reset(): void {
    widgetRef.current?.reset();
  }

  return { token, reset };
}
