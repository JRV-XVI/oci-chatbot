# 🚀 WebSocket Real-Time Task Management - Documentación Completa

## 📋 Tabla de Contenidos
1. [¿Qué es WebSocket?](#qué-es-websocket)
2. [Tecnologías Utilizadas](#tecnologías-utilizadas)
3. [Estructura de Archivos](#estructura-de-archivos)
4. [Puertos y URLs](#puertos-y-urls)
5. [Cómo Ejecutar el Proyecto](#cómo-ejecutar-el-proyecto)
6. [Arquitectura General](#arquitectura-general)
7. [Flujo de Comunicación Detallado](#flujo-de-comunicación-detallado)
8. [Endpoints WebSocket](#endpoints-websocket)
9. [Endpoints REST](#endpoints-rest)
10. [Modelos de Datos](#modelos-de-datos)
11. [Ejemplos de Comunicación](#ejemplos-de-comunicación)
12. [Debugging](#debugging)

---

## ¿Qué es WebSocket?

**WebSocket** es un protocolo de comunicación bidireccional en tiempo real que permite:
- 🔄 **Comunicación bidireccional**: Cliente y servidor se comunican en ambas direcciones
- ⚡ **Tiempo real**: Actualizaciones instantáneas sin necesidad de polling
- 📡 **Persistente**: Una única conexión que permanece abierta
- 🎯 **Eficiente**: Menor ancho de banda comparado con polling tradicional

En este proyecto usamos **STOMP** (Simple Text Oriented Messaging Protocol) sobre WebSocket para una comunicación más estructurada.

---

## Tecnologías Utilizadas

### Backend (Java/Spring Boot)
```
✅ Spring Boot 4.0.5
✅ Spring WebSocket (spring-boot-starter-websocket)
✅ Spring STOMP (protocolo de mensajería)
✅ SockJS (fallback para navegadores antiguos)
✅ Java 21/22
✅ Oracle Database (JDBC)
✅ Maven (build tool)
```

### Frontend (TypeScript/React)
```
✅ Next.js 16.2.1
✅ React 19
✅ TypeScript
✅ @stomp/stompjs (cliente STOMP)
✅ sockjs-client (fallback WebSocket)
✅ Zustand (state management)
✅ react-dnd (drag & drop)
✅ Tailwind CSS
✅ npm (package manager)
```

---

## Estructura de Archivos

### 📁 Backend WebSocket

```
forgetask/
├── src/main/java/com/cloudforge/
│   ├── api/forgetask/
│   │   └── controller/
│   │       └── TaskWebSocketController.java      ⭐ CONTROLLERS WebSocket
│   ├── config/
│   │   └── WebSocketConfig.java                  ⭐ CONFIGURACIÓN WebSocket
│   ├── dto/
│   │   ├── TaskDTO.java                          ⭐ Estructura de dato (tarea)
│   │   ├── TaskEventMessage.java                 ⭐ Estructura de evento
│   │   └── TaskUpdateRequest.java                ⭐ Request del cliente
│   └── service/
│       └── TaskService.java                      📝 Lógica de negocios
└── pom.xml                                       📦 Dependencias
```

### 📁 Frontend WebSocket

```
forgetask-frontend/
├── app/
│   ├── hooks/
│   │   └── useTaskWebSocket.ts                   ⭐ CONEXIÓN WebSocket
│   ├── store/
│   │   └── taskStore.ts                          ⭐ ESTADO GLOBAL (Zustand)
│   ├── services/
│   │   └── taskService.ts                        📝 Llamadas REST iniciales
│   ├── components/kanban/
│   │   ├── KanbanApp.tsx                         ⭐ ORQUESTADOR principal
│   │   ├── ProjectBoard.tsx                      ⭐ INTERFAZ Kanban
│   │   ├── TaskCard.tsx                          📝 Tarjeta individual
│   │   ├── Column.tsx (parte de ProjectBoard)    📝 Columna Kanban
│   │   └── task-details-dialog.tsx               📝 Diálogo detalle
│   ├── types/
│   │   └── task.ts                               📝 Tipos TypeScript
│   └── types/
│       └── sockjs-client.d.ts                    📝 Declaración tipos sockjs
└── package.json                                  📦 Dependencias
```

---

## Puertos y URLs

### 🖥️ Backend
```
Protocolo: WebSocket (ws)
URL:       ws://localhost:8080/ws/tasks
ID:        WS_ENDPOINT_BACKEND

Protocolo: HTTP (REST)
URL:       http://localhost:8080/api/tasks
ID:        REST_API_BACKEND

Puerto:    8080
Host:      localhost
```

### 🌐 Frontend
```
Protocolo: HTTP
URL:       http://localhost:3000
Puerto:    3000
Host:      localhost

Cuando hace llamadas al backend, se conecta a: http://localhost:8080
```

---

## Cómo Ejecutar el Proyecto

### 📌 **PASO 1: Ejecutar el Backend**

```bash
# Navegar a la carpeta del backend
cd forgetask

# Opción A: Ejecutar con Maven (Recomendado)
./mvnw.cmd spring-boot:run
# En Mac/Linux:
./mvnw spring-boot:run

# Opción B: Compilar y ejecutar JAR
./mvnw.cmd clean package -DskipTests
java -jar target/forgetask-0.0.1-SNAPSHOT.jar

# Esperar a ver en consola:
# ✅ Started Application in X seconds
# ✅ WebSocket configured and ready
```

**Verificación**: Abre http://localhost:8080/api/tasks en el navegador
- Si ves un JSON con tareas → Backend correcto ✅

### 📌 **PASO 2: Ejecutar el Frontend**

```bash
# En otra terminal (NUEVA), navegar a la carpeta del frontend
cd forgetask-frontend

# Instalar dependencias (primera vez)
npm install

# Iniciar servidor de desarrollo
npm run dev

# Output esperado:
# ▲ Next.js 16.2.1
# - ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

**Verificación**: Abre http://localhost:3000 en el navegador
- Si ves el tablero Kanban → Frontend correcto ✅

### 📌 **PASO 3: Verificar Conexión WebSocket**

1. Abre http://localhost:3000
2. Abre Developer Tools: `F12` → pestaña **Console**
3. Deberías ver logs similares a:
   ```
   ✅ WebSocket conectado con STOMP: Command["CONNECTED"]
   📢 Suscrito a /topic/tasks para recibir eventos en tiempo real
   📥 Cargando tareas iniciales desde el backend...
   ✅ Tareas cargadas: 5
   ```

4. Pestaña **Network** → Buscar `ws` 
   - Deberías ver una conexión WebSocket activa en verde

---

## Arquitectura General

### 🏗️ Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                      NAVEGADOR (Frontend)                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   UI Layer   │  │ React Hooks  │  │  TypeScript  │       │
│  │              │  │              │  │   Types      │       │
│  │ ProjectBoard │→→│ useTaskWeb   │→→│   & DTOs     │       │
│  │ TaskCard     │  │ Socket()     │  │              │       │
│  └──────────────┘  └──────┬───────┘  └──────────────┘       │
│                           │                                   │
│                           ↓                                   │
│                  ┌─────────────────┐                          │
│                  │  Zustand Store  │ (Estado Global)        │
│                  │  taskStore.ts   │                         │
│                  └────────┬────────┘                          │
│                           │                                   │
│                           ↓                                   │
│  WebSocket Conexión (SockJS + STOMP) ←→  /ws/tasks         │
│           ↓                                        ↑          │
└───────────┼────────────────────────────────────────┼──────────┘
            │                                        │
            │ JSON Serialized Messages              │
            │ Protocol: STOMP over WebSocket        │
            │                                        │
      ┌─────┴────────────────────────────────────┬──┘
      │                                            │
      ↓                                            ↑
┌────────────────────────────────────────────────────────────┐
│                      SERVIDOR (Backend)                    │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │         Spring Boot 4.0.5 (Puerto 8080)     │          │
│  │                                              │          │
│  │  ┌────────────────────────────────────────┐ │          │
│  │  │  WebSocketConfig.java                  │ │          │
│  │  │  - Configura STOMP broker               │ │          │
│  │  │  - Define prefijos /app y /topic       │ │          │
│  │  │  - Habilita SockJS                     │ │          │
│  │  └────────────────────────────────────────┘ │          │
│  │                      ↓                       │          │
│  │  ┌────────────────────────────────────────┐ │          │
│  │  │  TaskWebSocketController.java           │ │          │
│  │  │  - Maneja /app/task/update             │ │          │
│  │  │  - Maneja /app/task/create             │ │          │
│  │  │  - Maneja /app/task/delete             │ │          │
│  │  │  - Broadcast a /topic/tasks            │ │          │
│  │  └────────────────────────────────────────┘ │          │
│  │                      ↓                       │          │
│  │  ┌────────────────────────────────────────┐ │          │
│  │  │  TaskService.java                      │ │          │
│  │  │  - Lógica de negocios                  │ │          │
│  │  │  - Acceso a BD (Oracle)                │ │          │
│  │  └────────────────────────────────────────┘ │          │
│  │                      ↓                       │          │
│  │  ┌────────────────────────────────────────┐ │          │
│  │  │  Oracle Database (ATP)                 │ │          │
│  │  │  JDBC: jdbc:oracle:thin:@ocichatbot_tp│ │          │
│  │  └────────────────────────────────────────┘ │          │
│  │                                              │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## Flujo de Comunicación Detallado

### 🔄 Flujo Completo: Usuario Arrastra Tarea

```
PASO 1: USUARIO INTERACTÚA
┌────────────────────────────────────────────────────────────┐
│ Usuario hace DRAG & DROP en el navegador                   │
│ Arrastra tarea de "Backlog" a "In Progress"               │
└────────────────────────────────────────────────────────────┘
                          ↓

PASO 2: FRONTEND PROCESA
┌────────────────────────────────────────────────────────────┐
│ Archivo: forgetask-frontend/app/components/kanban/         │
│          ProjectBoard.tsx                                   │
│                                                             │
│ Función: handleDrop(task, "in-progress")                  │
│ Acción:  Llama onSendUpdate(task.id, newData)             │
└────────────────────────────────────────────────────────────┘
                          ↓

PASO 3: HOOK WebSocket ENVÍA
┌────────────────────────────────────────────────────────────┐
│ Archivo: forgetask-frontend/app/hooks/                     │
│          useTaskWebSocket.ts                               │
│                                                             │
│ Función: updateTask(taskId, taskData)                      │
│                                                             │
│ Acción:  stompClient.publish({                            │
│            destination: '/app/task/update',                │
│            body: JSON.stringify({taskId, taskData})        │
│          })                                                 │
└────────────────────────────────────────────────────────────┘
                          ↓

PASO 4: WEBSOCKET TRANSPORTA
┌────────────────────────────────────────────────────────────┐
│ Protocolo: WebSocket (ws://localhost:8080/ws/tasks)       │
│ Formato:   JSON serializado                                │
│                                                             │
│ Mensaje:                                                    │
│ {                                                           │
│   "type": "SEND",                                          │
│   "destination": "/app/task/update",                       │
│   "body": {                                                │
│     "taskId": "5",                                         │
│     "taskData": {                                          │
│       "id": "5",                                           │
│       "title": "Implementar API",                          │
│       "status": "in-progress",                             │
│       "priority": "high"                                   │
│     }                                                       │
│   }                                                         │
│ }                                                           │
└────────────────────────────────────────────────────────────┘
                          ↓

PASO 5: BACKEND RECIBE
┌────────────────────────────────────────────────────────────┐
│ Archivo: forgetask/src/main/java/com/cloudforge/          │
│          api/forgetask/controller/                         │
│          TaskWebSocketController.java                      │
│                                                             │
│ Endpoint: @MessageMapping("/task/update")                  │
│                                                             │
│ Método:   handleTaskUpdate(TaskUpdateRequest request)      │
│                                                             │
│ Acción:   1. Recibe datos de la tarea                      │
│           2. Valida la actualización                       │
│           3. Llama TaskService.updateTask()                │
└────────────────────────────────────────────────────────────┘
                          ↓

PASO 6: BACKEND ACTUALIZA BASE DE DATOS
┌────────────────────────────────────────────────────────────┐
│ Archivo: forgetask/src/main/java/com/cloudforge/          │
│          service/TaskService.java                          │
│                                                             │
│ Acción:   1. Busca tarea por ID en BD                      │
│           2. Actualiza campos (status = "in-progress")    │
│           3. Guarda en Oracle Database                     │
│           4. Retorna TaskDTO actualizado                   │
│                                                             │
│ DB Query: UPDATE TASKS SET status='in-progress'            │
│           WHERE id='5'                                     │
└────────────────────────────────────────────────────────────┘
                          ↓

PASO 7: BACKEND BROADCAST A TODOS
┌────────────────────────────────────────────────────────────┐
│ Archivo: TaskWebSocketController.java                      │
│                                                             │
│ Método:   simpMessagingTemplate.convertAndSend(            │
│             "/topic/tasks",                                │
│             TaskEventMessage {                             │
│               type: "TASK_UPDATED",                        │
│               data: updatedTask,                           │
│               timestamp: "2024-04-03T15:30:45Z"            │
│             }                                              │
│           )                                                │
│                                                             │
│ Broadcast a TODOS los clientes conectados                 │
└────────────────────────────────────────────────────────────┘
                          ↓

PASO 8: FRONTEND RECIBE BROADCAST
┌────────────────────────────────────────────────────────────┐
│ Archivo: useTaskWebSocket.ts                               │
│                                                             │
│ Suscripción: stompClient.subscribe('/topic/tasks',         │
│                (message) => { ... })                       │
│                                                             │
│ Acción:  1. Deserializa JSON del mensaje                   │
│          2. Ejecuta onTaskChange(event)                    │
│          3. event.type = "TASK_UPDATED"                    │
│          4. event.data = TaskDTO actualizado               │
└────────────────────────────────────────────────────────────┘
                          ↓

PASO 9: STORE GLOBAL ACTUALIZA
┌────────────────────────────────────────────────────────────┐
│ Archivo: forgetask-frontend/app/components/kanban/         │
│          KanbanApp.tsx                                      │
│                                                             │
│ Función: handleTaskChange(event)                           │
│                                                             │
│ switch (event.type) {                                      │
│   case 'TASK_UPDATED':                                     │
│     updateTask(event.data)  // Llama al store              │
│     break                                                   │
│ }                                                           │
│                                                             │
│ Archivo: forgetask-frontend/app/store/taskStore.ts         │
│                                                             │
│ Acción: set((state) => ({                                  │
│   tasks: state.tasks.map((task) =>                         │
│     task.id === updatedTask.id ? updatedTask : task        │
│   )                                                         │
│ }))                                                         │
└────────────────────────────────────────────────────────────┘
                          ↓

PASO 10: UI RE-RENDERIZA (OPTIMIZADA)
┌────────────────────────────────────────────────────────────┐
│ React detecta cambio en Zustand Store                      │
│                                                             │
│ Componentes que se re-renderizan:                          │
│ ✅ ProjectBoard (nueva lista de tareas)                    │
│ ✅ TaskCard afectada (con React.memo)                      │
│ ✅ Column (con useMemo)                                    │
│                                                             │
│ Componentes que NO se re-renderizan:                       │
│ ❌ TaskCards no afectadas (memo previene)                  │
│ ❌ Otras Columns (useMemo)                                 │
│                                                             │
│ Resultado:                                                  │
│ 🎯 ACTUALIZACIÓN RENDERIZADA EN <100ms                     │
│ 🎯 MÍNIMO TRABAJO DEL DOM                                  │
└────────────────────────────────────────────────────────────┘
                          ↓

PASO 11: USUARIO VE CAMBIO
┌────────────────────────────────────────────────────────────┐
│ ✅ Tarea "Implementar API" ahora aparece en columna        │
│    "In Progress"                                            │
│                                                             │
│ ✅ Otros usuarios conectados TAMBIÉN ven el cambio         │
│    en tiempo real (porque recibieron el broadcast)         │
│                                                             │
│ ⏱️  Tiempo total: ~50-200ms (depende de latencia)          │
└────────────────────────────────────────────────────────────┘
```

---

## Endpoints WebSocket

### 📡 Protocolo: STOMP over WebSocket

**URL Base:** `ws://localhost:8080/ws/tasks`

#### 1️⃣ **Conexión Inicial**
```
TYPE:     CONNECTION
URL:      ws://localhost:8080/ws/tasks
PROTOCOLO: WebSocket (Upgrade from HTTP)

CLIENT SENDS:
{
  "CONNECT": {
    "accept-version": "1.2,1.1,1.0",
    "host": "localhost",
    "heart-beat": "0,0"
  }
}

SERVER RESPONDS:
{
  "CONNECTED": {
    "version": "1.2",
    "server": "spring-messaging-5.3",
    "heart-beat": "0,0",
    "session": "session-123abc..."
  }
}

STATUS: ✅ Conexión establecida
```

#### 2️⃣ **Suscripción a Eventos (Topic)**
```
TIPO:      SUBSCRIBE
DESTINO:   /topic/tasks
ACCIÓN:    Recibir eventos de TODAS las tareas

CLIENT SENDS:
{
  "SUBSCRIBE": {
    "id": "sub-1",
    "destination": "/topic/tasks"
  }
}

SERVER RESPONDS (Continuously):
{
  "MESSAGE": {
    "destination": "/topic/tasks",
    "message-id": "msg-1",
    "content-type": "application/json",
    "body": {
      "type": "TASK_UPDATED",
      "data": { ... TaskDTO ... },
      "timestamp": "2024-04-03T15:30:45Z"
    }
  }
}

STATUS: ✅ Recibiendo eventos en tiempo real
```

#### 3️⃣ **Enviar Actualización de Tarea**
```
DESTINO:      /app/task/update
MÉTODO:       @MessageMapping("/task/update")
DESCRIPCIÓN:  Actualizar status, título, usuario asignado, etc.

CLIENT SENDS:
{
  "SEND": {
    "destination": "/app/task/update",
    "body": {
      "taskId": "5",
      "taskData": {
        "id": "5",
        "title": "Implementar API",
        "description": "Crear endpoints REST",
        "status": "in-progress",
        "priority": "high",
        "estimatedTime": 8,
        "assignedTo": ["Juan García"],
        "assignedUsername": "jgarcia"
      }
    }
  }
}

BACKEND PROCESSING:
1. Recibe TaskUpdateRequest
2. Valida datos
3. TaskService.updateTask() → BD Oracle
4. Broadcast a /topic/tasks

SERVER BROADCASTS:
{
  "MESSAGE": {
    "destination": "/topic/tasks",
    "body": {
      "type": "TASK_UPDATED",
      "data": { id: "5", status: "in-progress", ... },
      "timestamp": "2024-04-03T15:30:46Z"
    }
  }
}

STATUS: ✅ Todos los clientes actualizados
```

#### 4️⃣ **Crear Nueva Tarea**
```
DESTINO:      /app/task/create
MÉTODO:       @MessageMapping("/task/create")
DESCRIPCIÓN:  Crear una nueva tarea en la BD

CLIENT SENDS:
{
  "SEND": {
    "destination": "/app/task/create",
    "body": {
      "title": "Diseñar UI",
      "description": "Crear mockups en Figma",
      "status": "backlog",
      "priority": "medium",
      "estimatedTime": 5
    }
  }
}

BACKEND PROCESSING:
1. Recibe TaskCreateRequest
2. Genera ID único
3. TaskService.createTask() → BD Oracle
4. Retorna tarea con ID asignado
5. Broadcast a /topic/tasks

SERVER BROADCASTS:
{
  "MESSAGE": {
    "destination": "/topic/tasks",
    "body": {
      "type": "TASK_CREATED",
      "data": {
        "id": "42",
        "title": "Diseñar UI",
        "status": "backlog",
        ...
      },
      "timestamp": "2024-04-03T15:30:47Z"
    }
  }
}

STATUS: ✅ Nueva tarea visible para todos
```

#### 5️⃣ **Eliminar Tarea**
```
DESTINO:      /app/task/delete
MÉTODO:       @MessageMapping("/task/delete")
DESCRIPCIÓN:  Eliminar una tarea de la BD

CLIENT SENDS:
{
  "SEND": {
    "destination": "/app/task/delete",
    "body": {
      "taskId": "5"
    }
  }
}

BACKEND PROCESSING:
1. Recibe TaskDeleteRequest con ID
2. Valida que tarea existe
3. TaskService.deleteTask(id) → BD Oracle
4. Broadcast a /topic/tasks

SERVER BROADCASTS:
{
  "MESSAGE": {
    "destination": "/topic/tasks",
    "body": {
      "type": "TASK_DELETED",
      "data": "5",  // Envía solo el ID
      "timestamp": "2024-04-03T15:30:48Z"
    }
  }
}

STATUS: ✅ Tarea eliminada para todos
```

---

## Endpoints REST

### 🌐 Protocolo: HTTP/HTTPS

**URL Base:** `http://localhost:8080/api/tasks`

#### 1️⃣ **Cargar Todas las Tareas (Inicial)**
```
MÉTODO:   GET
URL:      http://localhost:8080/api/tasks
DESCRIPCIÓN: Obtiene todas las tareas de la BD (carga inicial)

CLIENT REQUEST:
GET /api/tasks HTTP/1.1
Host: localhost:8080

SERVER RESPONSE (200 OK):
[
  {
    "id": "1",
    "title": "Planificación",
    "description": "Reunión de planificación",
    "status": "done",
    "priority": "high",
    "createdDate": "2024-03-20",
    "estimatedTime": 2,
    "realTime": 1.5
  },
  {
    "id": "2",
    "title": "Desarrollo Backend",
    "description": "Implementar WebSocket",
    "status": "in-progress",
    "priority": "high",
    "estimatedTime": 8,
    "realTime": 6
  },
  ...
]

CUÁNDO SE USA:
- Al cargar la página por primera vez
- Para sincronización inicial
- Fallback si WebSocket cae

UBICACIÓN EN CÓDIGO:
Archivo: forgetask-frontend/app/services/taskService.ts
Función: getAllTasks()

const tasks = await taskService.getAllTasks();
```

#### 2️⃣ **Obtener Una Tarea Específica**
```
MÉTODO:   GET
URL:      http://localhost:8080/api/tasks/{id}
EJEMPLO:  http://localhost:8080/api/tasks/5
DESCRIPCIÓN: Obtiene detalles de una tarea específica

CLIENT REQUEST:
GET /api/tasks/5 HTTP/1.1
Host: localhost:8080

SERVER RESPONSE (200 OK):
{
  "id": "5",
  "title": "Implementar API",
  "description": "Crear endpoints REST",
  "status": "in-progress",
  "priority": "high",
  "estimatedTime": 8,
  "realTime": 6,
  "assignedTo": ["Juan García"],
  "createdDate": "2024-03-25"
}

CUÁNDO SE USA:
- Cargar detalles completos de una tarea
- En diálogos de edición (fallback)

STATUS: ⚠️ No usado actualmente (WebSocket es preferido)
```

---

## Modelos de Datos

### 📊 TaskDTO (Estructura de Tarea)

**Localización:** `forgetask/src/main/java/com/cloudforge/dto/TaskDTO.java`

```
+──────────────────────────────────────┐
│ TaskDTO                              │
├──────────────────────────────────────┤
│ - id: String                         │ ID único de la tarea
│ - title: String                      │ Título
│ - description: String                │ Descripción
│ - status: String                     │ Estado: backlog|ready|in-progress|review|done
│ - priority: String                   │ Prioridad: low|medium|high
│ - estimatedTime: Double              │ Horas estimadas
│ - realTime: Double                   │ Horas reales
│ - startDate: String (Date)           │ Fecha inicio
│ - endDate: String (Date)             │ Fecha fin
│ - assignedTo: String[]               │ Nombres asignados
│ - assignedUsername: String           │ Usuario asignado
│ - assignedRole: String               │ Rol de usuario
│ - createdDate: String (Date)         │ Fecha de creación
│ - lastModified: String (Date)        │ Última modificación
└──────────────────────────────────────┘
```

### 📨 TaskEventMessage (Estructura de Evento)

**Localización:** `forgetask/src/main/java/com/cloudforge/dto/TaskEventMessage.java`

```
+──────────────────────────────────────┐
│ TaskEventMessage                     │
├──────────────────────────────────────┤
│ - type: String                       │ TASK_CREATED
│   (enum)                             │ TASK_UPDATED
│                                      │ TASK_DELETED
│ - data: Object                       │ TaskDTO o String (ID)
│ - timestamp: String                  │ ISO-8601 timestamp
│ - userId: String (opcional)          │ Quién originó el cambio
└──────────────────────────────────────┘
```

### 📦 TaskUpdateRequest (Request del Cliente)

**Localización:** `forgetask/src/main/java/com/cloudforge/dto/TaskUpdateRequest.java`

```
+──────────────────────────────────────┐
│ TaskUpdateRequest                    │
├──────────────────────────────────────┤
│ - taskId: String                     │ ID de tarea a actualizar
│ - taskData: TaskDTO                  │ Datos actualizados
└──────────────────────────────────────┘
```

### 🔤 TaskCreateRequest (Request Crear Tarea)

**Localización:** (Inferido del flujo)

```
+──────────────────────────────────────┐
│ TaskCreateRequest                    │
├──────────────────────────────────────┤
│ - title: String                      │ Requerido
│ - description: String                │ Opcional
│ - status: String                     │ Defecto: "backlog"
│ - priority: String                   │ Defecto: "medium"
│ - estimatedTime: Double              │ Opcional
│ - assignedTo: String[]               │ Opcional
└──────────────────────────────────────┘
```

---

## Ejemplos de Comunicación

### 📝 Ejemplo 1: Flujo Completo - Crear Tarea

```javascript
// FRONTEND - forgetask-frontend/app/components/kanban/ProjectBoard.tsx
const handleAddTask = useCallback((newTask: Omit<Task, 'id'>) => {
  console.log('📤 Creando nueva tarea:', newTask.title)
  onSendCreate(newTask)  // Envía via WebSocket
}, [onSendCreate])

// Usuario hace click en botón "+"
// Se abre AddTaskDialog
// Completa formulario y hace click en "Create"
// handleAddTask se ejecuta
```

```typescript
// FRONTEND - forgetask-frontend/app/hooks/useTaskWebSocket.ts
const createTask = useCallback((taskData: any) => {
  if (stompClientRef.current?.active) {
    console.log('📤 Enviando CREATE de nueva tarea:', taskData)
    
    stompClientRef.current.publish({
      destination: '/app/task/create',
      body: JSON.stringify({ taskData })
    })
  }
}, [])
```

```json
// MENSAJE ENVIADO POR WebSocket
{
  "taskData": {
    "title": "Documentar API",
    "description": "Escribir documentación en Swagger",
    "status": "backlog",
    "priority": "medium",
    "estimatedTime": 4
  }
}
```

```java
// BACKEND - TaskWebSocketController.java
@MessageMapping("/task/create")
public void handleTaskCreate(TaskUpdateRequest request) {
  System.out.println("📨 Recibida creación de tarea");
  
  // Crear nueva tarea con ID generado
  TaskDTO newTask = taskService.createTask(request.getTaskData());
  
  // Broadcast a todos los clientes
  simpMessagingTemplate.convertAndSend("/topic/tasks",
    new TaskEventMessage(
      "TASK_CREATED",
      newTask,
      LocalDateTime.now().toString()
    )
  );
}
```

```json
// MENSAJE BROADCAST A TODOS
{
  "type": "TASK_CREATED",
  "data": {
    "id": "42",
    "title": "Documentar API",
    "description": "Escribir documentación en Swagger",
    "status": "backlog",
    "priority": "medium",
    "estimatedTime": 4,
    "createdDate": "2024-04-03"
  },
  "timestamp": "2024-04-03T15:35:22Z"
}
```

```typescript
// FRONTEND - useTaskWebSocket.ts
stompClient.subscribe('/topic/tasks', (message) => {
  const event: TaskEventMessage = JSON.parse(message.body)
  console.log('📨 Evento recibido:', event.type)
  
  onTaskChange(event)  // Callback al componente
})
```

```typescript
// FRONTEND - KanbanApp.tsx
const handleTaskChange = useCallback((event: TaskEventMessage) => {
  switch (event.type) {
    case 'TASK_CREATED':
      console.log('Agregando nueva tarea a store:', event.data)
      addTask(event.data)  // Actualiza Zustand Store
      break
  }
}, [addTask])
```

```typescript
// FRONTEND - taskStore.ts (Zustand)
addTask: (task: Task) => {
  console.log('✨ Store: Agregando tarea:', task.id)
  
  set((state) => ({
    tasks: [...state.tasks, task],  // Agrega a lista
  }))
}
```

```
RESULTADO:
✅ TaskCard nueva aparece en columna "Backlog"
✅ Todos los usuarios conectados ven la tarea
✅ Tablero Kanban actualizado en <100ms
```

---

### 📝 Ejemplo 2: Actualizar Status (Drag & Drop)

**Escenario:** Usuario arrastra tarea "Documentar API" de "Backlog" a "In Progress"

```javascript
// FRONTEND - ProjectBoard.tsx
const handleDrop = useCallback((task: Task, newStatus: Task['status']) => {
  if (task.status === newStatus) return
  
  console.log(`📤 Arrastrando tarea ${task.id} a ${newStatus}`)
  
  onSendUpdate(task.id, { ...task, status: newStatus })
}, [onSendUpdate])
```

```json
// MENSAJE WebSocket
{
  "taskId": "42",
  "taskData": {
    "id": "42",
    "title": "Documentar API",
    "status": "in-progress",  // CAMBIO
    "priority": "medium",
    "estimatedTime": 4
  }
}
```

```java
// BACKEND
@MessageMapping("/task/update")
public void handleTaskUpdate(TaskUpdateRequest request) {
  TaskDTO updated = taskService.updateTask(
    request.getTaskId(),
    request.getTaskData()
  );
  
  // Notifica a TODOS
  simpMessagingTemplate.convertAndSend("/topic/tasks",
    new TaskEventMessage("TASK_UPDATED", updated, now())
  );
}
```

```json
// BROADCAST
{
  "type": "TASK_UPDATED",
  "data": {
    "id": "42",
    "status": "in-progress"  // Actualizado
  },
  "timestamp": "2024-04-03T15:36:00Z"
}
```

```
RESULTADO:
✅ Tarea desaparece de "Backlog"
✅ Tarea aparece en "In Progress"
✅ Otros usuarios ven cambio en tiempo real
⏱️  Latencia: ~50-100ms
```

---

## Debugging

### 🔍 Ver Conexión WebSocket en Browser

**Pasos:**

1. Abre la página en http://localhost:3000
2. Abre Developer Tools: `F12`
3. Pestaña: **Console**

**Logs esperados:**
```
✅ WebSocket conectado con STOMP: Command["CONNECTED"]
📢 Suscrito a /topic/tasks para recibir eventos en tiempo real
📥 Cargando tareas iniciales desde el backend...
✅ Tareas cargadas: 5
```

**Si tienes errores:**
```javascript
// ERROR: "Conexión rechazada"
// CAUSA: Backend no está corriendo
// SOLUCIÓN: ./mvnw.cmd spring-boot:run en carpeta forgetask

// ERROR: "Failed to connect to WebSocket"
// CAUSA: URL incorrecta o CORS
// SOLUCIÓN: Verifica URL en useTaskWebSocket.ts

// ERROR: "Cannot read properties of null (reading 'publish')"
// CAUSA: stompClient no está conectado
// SOLUCIÓN: Espera a que se conecte antes de enviar
```

### 🔍 Ver Mensajes WebSocket

**Pasos:**

1. Developer Tools → pestaña **Network**
2. Filtro: Busca `ws` (WebSocket)
3. Haz click en la conexión `ws/tasks`
4. Pestaña **Messages**

**Verás:**
- Mensajes enviados ⬆️
- Mensajes recibidos ⬇️
- En tiempo real conforme ocurren eventos

### 🔍 Ver Logs del Backend

**En la terminal donde corre `./mvnw.cmd spring-boot:run `, busca:**

```
✅ WebSocket conectado
📨 Recibida creación de tarea
📨 Recibida actualización de tarea
📨 Recibida eliminación de tarea
📢 Broadcast a /topic/tasks
```

### 🔍 Depuración Avanzada

**Habilitar logs STOMP en Backend:**

```java
// En WebSocketConfig.java
registry.configureClientInboundChannel()
  .interceptors(new ChannelInterceptor() {
    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
      System.out.println("📨 MENSAJE STOMP: " + message);
      return message;
    }
  });
```

**Habilitar logs STOMP en Frontend:**

```typescript
// En useTaskWebSocket.ts
const stompClient = new Client({
  debug: (message) => {
    console.log('[STOMP DEBUG]', message);  // Ver TODOS los mensajes
  }
})
```

### ✅ Checklist de Verificación

```
☐ Backend corriendo en puerto 8080
☐ Frontend corriendo en puerto 3000
☐ Console del navegador sin errores
☐ WebSocket conectado (Network tab)
☐ Puedo ver tareas en tablero
☐ Puedo arrastrar tarea
☐ Cambio se refleja en tiempo real
☐ Otros usuarios ven el cambio
☐ Base de datos actualizada

Si alguno falla, revisa Debugging section arriba 👆
```

---

## Estructura de Carpetas Rápida

```
forgetask/                    ← BACKEND
├── src/main/java/com/cloudforge/
│   ├── api/forgetask/controller/
│   │   └── TaskWebSocketController.java     ⭐ Principal
│   ├── config/
│   │   └── WebSocketConfig.java             ⭐ Config
│   ├── dto/
│   │   ├── TaskDTO.java
│   │   ├── TaskEventMessage.java
│   │   └── TaskUpdateRequest.java
│   └── service/
│       └── TaskService.java
└── pom.xml

forgetask-frontend/           ← FRONTEND
├── app/
│   ├── hooks/
│   │   └── useTaskWebSocket.ts              ⭐ Principal
│   ├── store/
│   │   └── taskStore.ts                     ⭐ Estado
│   ├── components/kanban/
│   │   ├── KanbanApp.tsx                    ⭐ Orquestador
│   │   ├── ProjectBoard.tsx                 ⭐ UI
│   │   └── TaskCard.tsx
│   └── services/
│       └── taskService.ts
└── package.json
```

---

## 🎯 Resumen Ejecutivo

| Aspecto | Detalle |
|--------|--------|
| **Protocolo** | WebSocket (STOMP) |
| **Tiempo Real** | ✅ Sí, 50-100ms latencia |
| **Conexión** | Bidireccional persistente |
| **Escalabilidad** | Todos los clientes reciben updates |
| **Confiabilidad** | Reconexión automática |
| **Performance** | Optimizado con React.memo + useMemo |
| **Base de Datos** | Oracle ATP (JDBC) |
| **Puertos** | Backend 8080, Frontend 3000 |

---

## 📖 Referencias

- [Spring WebSocket Docs](https://spring.io/guides/gs/messaging-stomp-websocket/)
- [STOMP Protocol](https://stomp.github.io/)
- [SockJS Documentation](https://github.com/sockjs/sockjs-client)
- [Zustand Store](https://zustand-demo.vercel.app/)
- [React Optimization](https://react.dev/reference/react/memo)

---

**¿Preguntas?** Revisa la sección de Debugging o contacta al equipo de desarrollo.

Última actualización: Abril 3, 2026
