import { getAuthData } from "./authUtils";
import { getApiBaseUrl } from "./apiBaseUrl";

// Mantiene el mismo contrato que el resto de servicios: base host y endpoints bajo /api
export const API_BASE_URL = getApiBaseUrl();

function buildApiUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const endpointWithApiPrefix = normalizedEndpoint.startsWith("/api")
    ? normalizedEndpoint
    : `/api${normalizedEndpoint}`;

  return `${API_BASE_URL}${endpointWithApiPrefix}`;
}

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const { token, tokenType } = getAuthData();

  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `${tokenType} ${token}`);
  }

  const response = await fetch(buildApiUrl(endpoint), {
    ...options,
    headers,
  });

  // Manejo global de expiración de token (Opcional pero recomendado)
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.clear();
      window.location.href = "/login"; // Redirigir si el token expira
    }
  }

  return response;
}