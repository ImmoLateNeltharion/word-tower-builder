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

    const draw = async () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Generate QR to offscreen canvas — transparent bg, amber modules
      const offscreen = document.createElement("canvas");
      await QRCode.toCanvas(offscreen, url, {
        width: px,
        margin: 1,
        color: {
          dark: "#ffbe50ff",
          light: "#00000000",
        },
      });

      ctx.clearRect(0, 0, px, px);
      ctx.globalAlpha = 0.88;
      ctx.drawImage(offscreen, 0, 0);
      ctx.globalAlpha = 1;

      // Draw logo centered, maintaining aspect ratio
      const logo = new Image();
      logo.onload = () => {
        const circleR = px * 0.13; // radius of backdrop circle
        const cx = px / 2;
        const cy = px / 2;

        // Dark circle backdrop
        ctx.beginPath();
        ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(8, 8, 12, 0.90)";
        ctx.fill();

        // Thin amber ring around backdrop
        ctx.beginPath();
        ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 190, 80, 0.55)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Fit logo inside circle while preserving aspect ratio
        const maxW = circleR * 1.5;
        const maxH = circleR * 1.2;
        const aspect = logo.naturalWidth / logo.naturalHeight;
        let lw = maxW, lh = maxW / aspect;
        if (lh > maxH) { lh = maxH; lw = maxH * aspect; }

        ctx.drawImage(logo, cx - lw / 2, cy - lh / 2, lw, lh);
      };
      logo.src = "/vatech-logo.png";
    };

    draw();
  }, [url, size]);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "10px",
        boxShadow: [
          "0 0 8px rgba(255,190,80,0.55)",
          "0 0 20px rgba(255,160,50,0.30)",
          "0 0 40px rgba(255,130,30,0.15)",
          "inset 0 0 8px rgba(255,190,80,0.08)",
        ].join(", "),
        border: "1px solid rgba(255,190,80,0.35)",
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
