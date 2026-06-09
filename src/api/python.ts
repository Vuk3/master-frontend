import { http } from "./client";
import { ENDPOINTS, ROUTES } from "./endpoints";
import { toFileFormData } from "./form-data";
import type {
  DetectResponse,
  HealthResponse,
  ModelsResponse,
} from "./types";

export const pythonApi = {
  health: () =>
    http<HealthResponse>(`${ENDPOINTS.gatewayBaseUrl}${ROUTES.pythonHealth}`),

  models: () =>
    http<ModelsResponse>(
      `${ENDPOINTS.gatewayBaseUrl}${ROUTES.pythonModels}`,
    ),

  predict: (file: File, modelId?: string) =>
    http<DetectResponse>(`${ENDPOINTS.gatewayBaseUrl}${ROUTES.pythonPredict}`, {
      method: "POST",
      body: toFileFormData(file, modelId ? { model: modelId } : undefined),
    }),
};
