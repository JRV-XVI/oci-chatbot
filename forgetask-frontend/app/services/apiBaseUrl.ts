export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_USE_PROXY === "true") {
    return "";
  }

  return process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") || "http://localhost:8080";
}