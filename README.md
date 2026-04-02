# oci-chatbot

## Ejecutar con Docker (backend + frontend)

Este repo contiene 2 servicios que ya pueden construirse y levantarse en contenedores:

- **Backend (Spring Boot):** `forgetask/` (puerto **8080**)
- **Frontend (Next.js):** `forgetask-frontend/` (puerto **3000**)

### Prerrequisitos

- Docker instalado y corriendo
- Si tu usuario no tiene permisos sobre Docker, usa `sudo` en los comandos.

### Build de imágenes

Desde la raíz del repo:

```bash
# Backend
docker build -t forgetask-backend:local ./forgetask

# Frontend
docker build -t forgetask-frontend:local ./forgetask-frontend
```

### Correr contenedores

En una terminal:

```bash
docker run --rm -p 8080:8080 --name forgetask-backend forgetask-backend:local
```

En otra terminal:

```bash
docker run --rm -p 3000:3000 --name forgetask-frontend forgetask-frontend:local
```

### Pruebas rápidas (smoke tests)

```bash
# Frontend responde HTML
curl -I http://localhost:3000

# Backend expone endpoint de salud
curl -i http://localhost:8080/health
```

### Detener/limpiar

- Si ejecutaste con `--rm`, al detener con `Ctrl+C` el contenedor se elimina solo.
- Si necesitas forzar el stop:

```bash
docker stop forgetask-backend || true
docker stop forgetask-frontend || true
```

## Notas

- Los Dockerfiles están en `forgetask/Dockerfile` y `forgetask-frontend/Dockerfile`.
- El backend incluye un endpoint mínimo `GET /health` para facilitar verificación y (más adelante) probes de Kubernetes.