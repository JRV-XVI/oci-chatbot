# oci-chatbot

## Ejecutar con Docker (backend + frontend)

Este repo contiene 2 servicios que ya pueden construirse y levantarse en contenedores:

- **Backend (Spring Boot):** `forgetask/` (puerto **8080**)
- **Frontend (Next.js):** `forgetask-frontend/` (puerto **3000**)

---

## Desarrollo local con Docker Compose (recomendado)

Este es el modo recomendado para el día a día. Usa bind mounts para reflejar cambios de código en tiempo real sin reconstruir imágenes (**hot-reload**).

### Prerrequisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose) — versión 24+
- El wallet de Oracle ATP ubicado en `forgetask/wallet/`
- Archivo `.env` en la raíz del proyecto con las credenciales (ver sección siguiente)
- **Windows:** Requiere [Docker Desktop con WSL2](https://docs.docker.com/desktop/wsl/) habilitado.

### Configurar credenciales

Crea un archivo `.env` en la raíz del proyecto (nunca lo commitees al repo):

```bash
# .env
DB_USER=tu_usuario_atp
DB_PASSWORD=tu_password_atp
```

Puedes usar `.env.example` como referencia:

```bash
cp .env.example .env
# Edita .env con tus credenciales reales
```

### Levantar el entorno de desarrollo

```bash
# Primera vez o después de cambiar dependencias (package.json / pom.xml)
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up

# Día a día
docker compose -f docker-compose.dev.yml up
```

Una vez levantado:

| Servicio | URL |
|---|---|
| Frontend (Next.js) | http://localhost:3000 |
| Backend (Spring Boot) | http://localhost:8080 |

### Hot-reload

- **Frontend:** cualquier cambio en `forgetask-frontend/` se refleja automáticamente en el browser.
- **Backend:** cualquier cambio en `forgetask/src/` es detectado por Spring Boot DevTools y reinicia el contexto automáticamente.

### Ver logs

```bash
# Todos los servicios
docker compose -f docker-compose.dev.yml logs -f

# Solo backend
docker compose -f docker-compose.dev.yml logs -f backend

# Solo frontend
docker compose -f docker-compose.dev.yml logs -f frontend
```

### Detener el entorno

```bash
# Detener sin borrar volúmenes (recomendado día a día)
docker compose -f docker-compose.dev.yml down

# Detener y borrar volúmenes (úsalo si hay conflictos con node_modules)
docker compose -f docker-compose.dev.yml down -v
```

---

## Ejecutar con imágenes de producción (prueba antes de OCI)

Usa este modo para verificar que las imágenes de producción funcionan correctamente antes de subir a Oracle Container Registry (OCIR).

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

---

## Estructura relevante
