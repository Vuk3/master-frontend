import { http } from "./client";
import { ENDPOINTS, ROUTES } from "./endpoints";
import { toFileFormData } from "./form-data";
import type { DetectResponse, HealthResponse } from "./types";

export const dotnetApi = {
  health: () =>
    http<HealthResponse>(`${ENDPOINTS.gatewayBaseUrl}${ROUTES.dotnetHealth}`),

  predict: (file: File) =>
    http<DetectResponse>(`${ENDPOINTS.gatewayBaseUrl}${ROUTES.dotnetPredict}`, {
      method: "POST",
      body: toFileFormData(file),
    }),
};
