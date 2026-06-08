# ForgeTask — Dashboard de Productividad de Desarrolladores

> **Entrega académica:** Sprint 5, Módulo 6 Advanced Web  
> **Materia:** Advanced Web (Francisco)  
> **Fecha de entrega:** 12 de junio de 2026

---

## Descripción general del sistema

ForgeTask es un sistema Full Stack orientado a la gestión y visualización de productividad de equipos de desarrollo de software. Permite a los equipos organizar su trabajo mediante un tablero Kanban, gestionar sprints, y visualizar métricas de desempeño individuales y grupales a través de un dashboard interactivo.

El sistema integra funcionalidades avanzadas como actualizaciones en tiempo real vía WebSockets, un bot de Telegram para gestión de tareas desde dispositivos móviles, y generación de reportes en PDF con análisis impulsado por LLM.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (React) + TypeScript + Tailwind CSS |
| Backend | Spring Boot 3 + Spring Web + Spring Security |
| Base de datos | Oracle Autonomous Transaction Processing (ATP) |
| Comunicación en tiempo real | WebSockets (STOMP over SockJS) |
| Autenticación | JWT (JSON Web Tokens) |
| Contenedores | Docker + Docker Compose |
| Pruebas E2E | Selenium + Python (pytest) |
| Pruebas unitarias | JUnit 5 + Mockito |

---

## Arquitectura general

```
┌─────────────────────────────┐      REST API       ┌──────────────────────────────┐
│   Frontend (Next.js :3000)  │ ◄─────────────────► │  Backend (Spring Boot :8080) │
│                             │                      │                              │
│  /kpis     → Dashboard KPIs │      WebSocket       │  Controller  (REST + WS)     │
│  /         → Kanban Board   │ ◄─────────────────► │  Service     (lógica)        │
│  /login    → Autenticación  │                      │  Repository  (JPA + JDBC)    │
│  /onboarding → Crear proyecto│                     │  DTO         (contratos API) │
└─────────────────────────────┘                      │  Model       (entidades JPA) │
                                                     └──────────────┬───────────────┘
                                                                    │
                                                             ┌──────▼──────┐
                                                             │  Oracle ATP │
                                                             │  (Cloud DB) │
                                                             └─────────────┘
```

---

## Métricas del dashboard

El dashboard en `/kpis` visualiza las siguientes métricas de productividad:

| KPI | Descripción | Fuente |
|-----|-------------|--------|
| Total de tareas | Cantidad total de tareas del proyecto | `TASK` table |
| Tareas por estado | Backlog / Ready / In Progress / Review / Done | `TASK_STATE` table |
| Horas reales vs estimadas | Varianza entre tiempo planificado y ejecutado | `TASK.REAL_TIME` / `TASK.ESTIMATED_TIME` |
| Tareas promedio por desarrollador | Total tasks / número de devs | Calculado en `KPIService` |
| Horas promedio por desarrollador | Horas reales / número de devs | Calculado en `KPIService` |
| Horas reales por usuario | Desglose individual de productividad | `getRealHoursByUser()` |
| Horas por sprint y usuario | Comparativo histórico entre sprints | `getRealHoursBySprintUser()` |

---

## Estructura del proyecto

```
jrv-xvi-oci-chatbot/
├── forgetask/                          ← Backend Spring Boot
│   └── src/main/java/.../forgetask/
│       ├── controller/                 ← Endpoints REST (KPI, Task, Sprint, Auth...)
│       ├── service/                    ← Lógica de negocio (KPIService, AuthService...)
│       ├── repository/                 ← Acceso a datos (JPA Repositories)
│       ├── dto/                        ← Objetos de transferencia de datos
│       ├── model/                      ← Entidades JPA (Project, UserAccount...)
│       ├── security/                   ← JWT Filter y Util
│       ├── config/                     ← Configuraciones (CORS, Security, WS...)
│       └── util/                       ← Utilidades del bot de Telegram
│
├── forgetask-frontend/                 ← Frontend Next.js
│   └── app/
│       ├── components/
│       │   ├── kanban/                 ← Tablero Kanban (KanbanApp, task-card...)
│       │   ├── kpis/                   ← Componentes de métricas (KpiCards...)
│       │   ├── chart/                  ← Gráficas (RealTotalHoursByUserKpi)
│       │   ├── layout/                 ← Sidebar y layout general
│       │   └── ui/                     ← Componentes reutilizables (Card, DonutChart...)
│       ├── services/                   ← Clientes HTTP (kpiService, taskService...)
│       ├── hooks/                      ← Custom hooks (useTaskWebSocket)
│       ├── store/                      ← Estado global (taskStore)
│       └── types/                      ← Tipos TypeScript (Task, Sprint, Project)
│
└── tests/selenium/                     ← Suite de pruebas E2E
```

---

## Cómo ejecutar el proyecto localmente

### Prerrequisitos

- Docker Desktop 24+ con WSL2 habilitado
- El wallet de Oracle ATP en `forgetask/wallet/`
- Archivo `.env` en la raíz con las credenciales

### 1. Configurar credenciales

```bash
cp .env.example .env
# Editar .env con los valores reales:
# DB_USER=<usuario_oracle>
# DB_PASSWORD=<password_oracle>
# TELEGRAM_BOT_ENABLED=false
```

### 2. Levantar el entorno de desarrollo

```bash
docker compose -f docker-compose.dev.yml up
```

| Servicio | URL |
|----------|-----|
| Frontend (Next.js) | http://localhost:3000 |
| Backend (Spring Boot) | http://localhost:8080 |
| Health check | http://localhost:8080/health |

### 3. Verificar que funciona

```bash
# Backend responde
curl http://localhost:8080/health

# KPI endpoint disponible
curl http://localhost:8080/api/kpi/health
```

---

## Endpoints REST principales

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/signup` | Registro de usuario |
| POST | `/api/auth/login` | Login, retorna JWT |

### KPIs y métricas
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/kpi/calculate` | Calcula KPIs desde lista de tareas |
| POST | `/api/kpi/calculate-simple` | Cálculo sin detección de sobrecarga |
| POST | `/api/kpi/distribution` | Distribución de tareas por estado |
| POST | `/api/kpi/time-summary` | Resumen de horas (real vs estimado) |
| GET | `/api/kpi/real-hours-by-user` | Horas reales por usuario (opcional: `?sprintId=N`) |
| GET | `/api/kpi/real-hours-by-sprint-user` | Horas por sprint y usuario |
| GET | `/api/metrics/project-kpis-summary?projectId=N` | KPIs completos del proyecto |

### Tareas y sprints
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/tasks?projectId=N` | Listar tareas del proyecto |
| POST | `/api/tasks` | Crear tarea |
| PUT | `/api/tasks/{id}` | Actualizar tarea |
| DELETE | `/api/tasks/{id}` | Eliminar tarea |
| GET | `/api/sprints?projectId=N` | Listar sprints |
| POST | `/api/sprints` | Crear sprint |

---

## Arquitectura del backend — capas

El backend implementa arquitectura en capas con separación clara de responsabilidades:

```
Request HTTP
     │
     ▼
┌─────────────┐
│ Controller  │  Recibe la petición, valida parámetros básicos, delega al service.
│             │  No contiene lógica de negocio.
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Service   │  Contiene la lógica de negocio. Orquesta repositorios.
│             │  Transforma entidades a DTOs.
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Repository  │  Acceso a datos. JPA Repositories + JdbcTemplate para queries complejas.
│             │  No conoce la lógica de negocio.
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Oracle ATP │  Base de datos. Tablas: TASK, TASK_STATE, SPRINT, USER_ACCOUNT,
│             │  USER_ROLE, PROJECT, PROJECT_INVITE.
└─────────────┘
```

**DTOs utilizados:**

| DTO | Propósito |
|-----|-----------|
| `TaskDTO` | Transferencia de datos de tareas entre frontend y backend |
| `KPIMetrics` | Resultado de cálculo de KPIs en memoria |
| `ProjectKpisSummaryDTO` | KPIs completos del proyecto desde BD |
| `RealHoursByUserDTO` | Horas reales agregadas por usuario |
| `RealHoursBySprintUserDTO` | Horas por sprint y usuario para gráficas |
| `LoginRequestDTO` / `LoginResponseDTO` | Autenticación |

---

## Organización del frontend

```
app/
├── components/kpis/          ← KpiCards con NumberTicker animado
│   ├── TotalTasksKpi.tsx     ← Total de tareas del proyecto
│   ├── TotalHoursKpi.tsx     ← Horas reales totales
│   ├── AvgTasksKpi.tsx       ← Promedio de tareas por desarrollador
│   ├── AvgHoursDevKpi.tsx    ← Promedio de horas por desarrollador
│   └── UserTasksCompletionKpi.tsx ← % de completitud por usuario
│
├── components/chart/
│   └── RealTotalHoursByUserKpi.tsx  ← Gráfica de barras (horas reales por dev)
│
└── components/kanban/        ← Tablero interactivo con drag & drop
    ├── KanbanApp.tsx         ← Componente principal
    ├── project-board.tsx     ← Columnas de estado
    ├── task-card.tsx         ← Tarjeta individual de tarea
    └── add-task-dialog.tsx   ← Modal de creación de tarea
```

**Consumo de la API REST:**

Todos los servicios del frontend están centralizados en `app/services/`:

```typescript
// Ejemplo: kpiService.ts
import { apiClient } from './apiClient';

export const getProjectKpisSummary = (projectId: number) =>
  apiClient.get(`/api/metrics/project-kpis-summary?projectId=${projectId}`);

export const getRealHoursByUser = (sprintId?: number) =>
  apiClient.get(`/api/kpi/real-hours-by-user${sprintId ? `?sprintId=${sprintId}` : ''}`);
```

---

## Pruebas unitarias (KPIServiceTest)

Se implementaron pruebas unitarias para `KPIService` usando **JUnit 5 + Mockito**. El `JdbcTemplate` se mockea para aislar la lógica de cálculo en memoria sin necesitar base de datos.

**Casos de prueba cubiertos:**

| Test | Escenario |
|------|-----------|
| `calculateKPIs_emptyList_returnsZeroMetrics` | Lista vacía → todos los valores en 0 |
| `calculateKPIs_mixedStatuses_returnsCorrectCounts` | 6 tareas en estados distintos → conteos correctos |
| `calculateKPIs_allDone_progressIs100` | Todas en done → progreso 100% |
| `calculateKPIs_backlogOverloaded_flagIsTrue` | 3 tareas en backlog, límite=2 → flag true |
| `calculateKPIs_withinLimits_noOverload` | 2 tareas, límite=3 → sin sobrecarga |
| `calculateKPIs_nullStatus_doesNotThrow` | Status null → no lanza excepción |
| `getTaskDistributionByStatus_countsAllStatuses` | Distribución correcta por estado |
| `getTaskDistributionByStatus_emptyList_allZero` | Lista vacía → todos en 0 |
| `getTimeMetricsSummary_positiveVariance` | Real > estimado → varianza positiva |
| `getTimeMetricsSummary_emptyList_returnsZeros` | Lista vacía → zeros sin excepción |

**Ejecutar las pruebas:**
```bash
# Desde la raíz del proyecto
cd forgetask
./mvnw test -Dtest=KPIServiceTest

# O ejecutar todos los tests
./mvnw test
```

---

## Pruebas E2E con Selenium

La carpeta `tests/selenium/` contiene una suite de pruebas de extremo a extremo:

| Archivo | Caso de prueba |
|---------|----------------|
| `test_01_create_task.py` | Crear tarea y validar presencia en backlog |
| `test_02_edit_task_status.py` | Editar estado y validar movimiento de columna |
| `test_03_delete_task.py` | Eliminar tarea y validar que desaparezca |
| `test_04_create_sprint.py` | Crear sprint y validar solapamiento de fechas |

```bash
# Instalar dependencias
python -m venv .venv && source .venv/bin/activate
pip install -r tests/requirements-test.txt

# Ejecutar tests E2E (requiere la app corriendo)
pytest tests/selenium/ -v
```

---

## Análisis técnico — errores y áreas de mejora identificadas

Ver archivo [`PROPUESTAS_MEJORA.md`](./PROPUESTAS_MEJORA.md) para el análisis detallado con:

- **Propuesta 1:** Caché con `@Cacheable` en `KPIService` para reducir carga sobre Oracle ATP.
- **Propuesta 2:** Separar `TaskDTO` en `TaskRequestDTO` y `TaskResponseDTO` (SRP).
- **Propuesta 3:** Reorganizar el paquete `util/` en submódulos por dominio (`bot/actions/`, `bot/conversation/`, `bot/ui/`).

---

## Entregables

| Entregable | Ubicación |
|-----------|-----------|
| Código fuente backend | `forgetask/` |
| Código fuente frontend | `forgetask-frontend/` |
| Pruebas unitarias | `forgetask/src/test/.../KPIServiceTest.java` |
| Pruebas E2E | `tests/selenium/` |
| README (este archivo) | `README_ENTREGA.md` |
| Propuestas de mejora | `PROPUESTAS_MEJORA.md` |
| Video de presentación | _(enlace al video)_ |