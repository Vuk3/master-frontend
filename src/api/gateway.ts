import { http } from "./client";
import { ENDPOINTS, ROUTES } from "./endpoints";
import type { HealthResponse } from "./types";

export const gatewayApi = {
  health: () =>
    http<HealthResponse>(`${ENDPOINTS.gatewayBaseUrl}${ROUTES.gatewayHealth}`),
};
