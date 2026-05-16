export function getApiBaseUrl(): string {
  // Aseguramos que si estamos en el navegador y es un contenedor en runtime,
  // el valor no se pierda por la evaluación estática de NEXT_PUBLIC_
  if (process.env.NEXT_PUBLIC_USE_PROXY === "true" || process.env.NODE_ENV === "production" || typeof window !== "undefined") {
    // Si estamos en entorno de producción o en el navegador, dejamos
    // que el proxy (rewrites en next.config.ts) maneje la petición
    return "";
  }

  return process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") || "http://localhost:8080";
}