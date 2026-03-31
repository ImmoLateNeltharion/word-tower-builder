import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRWithLogoProps {
  url: string;
  size?: number;
}

export function QRWithLogo({ url, size = 150 }: QRWithLogoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !url) return;

    const px = size * 2; // 2x for retina
    canvas.width = px;
    canvas.height = px;

    let cancelled = false;

    const draw = async () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Generate QR to offscreen canvas — transparent bg, silver/white modules
      const offscreen = document.createElement("canvas");
      await QRCode.toCanvas(offscreen, url, {
        width: px,
        margin: 1,
        color: {
          dark: "#f0f0f0ff",
          light: "#00000000",
        },
      });

      if (cancelled) return;

      ctx.clearRect(0, 0, px, px);
      ctx.globalAlpha = 0.88;
      ctx.drawImage(offscreen, 0, 0);
      ctx.globalAlpha = 1;

      // Keep QR clean: no centered logo overlay.
    };

    draw();
    return () => { cancelled = true; };
  }, [url, size]);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "10px",
        boxShadow: [
          "0 8px 18px rgba(20, 36, 52, 0.20)",
          "0 2px 6px rgba(20, 36, 52, 0.14)",
          "inset 0 0 0 1px rgba(236, 242, 247, 0.7)",
        ].join(", "),
        border: "1px solid rgba(230, 238, 246, 0.9)",
        background: "rgba(255, 255, 255, 0.03)",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, display: "block" }}
      />
    </div>
  );
}
