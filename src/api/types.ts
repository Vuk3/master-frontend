export type HealthResponse = string;

export type BoundingBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type Detection = {
  label: string;
  score: number;
  box: BoundingBox;
};

export type DetectResponse = {
  model: "mlnet" | "yolov8";
  imageWidth?: number;
  imageHeight?: number;
  detections: Detection[];
};
