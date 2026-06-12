# Structurizr: modelo y visualización para Forgetask

Este directorio contiene un Workspace DSL para Structurizr (`model.dsl`) que modela la arquitectura de la aplicación *Forgetask* y scripts para exportar y visualizar el modelo con Docker.

Contenido relevante
- `model.dsl` : Workspace en Structurizr DSL (System landscape, System context, Containers, Components, Deployment, Dynamic view de ejemplo).
- `structurizr.json` : (generado) JSON exportado por Structurizr CLI — evidencia de ejecución.
- `run_structurizr.ps1` : script PowerShell para Windows que exporta JSON y arranca Structurizr Lite en Docker.
- `run_structurizr.sh` : script shell para Linux/macOS (equivalente).

Requisitos
- Docker instalado y funcionando.
- Acceso a Internet para descargar las imágenes `structurizr/cli:latest` y `structurizr/lite:latest` la primera vez.

Pasos rápidos (Windows — PowerShell)
1. Abrir PowerShell en la raíz del repo (`c:\Users\Angel\Desktop\Tarea\Semestre6\Reto\project\oci-chatbot`).
2. Ejecutar:

```powershell
.\architecture\run_structurizr.ps1
```

3. El script hará dos cosas:
  - Ejecutar `structurizr/cli` para convertir `architecture/model.dsl` → `architecture/structurizr.json`.
  - Arrancar `structurizr/lite` en `http://localhost:8080` (contenedor Docker).

4. Abrir `http://localhost:8080` en el navegador y en la UI de Structurizr Lite elegir `Open workspace` y seleccionar el archivo `structurizr.json` (está montado en `/workspace/structurizr.json`).

Pasos rápidos (Linux/macOS)
1. Desde la raíz del repo ejecutar:

```bash
./architecture/run_structurizr.sh
```

Notas
- El script arranca Structurizr Lite en modo `detached`. Para detenerlo:

```powershell
docker stop structurizr-lite
```

- Si prefieres sólo exportar el JSON sin arrancar el servidor, ejecuta sólo la línea `docker run --rm ... structurizr/cli:latest export ...` indicada en los scripts.

¿Qué contiene el modelo?
- System landscape: sistemas externos (GitHub, Telegram, OCI, Oracle DB).
- System context: el sistema `Forgetask` y actores (`Usuario`, `Administrador`).
- Containers: `Frontend (Next.js)`, `Backend (Spring Boot)`, `WebSocket Service`, `Database (proxy)`.
- Components: controladores REST, servicios de negocio, repositorios, notificador Telegram, etc.
- Deployment: ejemplo de nodos (Developer Laptop, OCI Container Engine, Container Registry, Oracle DB).
- Dynamic: flujo ejemplo "Crear Tarea".

Si quieres que refine el modelo (nombres exactos de componentes, endpoints reales, nodos de despliegue), indícame qué partes del código quieres mapear y extraigo los nombres y rutas para incorporarlos al `model.dsl`.
