import { http } from "./client";
import { ENDPOINTS, ROUTES } from "./endpoints";
import { toFileFormData } from "./form-data";
import type { DetectResponse, HealthResponse, ModelsResponse } from "./types";

export const dotnetApi = {
  health: () =>
    http<HealthResponse>(`${ENDPOINTS.gatewayBaseUrl}${ROUTES.dotnetHealth}`),

  models: () =>
    http<ModelsResponse>(
      `${ENDPOINTS.gatewayBaseUrl}${ROUTES.dotnetModels}`,
    ),

  predict: (file: File, modelId?: string) =>
    http<DetectResponse>(`${ENDPOINTS.gatewayBaseUrl}${ROUTES.dotnetPredict}`, {
      method: "POST",
      body: toFileFormData(file, modelId ? { model: modelId } : undefined),
    }),
};
