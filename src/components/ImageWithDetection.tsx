import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
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
  selectedIndex?: number | null;
  showBoxes?: boolean;
  showFill?: boolean;
  onlySelected?: boolean;
  onSelect?: (index: number) => void;
};

const minZoom = 1;
const maxZoom = 3;
const zoomStep = 0.25;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function ImageWithDetections({
  imageUrl,
  imageWidth,
  imageHeight,
  detections = [],
  accent = "#2563eb",
  selectedIndex = null,
  showBoxes = true,
  showFill = true,
  onlySelected = false,
  onSelect,
}: Props) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef({ active: false, x: 0, y: 0, hasDragged: false });
  const [isLoaded, setIsLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

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
      if (onlySelected && selectedIndex !== null && selectedIndex !== index) {
        return;
      }

      const { x1, y1, x2, y2 } = det.box;
      const isSelected = selectedIndex === index;

      const x = x1 * scaleX;
      const y = y1 * scaleY;
      const bw = (x2 - x1) * scaleX;
      const bh = (y2 - y1) * scaleY;

      if (showFill) {
        ctx.globalAlpha = isSelected ? 0.22 : 0.1;
        ctx.fillStyle = accent;
        ctx.fillRect(x, y, bw, bh);
        ctx.globalAlpha = 1;
      }

      if (showBoxes) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = isSelected ? 4 : 2;
        ctx.strokeRect(x, y, bw, bh);
      }

      const markerX = Math.max(15, Math.min(w - 15, x + 15));
      const markerY = Math.max(15, Math.min(h - 15, y + 15));
      ctx.beginPath();
      ctx.arc(markerX, markerY, isSelected ? 15 : 13, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.font =
        "700 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(String(index + 1), markerX, markerY + 0.5);
    });
  }, [
    accent,
    detections,
    imageWidth,
    imageHeight,
    isLoaded,
    onlySelected,
    selectedIndex,
    showBoxes,
    showFill,
  ]);

  useEffect(() => {
    setIsLoaded(false);
    resetView();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }, [imageUrl, resetView]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const ro = new ResizeObserver(() => draw());
    ro.observe(img);

    return () => ro.disconnect();
  }, [draw]);

  function changeZoom(nextZoom: number) {
    const clampedZoom = clamp(nextZoom, minZoom, maxZoom);
    setZoom(clampedZoom);

    if (clampedZoom === 1) {
      setPan({ x: 0, y: 0 });
    }
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (zoom === 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { active: true, x: e.clientX, y: e.clientY, hasDragged: false };
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current = { active: true, x: e.clientX, y: e.clientY, hasDragged: true };

    setPan((current) => ({
      x: current.x + dx,
      y: current.y + dy,
    }));
  }

  function handlePointerEnd(e: PointerEvent<HTMLDivElement>) {
    dragRef.current.active = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function handleViewportClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onSelect || !detections.length) return;
    if (dragRef.current.hasDragged) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const vw = rect.width;
    const vh = rect.height;

    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // Invert pan + zoom (transform-origin: center)
    const stageX = (cx - vw / 2 - pan.x) / zoom + vw / 2;
    const stageY = (cy - vh / 2 - pan.y) / zoom + vh / 2;

    // Map stage coords → image coords
    const imgX = (stageX / vw) * imageWidth;
    const imgY = (stageY / vh) * imageHeight;

    // Find topmost hit detection (last drawn = highest z)
    for (let i = detections.length - 1; i >= 0; i--) {
      const { x1, y1, x2, y2 } = detections[i].box;
      if (imgX >= x1 && imgX <= x2 && imgY >= y1 && imgY <= y2) {
        onSelect(i);
        return;
      }
    }
  }

  return (
    <div className="image-canvas">
      <div className="image-toolbar">
        <button
          aria-label={t("imageTools.zoomOut")}
          className="image-tool-button"
          disabled={zoom === minZoom}
          onClick={() => changeZoom(zoom - zoomStep)}
          type="button"
        >
          -
        </button>
        <span>{`${Math.round(zoom * 100)}%`}</span>
        <button
          aria-label={t("imageTools.zoomIn")}
          className="image-tool-button"
          disabled={zoom === maxZoom}
          onClick={() => changeZoom(zoom + zoomStep)}
          type="button"
        >
          +
        </button>
        <button
          aria-label={t("imageTools.reset")}
          className="image-tool-button"
          disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
          onClick={resetView}
          type="button"
        >
          FIT
        </button>
      </div>

      <div
        className="image-canvas__viewport"
        data-draggable={zoom > 1}
        onClick={handleViewportClick}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
      >
        <div
          className="image-canvas__stage"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt={t("imagePreview.alt")}
            className="image-canvas__image"
            draggable={false}
            onLoad={() => {
              setIsLoaded(true);
              requestAnimationFrame(draw);
            }}
          />
          <canvas ref={canvasRef} className="image-canvas__overlay" />
        </div>
      </div>
    </div>
  );
}
