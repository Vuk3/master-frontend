import { http } from "./client";
import { ENDPOINTS, ROUTES } from "./endpoints";
import { toFileFormData } from "./form-data";
import type { DetectResponse, HealthResponse } from "./types";

export const pythonApi = {
  health: () =>
    http<HealthResponse>(`${ENDPOINTS.gatewayBaseUrl}${ROUTES.pythonHealth}`),

  predict: (file: File) =>
    http<DetectResponse>(`${ENDPOINTS.gatewayBaseUrl}${ROUTES.pythonPredict}`, {
      method: "POST",
      body: toFileFormData(file),
    }),
};
