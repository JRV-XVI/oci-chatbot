# Implementación RAG (Sprints) — Resumen de cambios

Este documento describe los cambios aplicados para incorporar **RAG (Retrieval-Augmented Generation)** basado en embeddings de sprints y Oracle ADB 26ai, siguiendo el alcance del archivo `CLAUDE.md`.

> Nota: el backend de este repo usa `application.properties` (no `application.yml`). Por eso las mismas claves solicitadas se agregaron en formato `.properties`.

---

## 1) Dependencias agregadas

**Archivo:** forgetask/pom.xml

Se agregaron estas dependencias (sin eliminar las existentes):

- `dev.langchain4j:langchain4j:0.36.2`
- `dev.langchain4j:langchain4j-oracle:0.36.2`
- `dev.langchain4j:langchain4j-open-ai:0.36.2`

---

## 2) Configuración (variables / properties)

**Archivo:** forgetask/src/main/resources/application.properties

Se agregaron las propiedades para el datasource vectorial y el bloque `rag.vector.*`:

- `spring.datasource.vector.url=${DB_26AI_URL:${spring.datasource.url}}`
- `spring.datasource.vector.username=${DB_26AI_USER:${spring.datasource.username}}`
- `spring.datasource.vector.password=${DB_26AI_PASSWORD:${spring.datasource.password}}`
- `spring.datasource.vector.driver-class-name=oracle.jdbc.OracleDriver`

- `rag.vector.top-k=${VECTOR_TOP_K:5}`
- `rag.vector.embedding-model=${VECTOR_EMBEDDING_MODEL:ADMIN.ALL_MINILM_L12_V2}`

Importante:

- `DB_26AI_*` es **opcional**. Si no existe, el backend reutiliza el datasource principal.
- Solo necesitas definir `DB_26AI_URL/USER/PASSWORD` si el vector store está en otra DB/usuario distinto.

### ¿Cómo obtener el URL de la DB (DB_26AI_URL)?

En este repo, el backend ya usa wallet + TNS.

- Revisa el alias en: `forgetask/wallet/tnsnames.ora` (por ejemplo `ocichatbot26ai_tp`).
- La forma típica del URL JDBC usando wallet es:

  `jdbc:oracle:thin:@<TNS_ALIAS>?TNS_ADMIN=/wallet`

En Docker, el `docker-compose.dev.yml` monta la wallet en `/wallet` y exporta `TNS_ADMIN=/wallet`, así que ese patrón funciona.

Alternativa (si usas strings directos): en OCI Console → Autonomous Database → DB Connection → Connection Strings.

---

## 3) Segundo DataSource + NamedParameterJdbcTemplate (vector)

**Archivo:** forgetask/src/main/java/com/cloudforge/api/forgetask/config/VectorDatabaseConfig.java

Se creó la configuración para:

- Declarar explícitamente el datasource **principal** como `@Primary` (UCP) porque al declarar un segundo datasource, Spring Boot deja de autoconfigurar el principal automáticamente.
- Declarar el datasource vectorial `vectorDataSource` usando `spring.datasource.vector.*`.
- Exponer `NamedParameterJdbcTemplate` con nombre de bean **`vectorJdbcTemplate`** para soportar SQL con parámetros nombrados (`:param`).

Fallback implementado:

- Si `spring.datasource.vector.*` viene vacío, `vectorDataSource` usa los valores del datasource principal.

Beans relevantes:

- `dataSource` (principal, `@Primary`)
- `vectorDataSource`
- `vectorJdbcTemplate` (`NamedParameterJdbcTemplate`)

---

## 4) Construcción del “chunk” narrativo del sprint

**Archivo:** forgetask/src/main/java/com/cloudforge/api/forgetask/service/SprintChunkBuilder.java

Se creó el servicio `SprintChunkBuilder` que:

- Usa el `JdbcTemplate` **principal**.
- Implementa `buildSprintChunk(Long idSprint)`.
- Ejecuta exactamente el SQL solicitado (con `APP_USER.SPRINT` y `APP_USER.TASK`).
- Construye el texto narrativo con:
  - `completed_tasks = total_tasks - tasks_incomplete`
  - `completion_rate` redondeado a 0 decimales
  - `deviation_pct` con signo y 1 decimal, o `0.0%` si `estimated_h = 0`
  - fechas `dd/MMM/yyyy`.

---

## 5) Indexación de embeddings al cerrar sprint

**Archivo:** forgetask/src/main/java/com/cloudforge/api/forgetask/service/SprintEmbeddingService.java

Se creó `SprintEmbeddingService` que:

- Usa `vectorJdbcTemplate` (`NamedParameterJdbcTemplate`).
- Implementa `indexSprint(Long idSprint, Long idProject, String sprintTitle)`.
- Obtiene el texto desde `SprintChunkBuilder.buildSprintChunk(idSprint)`.
- Ejecuta el `MERGE` solicitado sobre `SPRINT_EMBEDDINGS` usando `VECTOR_EMBEDDING(ADMIN.ALL_MINILM_L12_V2 USING :chunkText AS DATA)`.
- Maneja errores con `try/catch` + log **sin relanzar** (el cierre del sprint no falla si falla indexación).

---

## 6) Recuperación de contexto histórico (RAG)

**Archivo:** forgetask/src/main/java/com/cloudforge/api/forgetask/service/VectorContextRetriever.java

Se creó `VectorContextRetriever` que:

- Usa `vectorJdbcTemplate`.
- Lee `topK` desde `rag.vector.top-k`.
- Implementa:

  `List<String> retrieveSprintContext(String queryText, Long excludeSprintId, Long idProject)`

- Ejecuta la query solicitada con `VECTOR_DISTANCE(... COSINE)` y `FETCH FIRST :topK ROWS ONLY`.
- Retorna `List.of()` si no hay resultados o si ocurre un error.

---

## 7) Sprint DTO y SprintService (activate/close)

**Archivos:**

- forgetask/src/main/java/com/cloudforge/api/forgetask/dto/SprintDTO.java
- forgetask/src/main/java/com/cloudforge/api/forgetask/service/SprintService.java

Se agregó:

- `SprintDTO` con campo `status` (default `PLANNED`).
- `SprintService` con:
  - `activateSprint(Long idSprint)`
    - valida `STATUS == PLANNED`, si no lanza `IllegalStateException("Solo se puede activar un sprint en estado PLANNED")`
    - actualiza a `ACTIVE`.
  - `closeSprint(Long idSprint)`
    - valida `STATUS == ACTIVE`, si no lanza `IllegalStateException("Solo se puede cerrar un sprint en estado ACTIVE")`
    - actualiza a `CLOSED`
    - llama a `SprintEmbeddingService.indexSprint(...)`.

---

## 8) Endpoints nuevos en SprintController

**Archivo:** forgetask/src/main/java/com/cloudforge/api/forgetask/controller/SprintController.java

Se agregaron endpoints nuevos (manteniendo intactos los CRUD existentes):

- `PUT /api/sprints/{idSprint}/activate` → `sprintService.activateSprint(idSprint)`
- `PUT /api/sprints/{idSprint}/close` → `sprintService.closeSprint(idSprint)`

Ambos retornan `ResponseEntity<SprintDTO>`.

---

## 9) Integración RAG en generación de reportes

**Archivos:**

- forgetask/src/main/java/com/cloudforge/api/forgetask/service/LLMService.java
- forgetask/src/main/java/com/cloudforge/api/forgetask/service/ReportGeneratorService.java

Cambios:

- En `LLMService` se inyectaron `VectorContextRetriever` + `SprintChunkBuilder`.
- Se agregó el método:

  `generateSprintExecutiveReportWithRag(Long idProject, Long idSprint)`

  que:
  1. Construye el chunk del sprint actual.
  2. Recupera contexto histórico excluyendo el sprint actual.
  3. Construye `contextBlock`:
     - si no hay contexto: `"No hay sprints históricos disponibles aún para comparación."`
     - si hay contexto: concatena en formato `Sprint histórico N:\n{chunk}`.
  4. Genera el prompt en español solicitado y llama al LLM usando la integración existente (`generateText`).

- En `ReportGeneratorService`, cuando vienen **`projectId` y `sprintId`**, el contenido AI se genera con RAG usando el método anterior; si no, usa el prompt existente como fallback.

---

## Cómo probar (manual)

1) Definir variables (por ejemplo en `.env`):

- (opcional) `DB_26AI_URL`
- (opcional) `DB_26AI_USER`
- (opcional) `DB_26AI_PASSWORD`
- (opcional) `VECTOR_TOP_K`
- (opcional) `VECTOR_EMBEDDING_MODEL` (default `ADMIN.ALL_MINILM_L12_V2`)

2) Probar endpoints:

- Activar: `PUT /api/sprints/{idSprint}/activate`
- Cerrar e indexar: `PUT /api/sprints/{idSprint}/close`

3) Probar reporte con RAG:

- `GET /api/reports/generate/text?projectId=...&sprintId=...`
- `GET /api/reports/generate/pdf?projectId=...&sprintId=...`

---

## Notas importantes

- No existe entidad JPA `Sprint` en este repo; la tabla `SPRINT` se maneja por SQL en controllers/servicios. Por eso la parte “entity/model + mapper” se implementó como `SprintDTO` + consultas SQL en `SprintService`.
- La query de `SprintChunkBuilder` usa `APP_USER.SPRINT` y `APP_USER.TASK` exactamente como el requerimiento. Si el schema por defecto ya es `APP_USER`, esto debería funcionar; si el usuario conectado no tiene ese prefijo, habría que ajustar permisos/sinónimos (no se cambió SQL por la restricción de “query exacta”).

---

## Dónde se aplican las variables de entorno (trazabilidad)

Docker Compose (dev):

- `docker-compose.dev.yml`
  - Backend: inyecta `DB_USER`, `DB_PASSWORD`, `TNS_ADMIN`, y variables LLM/Telegram.
  - Frontend: inyecta `BACKEND_INTERNAL_URL` usado por Next.js para reescritura de `/api/*`.

Backend (Spring Boot):

- `forgetask/src/main/resources/application.properties`
  - Consume placeholders como `${DB_USER}`, `${DB_PASSWORD}`, `${TNS_ADMIN}`, `${DB_26AI_URL}`, etc.
- `com.cloudforge.api.forgetask.config.LLMConfig`
  - Usa `@ConfigurationProperties(prefix = "llm")` para mapear `llm.*` (que vienen del properties/env).
- `com.cloudforge.api.forgetask.config.VectorDatabaseConfig`
  - Usa `@Value("${spring.datasource...}")` para construir `dataSource` y `vectorDataSource`.

Frontend (Next.js):

- `forgetask-frontend/next.config.ts`
  - Usa `process.env.BACKEND_INTERNAL_URL` en `rewrites()` para rutear `/api/*` hacia el backend.
