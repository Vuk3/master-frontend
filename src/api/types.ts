export type HealthResponse = string;

export type ModelOption = {
  id: string;
  name: string;
  family: string;
  annotationType: string;
  isDefault: boolean;
};

export type ModelsResponse = {
  models: ModelOption[];
  defaultModelId: string | null;
};

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
  model: string;
  modelId?: string | null;
  annotationType?: string | null;
  imageWidth?: number;
  imageHeight?: number;
  detections: Detection[];
};
