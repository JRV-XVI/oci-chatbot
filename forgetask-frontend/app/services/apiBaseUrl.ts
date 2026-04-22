const DEFAULT_API_URL = "http://localhost:8080";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

function normalizeConfiguredApiUrl(configuredUrl: string): string {
  const normalized = configuredUrl.trim() || DEFAULT_API_URL;

  if (typeof window === "undefined") {
    return normalized.replace(/\/$/, "");
  }

  try {
    const parsed = new URL(normalized);
    const currentHost = window.location.hostname;

    if (LOCAL_HOSTS.has(parsed.hostname) && currentHost && !LOCAL_HOSTS.has(currentHost)) {
      parsed.hostname = currentHost;
    }

    return parsed.toString().replace(/\/$/, "");
  } catch {
    return normalized.replace(/\/$/, "");
  }
}

export function getApiBaseUrl(): string {
  return normalizeConfiguredApiUrl(process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL);
}
