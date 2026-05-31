const env = (key: string, fallback: string) =>
  import.meta.env[key] ?? fallback;

export const ENDPOINTS = {
  gatewayBaseUrl: env("VITE_GATEWAY_BASE_URL", "http://localhost:3000"),
};

export const ROUTES = {
  gatewayHealth: "/health",

  pythonHealth: "/python/health",
  pythonPredict: "/python/predict",

  dotnetHealth: "/dotnet/health",
  dotnetPredict: "/dotnet/predict",
};
