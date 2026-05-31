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
};

export default function ImageWithDetections({
  imageUrl,
  imageWidth,
  imageHeight,
  detections = [],
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

    for (const det of detections) {
      const { x1, y1, x2, y2 } = det.box;

      const x = x1 * scaleX;
      const y = y1 * scaleY;
      const bw = (x2 - x1) * scaleX;
      const bh = (y2 - y1) * scaleY;

      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, bw, bh);

      const text = `${det.label} ${(det.score * 100).toFixed(1)}%`;
      ctx.font = "12px Arial";
      const tw = ctx.measureText(text).width;

      ctx.fillStyle = "red";
      ctx.fillRect(x, Math.max(0, y - 16), tw + 6, 16);

      ctx.fillStyle = "white";
      ctx.fillText(text, x + 3, Math.max(12, y - 4));
    }
  }, [detections, imageWidth, imageHeight, isLoaded]);

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
