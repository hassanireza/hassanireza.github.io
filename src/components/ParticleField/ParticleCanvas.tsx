import { useEffect, useRef } from "react";
import { ParticleField } from "./ParticleField";
import "./ParticleCanvas.css";

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const field = new ParticleField(canvas);
    field.start();

    return () => field.destroy();
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" id="c" />;
}
