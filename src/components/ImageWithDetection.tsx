import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { useI18n } from "../i18n/use-i18n";
import { getDetectionColor } from "../utils/detection-colors";

type Detection = {
  label: string;
  score: number;
  box: { x1: number; y1: number; x2: number; y2: number };
};

type LabelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  detections?: Detection[];
  selectedIndex?: number | null;
  showBoxes?: boolean;
  showFill?: boolean;
  onlySelected?: boolean;
  onSelect?: (index: number) => void;
};

const minZoom = 1;
const maxZoom = 3;
const zoomStep = 0.25;
const labelHeight = 18;
const labelGap = 2;
const labelPaddingX = 6;
const labelPaddingY = 3;
const labelCollisionGap = 3;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatScore(score: number) {
  return `${Math.round(score * 100)}%`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function truncateCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  let truncatedText = text;
  while (truncatedText.length > 1) {
    truncatedText = truncatedText.slice(0, -1);
    if (ctx.measureText(`${truncatedText}...`).width <= maxWidth) {
      return `${truncatedText}...`;
    }
  }

  return text.slice(0, 1);
}

function overlapsLabel(a: LabelRect, b: LabelRect) {
  return !(
    a.x + a.width + labelCollisionGap <= b.x ||
    b.x + b.width + labelCollisionGap <= a.x ||
    a.y + a.height + labelCollisionGap <= b.y ||
    b.y + b.height + labelCollisionGap <= a.y
  );
}

function findLabelRect(
  boxX: number,
  boxY: number,
  labelWidth: number,
  canvasWidth: number,
  canvasHeight: number,
  placedLabels: LabelRect[],
) {
  const minX = 4;
  const minY = 4;
  const maxX = Math.max(minX, canvasWidth - labelWidth - 4);
  const maxY = Math.max(minY, canvasHeight - labelHeight - 4);
  const baseX = clamp(boxX, minX, maxX);
  const rowStep = labelHeight + labelGap + labelCollisionGap;
  const xOffsets = [0, 8, -8, 18, -18, 32, -32];
  const candidates: LabelRect[] = [];

  for (let row = 0; row < 10; row++) {
    const aboveY = boxY - labelHeight - labelGap - row * rowStep;
    const belowY = boxY + labelGap + row * rowStep;

    [aboveY, belowY].forEach((candidateY) => {
      if (candidateY < minY || candidateY > maxY) return;

      xOffsets.forEach((offset) => {
        candidates.push({
          x: clamp(baseX + offset, minX, maxX),
          y: candidateY,
          width: labelWidth,
          height: labelHeight,
        });
      });
    });
  }

  return (
    candidates.find((candidate) =>
      placedLabels.every((placed) => !overlapsLabel(candidate, placed)),
    ) ?? {
      x: baseX,
      y: clamp(boxY - labelHeight - labelGap, minY, maxY),
      width: labelWidth,
      height: labelHeight,
    }
  );
}

export default function ImageWithDetections({
  imageUrl,
  imageWidth,
  imageHeight,
  detections = [],
  selectedIndex = null,
  showBoxes = true,
  showFill = true,
  onlySelected = false,
  onSelect,
}: Props) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const frameRef = useRef<number | null>(null);
  const dragRef = useRef({ active: false, x: 0, y: 0, hasDragged: false });
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
    if (!img.complete || !img.naturalWidth || !img.naturalHeight) return;

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
      const color = getDetectionColor(det.label);

      const x = x1 * scaleX;
      const y = y1 * scaleY;
      const bw = (x2 - x1) * scaleX;
      const bh = (y2 - y1) * scaleY;

      if (showFill) {
        ctx.globalAlpha = isSelected ? 0.22 : 0.1;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, bw, bh);
        ctx.globalAlpha = 1;
      }

      if (showBoxes) {
        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 4 : 2;
        ctx.strokeRect(x, y, bw, bh);
      }
    });

    if (!showBoxes) {
      return;
    }

    const placedLabels: LabelRect[] = [];

    detections.forEach((det, index) => {
      if (onlySelected && selectedIndex !== null && selectedIndex !== index) {
        return;
      }

      const { x1, y1, x2 } = det.box;
      const isSelected = selectedIndex === index;
      const color = getDetectionColor(det.label);

      const x = x1 * scaleX;
      const y = y1 * scaleY;
      const bw = (x2 - x1) * scaleX;
      const labelText = `${det.label} ${formatScore(det.score)}`;
      ctx.font =
        "800 10.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

      const maxLabelWidth = Math.max(54, Math.min(w - 8, bw + 56));
      const text = truncateCanvasText(
        ctx,
        labelText,
        maxLabelWidth - labelPaddingX * 2,
      );
      const labelWidth = Math.min(
        maxLabelWidth,
        ctx.measureText(text).width + labelPaddingX * 2,
      );
      const labelRect = findLabelRect(x, y, labelWidth, w, h, placedLabels);
      placedLabels.push(labelRect);

      ctx.shadowColor = "rgba(15, 23, 42, 0.18)";
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 1;
      drawRoundedRect(ctx, labelRect.x, labelRect.y, labelRect.width, labelRect.height, 5);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      if (isSelected) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(
        text,
        labelRect.x + labelPaddingX,
        labelRect.y + labelPaddingY + (labelHeight - labelPaddingY * 2) / 2 + 0.5,
      );
    });
  }, [detections, imageWidth, imageHeight, onlySelected, selectedIndex, showBoxes, showFill]);

  const scheduleDraw = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      draw();
    });
  }, [draw]);

  useEffect(() => {
    resetView();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }, [imageUrl, resetView]);

  useEffect(() => {
    scheduleDraw();
  }, [scheduleDraw]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const ro = new ResizeObserver(() => scheduleDraw());
    ro.observe(img);

    return () => ro.disconnect();
  }, [scheduleDraw]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

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
            onLoad={scheduleDraw}
          />
          <canvas ref={canvasRef} className="image-canvas__overlay" />
        </div>
      </div>
    </div>
  );
}
