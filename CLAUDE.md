Entendido. Voy a generarte un prompt completo y detallado para Copilot que encapsule todo el contexto relevante de la conversación. Lo estructuro para que Copilot tenga todo lo que necesita sin ambigüedad.

---

```
# Contexto del proyecto

Estamos trabajando en un proyecto llamado **ForgeTask**, un gestor de tareas interno 
para equipos de desarrollo. El backend es **Spring Boot (Java)** conectado a una 
**Oracle Autonomous Database (ADB 26ai)** mediante wallet OCI. El proyecto ya existe 
y tiene implementado: Kanban con WebSockets, KPIs de rendimiento, bot de Telegram, 
y un generador de reportes que usa un LLM (Groq con llama-3.1-8b-instant, compatible 
con la API de OpenAI).

Se está implementando una nueva feature de **RAG (Retrieval-Augmented Generation)** 
para enriquecer los reportes administrativos con contexto histórico vectorizado. 
La base de datos ya tiene preparado lo siguiente:
- Modelo ONNX `ALL_MINILM_L12_V2` importado en el schema ADMIN de Oracle ADB 26ai 
  (384 dimensiones, FLOAT32)
- Tabla `APP_USER.SPRINT_EMBEDDINGS` con columna `EMBEDDING VECTOR(384, FLOAT32)` 
  e índice HNSW con distancia COSINE
- Tabla `APP_USER.KNOWLEDGE_BASE_EMBEDDINGS` con columna `EMBEDDING VECTOR(384, FLOAT32)` 
  e índice HNSW con distancia COSINE
- Sinónimos creados para que APP_USER acceda a ambas tablas transparentemente
- Columna `STATUS VARCHAR2(10)` agregada a `APP_USER.SPRINT` con valores posibles: 
  'PLANNED', 'ACTIVE', 'CLOSED', y constraint CHECK
- Índice único condicional `UX_SPRINT_ACTIVE_PROJECT` que garantiza solo un sprint 
  ACTIVE por proyecto

El DDL exacto de las tablas relevantes es:

```sql
-- Tabla principal de tareas
CREATE TABLE APP_USER.TASK (
    ID_TASK        NUMBER(*,0) NOT NULL PRIMARY KEY,
    ID_USER        NUMBER(*,0) NOT NULL,
    ID_PROJECT     NUMBER(*,0) NOT NULL,
    ID_SPRINT      NUMBER(*,0),
    TITLE          VARCHAR2(200) NOT NULL,
    DESCRIPTION    VARCHAR2(2000),
    START_DATE     TIMESTAMP(6),
    END_DATE       TIMESTAMP(6),
    ESTIMATED_TIME NUMBER(10,2),
    REAL_TIME      NUMBER(10,2),
    FOREIGN KEY (ID_USER)    REFERENCES APP_USER.USER_ACCOUNT(ID_USER),
    FOREIGN KEY (ID_PROJECT) REFERENCES APP_USER.PROJECT(ID_PROJECT),
    FOREIGN KEY (ID_SPRINT)  REFERENCES APP_USER.SPRINT(ID_SPRINT) ON DELETE CASCADE
);

-- Tabla de sprints (ya tiene la columna STATUS agregada)
CREATE TABLE APP_USER.SPRINT (
    ID_SPRINT   NUMBER(*,0) NOT NULL PRIMARY KEY,
    ID_PROJECT  NUMBER(*,0) NOT NULL,
    TITLE       VARCHAR2(200) NOT NULL,
    GOAL        VARCHAR2(2000),
    START_DATE  TIMESTAMP(6),
    END_DATE    TIMESTAMP(6),
    STATUS      VARCHAR2(10) DEFAULT 'PLANNED' NOT NULL,
    FOREIGN KEY (ID_PROJECT) REFERENCES APP_USER.PROJECT(ID_PROJECT)
);

-- Tabla vectorial de sprints (schema APP_USER vía sinónimo → ADMIN)
CREATE TABLE SPRINT_EMBEDDINGS (
    ID_EMBEDDING  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ID_SPRINT     NUMBER(*,0)    NOT NULL,
    ID_PROJECT    NUMBER(*,0)    NOT NULL,
    SPRINT_TITLE  VARCHAR2(200)  NOT NULL,
    CHUNK_TEXT    VARCHAR2(4000) NOT NULL,
    EMBEDDING     VECTOR(384, FLOAT32) NOT NULL,
    CLOSED_AT     TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);
```

---

# Lo que necesito que implementes

Implementa las siguientes clases y cambios en el proyecto Spring Boot existente. 
Respeta los patrones y convenciones ya existentes en el proyecto (nombres de paquetes, 
uso de JdbcTemplate, inyección de dependencias con @Autowired o constructor, 
manejo de excepciones con try/catch y logs con SLF4J).

## 1. Dependencias — agregar al pom.xml existente

Agregar las siguientes dependencias sin eliminar las existentes:

```xml
<dependency>
    <groupId>dev.langchain4j</groupId>
    <artifactId>langchain4j</artifactId>
    <version>0.36.2</version>
</dependency>
<dependency>
    <groupId>dev.langchain4j</groupId>
    <artifactId>langchain4j-oracle</artifactId>
    <version>0.36.2</version>
</dependency>
<dependency>
    <groupId>dev.langchain4j</groupId>
    <artifactId>langchain4j-open-ai</artifactId>
    <version>0.36.2</version>
</dependency>
```

## 2. Variables de entorno — agregar al application.yml existente

```yaml
spring:
  datasource:
    vector:
      url: ${DB_26AI_URL}
      username: ${DB_26AI_USER}
      password: ${DB_26AI_PASSWORD}
      driver-class-name: oracle.jdbc.OracleDriver

rag:
  vector:
    top-k: ${VECTOR_TOP_K:5}
    embedding-model: ${VECTOR_EMBEDDING_MODEL:ADMIN.ALL_MINILM_L12_V2}
```

Nota: el modelo se referencia como `ADMIN.ALL_MINILM_L12_V2` porque fue importado 
en el schema ADMIN y APP_USER accede a él con ese prefijo.

## 3. VectorDatabaseConfig.java

Crear en el paquete de configuración existente del proyecto. Debe:
- Definir un segundo DataSource bean llamado `vectorDataSource` que use las 
  variables DB_26AI_URL, DB_26AI_USER, DB_26AI_PASSWORD
- Definir un JdbcTemplate bean llamado `vectorJdbcTemplate` que use ese DataSource
- Usar @Qualifier en ambos beans para evitar conflicto con el DataSource principal
- El DataSource principal existente debe marcarse con @Primary si no lo está ya

## 4. SprintChunkBuilder.java

Crear en el paquete de servicios existente. Debe:
- Usar el JdbcTemplate PRINCIPAL (el de la 19c / base operacional, no el vectorial)
  porque lee datos de SPRINT y TASK que viven en la base operacional
- Tener un método público `buildSprintChunk(Long idSprint)` que retorne un String
- Internamente ejecutar esta query SQL exacta para obtener los datos del sprint:

```sql
SELECT
    s.TITLE           AS sprint_title,
    s.GOAL            AS sprint_goal,
    s.START_DATE,
    s.END_DATE,
    COUNT(t.ID_TASK)                                        AS total_tasks,
    SUM(t.ESTIMATED_TIME)                                   AS total_estimated_h,
    SUM(NVL(t.REAL_TIME, 0))                                AS total_real_h,
    COUNT(DISTINCT t.ID_USER)                               AS members_count,
    SUM(CASE WHEN t.REAL_TIME IS NOT NULL
             AND t.REAL_TIME <= t.ESTIMATED_TIME
             THEN 1 ELSE 0 END)                             AS tasks_on_time,
    SUM(CASE WHEN t.REAL_TIME IS NULL THEN 1 ELSE 0 END)    AS tasks_incomplete
FROM APP_USER.SPRINT s
LEFT JOIN APP_USER.TASK t ON t.ID_SPRINT = s.ID_SPRINT
WHERE s.ID_SPRINT = ?
GROUP BY s.TITLE, s.GOAL, s.START_DATE, s.END_DATE
```

- Con los datos obtenidos, construir y retornar el siguiente texto narrativo 
  (es importante que sea narrativo, no JSON ni campos sueltos, para que el 
  embedding sea semánticamente rico):

```
Sprint: "{sprint_title}". Periodo: {start_date} al {end_date}.
Objetivo: {sprint_goal}.
Tareas planificadas: {total_tasks}. Completadas: {completed_tasks} ({completion_rate}%).
Horas estimadas: {total_estimated_h}h. Horas reales: {total_real_h}h. Desvío: {deviation_pct}%.
Tareas entregadas a tiempo: {tasks_on_time}. Tareas sin cerrar: {tasks_incomplete}.
Miembros participantes: {members_count}.
```

  Donde:
  - `completed_tasks` = total_tasks - tasks_incomplete
  - `completion_rate` = (completed_tasks / total_tasks) * 100, redondeado a 0 decimales
  - `deviation_pct` = ((total_real_h - total_estimated_h) / total_estimated_h) * 100, 
     con signo (+/-), redondeado a 1 decimal. Si estimated_h es 0, mostrar 0.0%
  - Las fechas deben formatearse como dd/MMM/yyyy (ej: 01/Mar/2025)

## 5. SprintEmbeddingService.java

Crear en el paquete de servicios existente. Debe:
- Usar el `vectorJdbcTemplate` (@Qualifier) para escribir en SPRINT_EMBEDDINGS
- Tener un método público `indexSprint(Long idSprint, Long idProject, String sprintTitle)`
- Internamente:
  1. Llamar a `SprintChunkBuilder.buildSprintChunk(idSprint)` para obtener el texto
  2. Ejecutar el siguiente MERGE en la base vectorial usando `vectorJdbcTemplate`:

```sql
MERGE INTO SPRINT_EMBEDDINGS tgt
USING (
    SELECT
        :idSprint   AS id_sprint,
        :idProject  AS id_project,
        :title      AS sprint_title,
        :chunkText  AS chunk_text,
        VECTOR_EMBEDDING(ADMIN.ALL_MINILM_L12_V2 USING :chunkText AS DATA) AS emb
    FROM DUAL
) src ON (tgt.ID_SPRINT = src.id_sprint)
WHEN MATCHED THEN
    UPDATE SET
        tgt.CHUNK_TEXT  = src.chunk_text,
        tgt.EMBEDDING   = src.emb,
        tgt.CLOSED_AT   = SYSTIMESTAMP
WHEN NOT MATCHED THEN
    INSERT (ID_SPRINT, ID_PROJECT, SPRINT_TITLE, CHUNK_TEXT, EMBEDDING)
    VALUES (src.id_sprint, src.id_project, src.sprint_title, src.chunk_text, src.emb)
```

  Usar `MapSqlParameterSource` o `Map.of()` para los parámetros nombrados.
- Envolver todo en try/catch. Si falla, loggear el error con SLF4J pero NO 
  relanzar la excepción — el cierre del sprint no debe fallar por un error 
  de indexación. El sprint ya quedó CLOSED en la DB principal.

## 6. VectorContextRetriever.java

Crear en el paquete de servicios existente. Debe:
- Usar el `vectorJdbcTemplate` (@Qualifier)
- Leer el valor de top-k desde `@Value("${rag.vector.top-k:5}")`
- Tener un método público:
  `List<String> retrieveSprintContext(String queryText, Long excludeSprintId, Long idProject)`
- Ejecutar la siguiente query en la base vectorial:

```sql
SELECT CHUNK_TEXT
FROM SPRINT_EMBEDDINGS
WHERE ID_PROJECT = :idProject
  AND ID_SPRINT  != :excludeId
ORDER BY VECTOR_DISTANCE(
    EMBEDDING,
    VECTOR_EMBEDDING(ADMIN.ALL_MINILM_L12_V2 USING :queryText AS DATA),
    COSINE
)
FETCH FIRST :topK ROWS ONLY
```

- Retornar la lista de CHUNK_TEXT resultantes
- Si la lista viene vacía, retornar una lista vacía (no null, no excepción)

## 7. Cambios en SprintService.java (clase ya existente)

Localizar la clase SprintService existente y agregar:

- Inyectar `SprintEmbeddingService` por constructor o @Autowired
- Agregar el método `closeSprint(Long idSprint)` que debe:
  1. Buscar el sprint por idSprint (usar el repositorio ya existente)
  2. Validar que el STATUS actual sea 'ACTIVE'. Si no lo es, lanzar 
     `IllegalStateException("Solo se puede cerrar un sprint en estado ACTIVE")`
  3. Cambiar STATUS a 'CLOSED' y guardar
  4. Llamar a `sprintEmbeddingService.indexSprint(...)` con los datos del sprint guardado
  5. Retornar el SprintDTO mapeado (usar el mapper ya existente en el proyecto)
- Agregar el método `activateSprint(Long idSprint)` que debe:
  1. Buscar el sprint por idSprint
  2. Validar que el STATUS actual sea 'PLANNED'. Si no, lanzar IllegalStateException
  3. Cambiar STATUS a 'ACTIVE' y guardar
  4. Retornar el SprintDTO mapeado

## 8. Cambios en SprintController.java (clase ya existente)

Agregar los siguientes endpoints al controller existente, respetando la 
estructura de rutas ya establecida en el proyecto:

```
PUT /sprints/{idSprint}/activate  → sprintService.activateSprint(idSprint)
PUT /sprints/{idSprint}/close     → sprintService.closeSprint(idSprint)
```

Ambos deben retornar `ResponseEntity<SprintDTO>`.

## 9. Cambios en LLMService.java (clase ya existente)

Localizar la clase LLMService existente y modificar el método que genera 
el reporte de sprint para que use RAG. Debe:

- Inyectar `VectorContextRetriever` y `SprintChunkBuilder`
- Modificar (o crear si no existe) el método de generación de reporte para que:
  1. Construya el chunk del sprint actual con `SprintChunkBuilder.buildSprintChunk(idSprint)`
  2. Recupere contexto histórico con `VectorContextRetriever.retrieveSprintContext(...)`
     pasando el chunk como queryText, el idSprint como excludeSprintId, y el idProject
  3. Construya el contextBlock: si la lista viene vacía usar el texto 
     "No hay sprints históricos disponibles aún para comparación.", si no, 
     concatenar cada chunk con formato "Sprint histórico N:\n{chunk}"
  4. Construir el siguiente prompt y enviarlo al LLM usando la integración 
     ya existente en el proyecto:

```
Eres un analista de proyectos ágiles. Tu tarea es generar un reporte administrativo 
de retroalimentación sobre el siguiente sprint.

=== SPRINT ACTUAL ===
{currentSprintChunk}

=== CONTEXTO HISTÓRICO (sprints anteriores del mismo proyecto) ===
{contextBlock}

Genera un reporte ejecutivo que incluya:
1. Resumen de desempeño del sprint actual.
2. Comparación con sprints anteriores (si hay contexto disponible).
3. Áreas de mejora identificadas con base en los datos.
4. Recomendaciones concretas y accionables para el siguiente sprint.

Sé específico y basa tus observaciones únicamente en los datos proporcionados.
Responde en español.
```

## 10. Sprint entity/model (clase ya existente)

Localizar la clase Java que mapea la tabla SPRINT (puede ser una entidad JPA 
o un POJO) y agregar el campo STATUS:
- Tipo String en Java
- Valor por defecto: "PLANNED"
- Si usa JPA: `@Column(name = "STATUS")` 
- Si usa un RowMapper manual: agregar el mapeo de la columna STATUS

También actualizar el SprintDTO correspondiente para incluir el campo status.

---

# Restricciones importantes para la implementación

1. NO modificar ni eliminar ninguna clase, método o configuración existente 
   que no esté mencionada explícitamente arriba.

2. El `vectorJdbcTemplate` usa Named Parameters (`:param`), así que los métodos 
   que lo usen deben usar `NamedParameterJdbcTemplate`, no `JdbcTemplate` estándar. 
   Ajustar `VectorDatabaseConfig` para exponer `NamedParameterJdbcTemplate` en lugar 
   de `JdbcTemplate` si es necesario.

3. El modelo de embedding se llama `ADMIN.ALL_MINILM_L12_V2` con el prefijo de 
   schema en todos los queries SQL porque fue importado en el schema ADMIN y 
   APP_USER lo accede con ese prefijo. No usar `ALL_MINILM_L12_V2` sin prefijo.

4. Todos los nuevos servicios deben tener logs con SLF4J 
   (`LoggerFactory.getLogger(NombreClase.class)`).

5. Respetar los paquetes existentes del proyecto. Si el proyecto tiene paquetes 
   como `com.forgetask.service`, `com.forgetask.config`, `com.forgetask.controller`, 
   crear las nuevas clases en esos mismos paquetes.

6. No agregar dependencias adicionales a las especificadas en este prompt.
```