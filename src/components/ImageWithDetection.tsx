import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/use-i18n";

type Detection = {
  label: string;
  score: number;
  box: { x1: number; y1: number; x2: number; y2: number };
};

type Props = {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  detections?: Detection[];
  accent?: string;
};

export default function ImageWithDetections({
  imageUrl,
  imageWidth,
  imageHeight,
  detections = [],
  accent = "#2563eb",
}: Props) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    if (!isLoaded) return;

    const w = img.clientWidth;
    const h = img.clientHeight;
    if (!w || !h) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleX = w / imageWidth;
    const scaleY = h / imageHeight;

    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach((det, index) => {
      const { x1, y1, x2, y2 } = det.box;

      const x = x1 * scaleX;
      const y = y1 * scaleY;
      const bw = (x2 - x1) * scaleX;
      const bh = (y2 - y1) * scaleY;

      ctx.globalAlpha = 0.12;
      ctx.fillStyle = accent;
      ctx.fillRect(x, y, bw, bh);
      ctx.globalAlpha = 1;

      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, bw, bh);

      const markerX = Math.max(15, Math.min(w - 15, x + 15));
      const markerY = Math.max(15, Math.min(h - 15, y + 15));
      ctx.beginPath();
      ctx.arc(markerX, markerY, 13, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();

      ctx.font =
        "700 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(String(index + 1), markerX, markerY + 0.5);
    });
  }, [accent, detections, imageWidth, imageHeight, isLoaded]);

  useEffect(() => {
    setIsLoaded(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }, [imageUrl]);

  // Kad se promene detekcije, pokušaj ponovo da nacrtaš (ako je slika već učitana)
  useEffect(() => {
    draw();
  }, [draw]);

  // Redraw na resize (kad se promeni layout)
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const ro = new ResizeObserver(() => draw());
    ro.observe(img);

    return () => ro.disconnect();
  }, [draw]);

  return (
    <div className="image-canvas">
      <img
        ref={imgRef}
        src={imageUrl}
        alt={t("imagePreview.alt")}
        className="image-canvas__image"
        onLoad={() => {
          setIsLoaded(true);
          // nacrtaj odmah kad se slika učita
          requestAnimationFrame(draw);
        }}
      />
      <canvas
        ref={canvasRef}
        className="image-canvas__overlay"
      />
    </div>
  );
}
