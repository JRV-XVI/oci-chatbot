# Propuestas de Mejora Técnica — ForgeTask

> **Proyecto:** ForgeTask — Dashboard de Productividad de Desarrolladores  
> **Stack:** Spring Boot 3 · Next.js · Oracle ATP · WebSockets · Telegram Bot  
> **Módulo evaluado:** Backend (`forgetask/src/main/java/com/cloudforge/api/forgetask/`)

---

## Propuesta 1 — Caché de resultados en KPIService con `@Cacheable`

### Problema identificado

`KPIService` ejecuta consultas SQL complejas en Oracle cada vez que un cliente accede al dashboard de KPIs. Los métodos `getRealHoursByUser`, `getRealHoursBySprintUser` y `getProjectKpisSummary` contienen queries con múltiples `JOIN`, subconsultas y funciones de agregación que son costosas en tiempo de respuesta y carga sobre la base de datos.

En el estado actual, si cinco usuarios tienen el dashboard abierto simultáneamente y el frontend realiza polling cada 30 segundos, se ejecutan ~10 queries pesadas por minuto contra Oracle ATP —sin importar si los datos cambiaron o no.

### Justificación técnica

Los KPIs del dashboard tienen una frecuencia de actualización natural baja: las métricas de horas reales y tareas completadas solo cambian cuando un desarrollador actualiza el estado de una tarea. Ejecutar la misma query N veces en el mismo intervalo de tiempo sin datos nuevos es un desperdicio de recursos medible.

Spring Boot incluye soporte nativo para caché mediante `spring-boot-starter-cache` y la abstracción `CacheManager`, compatible con backends como Caffeine (in-memory) o Redis (distribuido). La anotación `@Cacheable` permite decorar un método para que su resultado se almacene la primera vez y se reutilice en llamadas sucesivas con los mismos parámetros.

### Beneficios esperados

- Reducción de hasta 80–90% en queries a Oracle para endpoints de solo lectura del dashboard.
- Tiempo de respuesta percibido por el usuario de ~500ms a <50ms en accesos subsiguientes.
- Mayor tolerancia a picos de carga sin incrementar los costos de la instancia ATP.
- Sin cambios en la API pública ni en el frontend.

### Implementación propuesta

**1. Agregar dependencia en `pom.xml`:**
```xml
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
```

**2. Habilitar caché en la aplicación:**
```java
// ForgetaskApplication.java
@SpringBootApplication
@EnableCaching  // agregar esta anotación
public class ForgetaskApplication { ... }
```

**3. Configurar TTL en `application.properties`:**
```properties
spring.cache.type=caffeine
spring.cache.caffeine.spec=maximumSize=200,expireAfterWrite=2m
```

**4. Decorar los métodos de KPIService:**
```java
@Cacheable(value = "kpi-by-user", key = "#sprintId != null ? #sprintId : 'all'")
public List<RealHoursByUserDTO> getRealHoursByUser(Integer sprintId) { ... }

@Cacheable(value = "kpi-summary", key = "#projectId")
public ProjectKpisSummaryDTO getProjectKpisSummary(Integer projectId) { ... }

// Invalidar cuando cambia el estado de una tarea:
@CacheEvict(value = {"kpi-by-user", "kpi-summary"}, allEntries = true)
public TaskDTO updateTaskStatus(String taskId, String newStatus) { ... }
```

---

## Propuesta 2 — Separar `TaskDTO` en `TaskRequestDTO` y `TaskResponseDTO`

### Problema identificado

`TaskDTO` (ubicado en `dto/TaskDTO.java`) es utilizado actualmente en dos contextos con responsabilidades opuestas: como objeto de entrada en endpoints POST/PUT (recibir datos del cliente) y como objeto de salida en endpoints GET (devolver datos al cliente).

Esto se observa directamente en `KPIController`:
```java
// Recibe TaskDTO del cliente como entrada:
@PostMapping("/calculate")
public ResponseEntity<KPIMetrics> calculateKPIs(@RequestBody KPICalculationRequest request)
// donde KPICalculationRequest contiene List<TaskDTO>

// También devuelve TaskDTO como salida en TaskController
```

El mismo DTO contiene campos que solo tienen sentido al recibir datos (`assignedUsername`, `assignedRole`) y campos calculados que solo tienen sentido al responder (`sprintNumber`, `sprintTitle`). Al mezclarlos, cualquier validación de entrada (`@NotNull`, `@Size`) contaminaría el objeto de respuesta, y cualquier campo calculado de respuesta aparece en el contrato de entrada del cliente.

### Justificación técnica

El principio de Responsabilidad Única (SRP) establece que una clase debe tener una sola razón para cambiar. `TaskDTO` actualmente cambia cuando: (a) el cliente necesita enviar nuevos campos, (b) el servidor necesita devolver nuevos campos calculados, o (c) las reglas de validación de entrada cambian. Estas son tres razones distintas.

Separar en `TaskRequestDTO` y `TaskResponseDTO` permite:
- Agregar validaciones Bean Validation (`@NotNull`, `@Min`, `@Size`) exclusivamente en el DTO de entrada, sin afectar la serialización de salida.
- Evolucionar el contrato de respuesta (añadir campos calculados, formatear fechas) sin romper el contrato de entrada.
- Documentación OpenAPI/Swagger más precisa, mostrando los campos correctos en cada operación.

### Beneficios esperados

- Eliminación del acoplamiento entre validación de entrada y serialización de salida.
- Contratos de API más claros para integraciones futuras (ej. el bot de Telegram ya consume la API).
- Facilita testing independiente de cada contrato.
- Preparación para futuras versiones de la API sin breaking changes.

### Implementación propuesta

```java
// dto/task/TaskRequestDTO.java — solo lo que el cliente envía
public class TaskRequestDTO {
    @NotBlank(message = "El título es obligatorio")
    private String title;
    
    private String description;
    
    @Pattern(regexp = "backlog|ready|in-progress|review|done")
    private String status;
    
    @Pattern(regexp = "low|medium|high")
    private String priority;
    
    @Min(value = 0, message = "Las horas estimadas no pueden ser negativas")
    private Double estimatedTime;
    
    private Double realTime;
    private String assignedUsername;
    private Integer sprintId;
}

// dto/task/TaskResponseDTO.java — lo que el servidor devuelve
public class TaskResponseDTO {
    private String id;
    private String title;
    private String description;
    private String status;
    private String priority;
    private String startDate;
    private String endDate;
    private Double estimatedTime;
    private Double realTime;
    private String assignedUsername;
    private String assignedDisplayName;  // campo calculado
    private Integer sprintId;
    private Integer sprintNumber;        // campo calculado
    private String sprintTitle;          // campo calculado
}
```

**Migración en el controlador:**
```java
// Antes:
@PostMapping
public ResponseEntity<TaskDTO> createTask(@RequestBody TaskDTO task) { ... }

// Después:
@PostMapping
public ResponseEntity<TaskResponseDTO> createTask(@Valid @RequestBody TaskRequestDTO request) { ... }
```

---

## Propuesta 3 — Reorganizar el paquete `util/` en submódulos por dominio

### Problema identificado

El paquete `util/` contiene actualmente 10 clases con responsabilidades heterogéneas mezcladas en el mismo nivel:

```
util/
├── BotActions.java           ← Acciones del bot Telegram
├── BotCommands.java          ← Comandos del bot Telegram  
├── BotHelper.java            ← Utilidades del bot Telegram
├── BotLabels.java            ← Labels de UI del bot Telegram
├── BotMessages.java          ← Mensajes del bot Telegram
├── ConversationalTaskCreator.java  ← Lógica conversacional Telegram
├── ConversationManager.java        ← Gestión de estado conversacional
├── ConversationState.java          ← Enum/Model de estado
├── KeyboardBuilder.java            ← Construcción de teclados Telegram
└── TaskCreationStep.java           ← Enum de pasos de creación
```

Todas estas clases son exclusivas del bot de Telegram, pero coexisten en un paquete llamado `util/` que sugiere utilidades genéricas del sistema. Si en el futuro se necesitan verdaderas utilidades generales (formateo de fechas, validadores, etc.), no hay un lugar obvio donde colocarlas sin contaminar el paquete actual.

Adicionalmente, `HealthController.java` existe en la raíz del paquete principal (`forgetask/`), fuera de la carpeta `controller/`, violando la convención de organización por capas que el resto del proyecto sí sigue.

### Justificación técnica

La organización por dominio (también llamada _package by feature_) agrupa las clases según su responsabilidad funcional, no según su tipo técnico. Esto mejora la cohesión: todas las clases relacionadas al bot de Telegram están en un mismo paquete, facilitando encontrarlas, modificarlas y testarlas en conjunto.

El problema con `util/` genérico es que viola el Principio de Menor Sorpresa: un desarrollador nuevo al proyecto que busca "lógica del bot de Telegram" no buscaría en `util/`. La consecuencia práctica es más tiempo de onboarding y mayor probabilidad de crear código duplicado al no encontrar el existente.

### Beneficios esperados

- Reducción del tiempo de navegación de código para nuevos colaboradores.
- Cohesión de módulo: el paquete `bot/` encapsula todo lo relacionado con Telegram, permitiendo desactivar o reemplazar el bot sin afectar otros paquetes.
- Alineación con la arquitectura por capas que el resto del proyecto ya sigue (`controller/`, `service/`, `repository/`, `dto/`, `model/`).
- Base para futuros refactors: si el bot de Telegram se extrae a un microservicio, el paquete `bot/` ya está autocontenido.

### Implementación propuesta

```
util/                              →  bot/
├── BotActions.java                    ├── actions/
├── BotCommands.java                   │   ├── BotActions.java
├── BotHelper.java                     │   └── BotCommands.java
├── BotLabels.java                     ├── ui/
├── BotMessages.java                   │   ├── BotLabels.java
├── ConversationalTaskCreator.java     │   ├── BotMessages.java
├── ConversationManager.java           │   └── KeyboardBuilder.java
├── ConversationState.java             ├── conversation/
├── KeyboardBuilder.java               │   ├── ConversationalTaskCreator.java
└── TaskCreationStep.java              │   ├── ConversationManager.java
                                       │   ├── ConversationState.java
                                       │   └── TaskCreationStep.java
                                       └── BotHelper.java  ← util general del bot
```

**Corrección adicional — mover `HealthController` a la capa `controller/`:**
```
forgetask/
├── HealthController.java   ← actualmente en raíz ❌
controller/
├── HealthController.java   ← debe estar aquí ✅
```

**Pasos de migración:**
1. Crear los subpaquetes `bot/actions/`, `bot/ui/`, `bot/conversation/`.
2. Mover cada clase actualizando la declaración `package`.
3. Actualizar los `import` en `TelegramBotController.java` y `TelegramBotConfig.java`.
4. Mover `HealthController.java` a `controller/` y actualizar referencias.
5. Ejecutar `./mvnw compile` para verificar que no hay referencias rotas.

> **Nota:** Este cambio no requiere modificar ninguna lógica de negocio. Es puramente estructural y puede realizarse en un solo commit sin riesgo de regresiones funcionales.

---

## Resumen ejecutivo

| # | Propuesta | Impacto principal | Esfuerzo estimado |
|---|-----------|-------------------|-------------------|
| 1 | Caché `@Cacheable` en KPIService | Rendimiento | 2–3 horas |
| 2 | Separar `TaskDTO` en Request/Response | Mantenibilidad | 3–4 horas |
| 3 | Reorganizar `util/` → `bot/` por dominio | Legibilidad / Escalabilidad | 1–2 horas |

Las tres propuestas son independientes entre sí y pueden implementarse en cualquier orden. Se recomienda comenzar por la Propuesta 3 (menor riesgo, mayor impacto en legibilidad) seguida de la Propuesta 2 (impacto en contratos de API) y finalmente la Propuesta 1 (impacto en producción).