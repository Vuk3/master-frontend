const env = (key: string, fallback: string) =>
  import.meta.env[key] ?? fallback;

export const ENDPOINTS = {
  gatewayBaseUrl: env("VITE_GATEWAY_BASE_URL", "http://localhost:3000"),
};

export const ROUTES = {
  gatewayHealth: "/health",

  pythonHealth: "/python/health",
  pythonModels: "/python/models",
  pythonPredict: "/python/predict",

  dotnetHealth: "/dotnet/health",
  dotnetModels: "/dotnet/models",
  dotnetPredict: "/dotnet/predict",
};
