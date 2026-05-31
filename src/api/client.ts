export class ApiError extends Error {
  public status: number;
  public bodyText?: string;

  constructor(message: string, status: number, bodyText?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.bodyText = bodyText;
  }
}

export async function http<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, init);

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(`HTTP ${res.status} for ${url}`, res.status, text);
  }

  if (isJson) return (await res.json()) as T;

  const text = await res.text();
  return text as unknown as T;
}
