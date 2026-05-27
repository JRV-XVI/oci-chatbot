# Implementación de Telegram en OCI Chatbot

## 📋 Índice
1. [Descripción General](#descripción-general)
2. [Configuración](#configuración)
3. [Componentes Principales](#componentes-principales)
4. [Flujo de Mensajes](#flujo-de-mensajes)
5. [Gestión de Conversaciones](#gestión-de-conversaciones)
6. [Creación de Tareas](#creación-de-tareas)
7. [Clasificación de Comandos](#clasificación-de-comandos)
8. [Generación de Reportes](#generación-de-reportes)
9. [Proceso de Setup](#proceso-de-setup)
10. [Seguridad](#seguridad)
11. [Características Futuras](#características-futuras)

---

## 🎯 Descripción General

El bot de Telegram está completamente integrado en la aplicación Spring Boot `forgetask`. Utiliza **long polling** para conectarse continuamente con los servidores de Telegram y procesa mensajes de los usuarios, permitiéndoles:

- ✅ Crear tareas mediante conversación interactiva
- ✅ Gestionar tareas (marcar como realizado, deshacer, eliminar)
- ✅ Listar todas las tareas
- ✅ Registrar horas de trabajo
- ✅ Generar reportes en PDF
- ✅ Obtener ayuda y formato de tareas

**Dependencia Principal:** `telegrambots-springboot-longpolling-starter` v9.1.0

---

## ⚙️ Configuración

### Variables de Entorno (`.env`)

```properties
TELEGRAM_BOT_ENABLED=true
TELEGRAM_BOT_TOKEN=<TU_TOKEN_DE_BOTFATHER>
TELEGRAM_BOT_NAME=<tu_bot_username>
```

> Nunca guardes tokens reales en el repo. En OCI/OKE usa OCI Vault y/o Kubernetes Secrets.

### Clases de Configuración

#### `TelegramBotConfig.java`
- Define propiedades de configuración mediante `@ConfigurationProperties`
- Valida la existencia del token con el método `hasToken()`
- Lanza `IllegalStateException` si el token no está configurado

#### `TelegramBotClientConfig.java`
- Crea un bean `@Bean TelegramClient` singleton
- Inicializa el cliente con el token configurado
- Usado por todos los servicios para enviar mensajes

### Secrets en Kubernetes

En OKE, las variables se inyectan desde Kubernetes Secrets. En este repo, el despliegue de backend referencia el secreto `forgetask-app-secrets` (por namespace) y lee estas keys:

```yaml
env:
  - name: TELEGRAM_BOT_ENABLED
    valueFrom:
      secretKeyRef:
            name: forgetask-app-secrets
            key: TELEGRAM_BOT_ENABLED
  - name: TELEGRAM_BOT_TOKEN
    valueFrom:
      secretKeyRef:
            name: forgetask-app-secrets
            key: TELEGRAM_BOT_TOKEN
  - name: TELEGRAM_BOT_NAME
    valueFrom:
      secretKeyRef:
            name: forgetask-app-secrets
            key: TELEGRAM_BOT_NAME
```

---

## 🏗️ Componentes Principales

### 1. **TelegramBotController** (Punto de Entrada)

**Ubicación:** `forgetask/src/main/java/com/cloudforge/api/forgetask/controller/TelegramBotController.java`

**Funcionalidad:**
- Implementa `SpringLongPollingBot` para conexión persistente
- Implementa `LongPollingSingleThreadUpdateConsumer` para procesar updates
- Decorador `@ConditionalOnProperty`: Solo se activa si `telegram.bot.enabled=true`
- Método principal: `consume(Update update)"

```java
@Component
@ConditionalOnProperty(prefix = "telegram.bot", name = "enabled", havingValue = "true")
public class TelegramBotController extends SpringLongPollingBot 
    implements LongPollingSingleThreadUpdateConsumer {
    
    public void consume(Update update) {
        // Procesa el mensaje
        // Verifica estado de conversación
        // Enruta a ConversationalTaskCreator o BotActions
    }
}
```

### 2. **BotActions** (Manejador de Comandos)

**Ubicación:** `forgetask/src/main/java/com/cloudforge/api/forgetask/util/BotActions.java`

**Patrón:** Chain of Responsibility

**Métodos Principales:**
- `fnStart()` - Muestra menú principal
- `fnHide()` - Oculta menú
- `fnDone()` - Marca tarea como completada
- `fnUndo()` - Revierte completación
- `fnDelete()` - Elimina tarea
- `fnListAll()` - Lista todas las tareas
- `fnAddItem()` - Inicia creación de tarea
- `fnLogHours()` - Registra horas de trabajo
- `fnGenerateReport()` - Genera reporte PDF
- `fnHandleConversation()` - Continúa flujo conversacional
- `fnElse()` - Maneja entrada libre (fallback)

---

## 📨 Flujo de Mensajes

```
┌─────────────────────────────────────────────────────────────┐
│ Usuario envía mensaje en Telegram                           │
└──────────────────────────┬──────────────────────────────────┘
                          │
                ┌─────────▼─────────┐
                │  Long Polling:    │
                │  Telegram API     │
                └─────────┬─────────┘
                          │
            ┌─────────────▼─────────────┐
            │ TelegramBotController     │
            │ consume(Update update)    │
            └─────────────┬─────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
    ┌─────────▼──────────┐  ┌────────▼──────────────┐
    │ ¿En conversación?  │  │ Comando normal?       │
    │ (task creation)    │  │ (/start, /done, etc) │
    └────────┬───────────┘  └────────┬──────────────┘
             │                        │
    ┌────────▼──────────────┐  ┌─────▼──────────────────┐
    │ ConversationalTask    │  │ BotActions            │
    │ Creator               │  │ (Chain of Responsibility)
    │ - Paso a paso         │  │                       │
    │ - Validación          │  ├─ fnStart()           │
    └────────┬──────────────┘  ├─ fnDone()            │
             │                  ├─ fnUndo()            │
             │                  ├─ fnDelete()          │
             │                  ├─ fnListAll()         │
             │                  ├─ fnAddItem()         │
             │                  ├─ fnLogHours()        │
             │                  ├─ fnGenerateReport()  │
             │                  └─ fnElse()            │
             │                  └────┬─────────────────┘
             │                       │
        ┌────┴───────────────────────┴────┐
        │ TaskController / SprintController│
        │ Base de datos Oracle ATP         │
        └────┬────────────────────────────┘
             │
        ┌────▼─────────────────────┐
        │ BotHelper.sendMessage()  │
        │ Envía respuesta          │
        └────┬─────────────────────┘
             │
        ┌────▼──────────────────────┐
        │ Telegram API               │
        │ Entrega al usuario        │
        └───────────────────────────┘
```

---

## 👥 Gestión de Conversaciones

### ConversationManager

**Ubicación:** `forgetask/src/main/java/com/cloudforge/api/forgetask/util/ConversationManager.java`

**Características:**
- Singleton `@Component` thread-safe
- Usa `ConcurrentHashMap<Long, ConversationState>` para almacenar estados
- Timeout de 15 minutos para conversaciones inactivas

**Métodos Clave:**
```java
ConversationState getOrCreateConversation(Long chatId)
void startTaskCreation(Long chatId)
void nextStep(Long chatId, String userInput)
void cancelConversation(Long chatId)
```

### ConversationState

**Ubicación:** `forgetask/src/main/java/com/cloudforge/api/forgetask/util/ConversationState.java`

**Atributos:**
- `chatId: Long` - Identificador del chat
- `currentStep: TaskCreationStep` - Paso actual del flujo
- `taskBeingCreated: TaskDTO` - Tarea en construcción
- `context: Map<String, Object>` - Datos adicionales

**Soporta dos flujos:**
1. Task creation (creación de tareas)
2. Hours logging (registro de horas)

---

## 🎯 Creación de Tareas

### ConversationalTaskCreator

**Ubicación:** `forgetask/src/main/java/com/cloudforge/api/forgetask/util/ConversationalTaskCreator.java`

**Flujo de 9 pasos:**

```
1. TITLE
   ┌─ Usuario envía título ─┐
   
2. DESCRIPTION
   ┌─ Usuario envía descripción ─┐
   
3. PRIORITY
   ┌─ Usuario selecciona prioridad (bajo/medio/alto) ─┐
   
4. SPRINT
   ┌─ Usuario selecciona sprint ─┐
   
5. START_DATE
   ┌─ Usuario envía fecha de inicio (MM/DD/YYYY) ─┐
   
6. END_DATE
   ┌─ Usuario envía fecha de fin (MM/DD/YYYY) ─┐
   
7. ESTIMATED_TIME
   ┌─ Usuario envía horas estimadas ─┐
   
8. ASSIGNEE
   ┌─ Usuario selecciona responsable ─┐
   
9. CONFIRMATION
   └─ Bot confirma y crea la tarea en BD ──┘
```

### TaskCreationStep Enum

**Ubicación:** `forgetask/src/main/java/com/cloudforge/api/forgetask/util/TaskCreationStep.java`

```java
enum TaskCreationStep {
    // Task Creation
    TITLE, DESCRIPTION, PRIORITY, SPRINT, 
    START_DATE, END_DATE, ESTIMATED_TIME, ASSIGNEE, CONFIRMATION,
    
    // Hours Logging
    TASK_SELECTION, HOURS_AMOUNT, HOURS_CONFIRMATION
}
```

**Método Útil:**
```java
boolean isHoursFlow() {
    return this == TASK_SELECTION || this == HOURS_AMOUNT || 
           this == HOURS_CONFIRMATION;
}
```

---

## 📝 Clasificación de Comandos

### BotCommands

**Ubicación:** `forgetask/src/main/java/com/cloudforge/api/forgetask/util/BotCommands.java`

| Comando | Descripción |
|---------|-------------|
| `/start` | Muestra el menú principal |
| `/hide` | Oculta el menú |
| `/todolist` | Alias para listar tareas |
| `/additem` | Inicia creación de tarea |
| `/addtask` | Alias para crear tarea |
| `/tasks` | Lista todas las tareas |
| `/loghours` | Registra horas trabajadas |
| `/llm` | Integración con DeepSeek (futuro) |

### BotLabels

**Ubicación:** `forgetask/src/main/java/com/cloudforge/api/forgetask/util/BotLabels.java`

Etiquetas de botones interactivos:
- Show Main Screen
- Hide Main Screen
- List All Items
- Add New Item
- Task Format Help
- Log Hours
- Generate Report
- DONE
- UNDO
- DELETE

### BotMessages

**Ubicación:** `forgetask/src/main/java/com/cloudforge/api/forgetask/util/BotMessages.java`

Mensajes predefinidos:
- Mensaje de bienvenida
- Confirmaciones de operaciones
- Mensajes de error
- Ejemplos de formato de tareas
- Ayuda

---

## 📊 Generación de Reportes

### TelegramReportService

**Ubicación:** `forgetask/src/main/java/com/cloudforge/api/forgetask/service/TelegramReportService.java`

**Método Principal:**
```java
void generateAndSendReport(Long chatId, Long projectId, Long sprintId, TelegramClient telegramClient)
```

**Funcionalidad:**
1. Obtiene el sprint actual si no está especificado
2. Recupera tareas del sprint desde la base de datos
3. Genera PDF mediante `PDFGeneratorService`
4. Envía documento mediante Telegram API (`SendDocument`)
5. Maneja errores con mensajes amigables

### ReportController

**Ubicación:** `forgetask/src/main/java/com/cloudforge/api/forgetask/controller/ReportController.java`

**Endpoints:**

```http
GET /api/reports/telegram/current-sprint
  Retorna: Estadísticas del sprint actual
  
POST /api/reports/telegram/current-sprint/send?chatId={chatId}
  Body: { projectId, sprintId }
  Acción: Genera y envía reporte por Telegram
```

---

## 🛠️ Utilidades

### BotHelper

**Ubicación:** `forgetask/src/main/java/com/cloudforge/api/forgetask/util/BotHelper.java`

**Método Estático Principal:**
```java
static void sendMessageToTelegram(
    Long chatId, 
    String message, 
    TelegramClient telegramClient, 
    Optional<ReplyKeyboardMarkup> keyboard
)
```

**Características:**
- Manejo de excepciones
- Logging de errores
- Soporte para teclados interactivos
- Envío seguro de mensajes

---

## 🚀 Proceso de Setup

### Ubicación: `TELEGRAM_BOT_SETUP.md`

#### Paso 1: Crear Bot con @BotFather
```
1. Abrir Telegram
2. Buscar @BotFather
3. Comando: /newbot
4. Seguir instrucciones
5. Copiar el token generado
```

#### Paso 2: Configurar Variables
```bash
# Editar .env
TELEGRAM_BOT_ENABLED=true
TELEGRAM_BOT_TOKEN=<tu_token_aquí>
TELEGRAM_BOT_NAME=<nombre_bot>
```

#### Paso 3: Compilar y Desplegar
```bash
cd forgetask
mvn clean package
docker compose up -d
```

#### Paso 4: Usar el Bot
```
TBuscar el bot en Telegram
2. Ejecutar /start
3. Seguir las instrucciones interactivas
```

### Verificación

```bash
# Health check
curl http://localhost:8080/health

# Ver logs
docker compose logs -f backend
```

---

## 🔒 Seguridad

### ✅ Implementadas

| Medida | Descripción |
|--------|-------------|
| **Secretos en `.env`** | Token no está hardcodeado |
| **Kubernetes Secrets** | Variables en secretos(no en ConfigMaps |
| **Conditional Bean** | Bot solo se activa si `enabled=true` |
| **Validación de Token** | `hasToken()` valida existencia |
| **Excepción al Falta** | `IllegalStateException` si no hay token |

### ⚠️ Consideraciones

- **Token en `.env`**: Nunca debe commitearse. Usa `.env.example` como plantilla y crea tu `.env` solo en local.
- **Long Polling**: Menos seguro que WebHooks, requiere validación adicional en producción
- **Blue/Green en OKE (ns-blue/ns-green)**: con long polling, **solo puede existir 1 consumidor activo de `getUpdates` por token**. Si ambos namespaces levantan el bot con el mismo token, Telegram responderá **409 (conflict)**.
- **Permisos de Usuario**: No hay validación de permisos en el bot (TODO)

#### Mitigación recomendada para Blue/Green

- Mantén `TELEGRAM_BOT_ENABLED=true` solo en el namespace activo.
- En el namespace standby déjalo en `false` para evitar el 409.
- En el cutover (swap) invierte los valores (habilitar nuevo / deshabilitar anterior).

### Recomendaciones

```markdown
1. Nunca commitar token real en el repositorio
2. Usar diferentes tokens para dev/staging/prod
3. Implementar validación de usuario
4. Auditar cambios hechos por el bot
5. Considerar migrar a webhooks en producción
6. Implementar rate limiting
```

---

## 🔄 Operaciones en Base de Datos

### CREATE (Crear tarea)
```sql
INSERT INTO TASK (name, description, priority, sprint_id, start_date, 
                 end_date, estimated_time, assignee_id)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);

INSERT INTO TASK_STATE (task_id, state) VALUES (?, 'backlog');
```

### UPDATE (Marcar como realizado)
```sql
UPDATE TASK_STATE SET STATE = 'done' WHERE task_id = ?;
```

### UPDATE (Deshacer)
```sql
UPDATE TASK_STATE SET STATE = 'backlog' WHERE task_id = ?;
```

### DELETE (Eliminar tarea)
```sql
DELETE FROM TASK_TAG WHERE task_id = ?;
DELETE FROM TASK_STATE WHERE task_id = ?;
DELETE FROM TASK WHERE id = ?;
```

### READ (Listar tareas)
```sql
SELECT * FROM TASK 
JOIN TASK_STATE ON TASK.id = TASK_STATE.task_id
WHERE project_id = ? AND sprint_id = ?;
```

---

## 📁 Estructura de Archivos

```
forgetask/
├── src/main/java/com/cloudforge/api/forgetask/
│   ├── config/
│   │   ├── TelegramBotConfig.java
│   │   └── TelegramBotClientConfig.java
│   ├── controller/
│   │   ├── TelegramBotController.java
│   │   └── ReportController.java
│   ├── service/
│   │   └── TelegramReportService.java
│   └── util/
│       ├── BotActions.java
│       ├── BotCommands.java
│       ├── BotLabels.java
│       ├── BotMessages.java
│       ├── BotHelper.java
│       ├── ConversationManager.java
│       ├── ConversationState.java
│       ├── ConversationalTaskCreator.java
│       └── TaskCreationStep.java
├── pom.xml (dependencias)
├── .env (configuración)
└── TELEGRAM_BOT_SETUP.md (documentación)

infrastructure/
└── kubernetes/
    └── templates/
        └── forgetask.yaml (secrets)
```

---

## ✨ Características Implementadas

- ✅ Conexión persistente con long polling
- ✅ Creación conversacional de tareas (9 pasos)
- ✅ Acciones rápidas (done, undo, delete)
- ✅ Listado de tareas con botones interactivos
- ✅ Registro de horas trabajadas
- ✅ Generación y envío de reportes PDF
- ✅ Gestión de estado de conversación (timeout 15 min)
- ✅ Registro condicional de bean (enable/disable)
- ✅ Integración con secretos de Kubernetes
- ✅ Chain of Responsibility para comandos

---

## 🚧 Características Futuras

| Característica | Estado | Notas |
|----------------|--------|-------|
| Integración LLM DeepSeek | Comando `/llm` creado | Pendiente implementación |
| Asignación de tareas | ❌ | Requeire permisos de usuario |
| Filtrado por prioridad/fecha | ❌ | Pendiente |
| Notificaciones de deadline | ❌ | Requiere scheduler |
| Adjuntos de archivos | ❌ | Requiere almacenamiento |
| WebHooks (en lugar de polling) | ❌ | Más seguro en producción |
| Rate limiting | ❌ | Protección de API |
| Validación de permisos | ❌ | Seguridad |

---

## 📊 Diagrama Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TELEGRAM BOT ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  Telegram API    │
│  (Long Polling)  │
└────────┬─────────┘
         │
    ┌────▼────────────────────────────────────┐
    │  TelegramBotController                  │
    │  - SpringLongPollingBot                 │
    │  - Consume updates                      │
    │  - ConditionalOnProperty enabled=true   │
    └────┬──────────────────────────┬─────────┘
         │                          │
   ┌─────▼──────────┐      ┌───────▼────────────────┐
   │ In Conversation│      │  Normal Command        │
   └─────┬──────────┘      └───────┬────────────────┘
         │                         │
   ┌─────▼────────────────┐  ┌────▼──────────────────┐
   │ ConversationalTask   │  │ BotActions            │
   │ Creator              │  │ (Chain Responsibility)
   │ - 9-step flow        │  │ - Start/Hide          │
   │ - Validation         │  │ - Done/Undo/Delete    │
   │ - State management   │  │ - ListAll             │
   └─────┬────────────────┘  │ - AddItem             │
         │                   │ - LogHours            │
         │                   │ - GenerateReport      │
         │                   └────┬──────────────────┘
         │                        │
   ┌─────▴────────────────────────▴────────┐
   │  ConversationManager                  │
   │  - State tracking (ConcurrentHashMap)│
   │  - 15-min timeout                     │
   │  - Thread-safe operations             │
   └─────┬───────────────────────────────┬┘
         │                               │
   ┌─────▼────────┐  ┌─────────────────▼──────────────┐
   │ Task Logic   │  │ Report Generation               │
   │ - TaskControl│  │ - TelegramReportService         │
   │ - SprintCtrl │  │ - PDFGeneratorService           │
   └─────┬────────┘  │ - SendDocument API              │
         │           └──────┬───────────────────────────┘
         │                  │
         └──────┬───────────┘
                │
        ┌───────▼──────────────┐
        │ Oracle ATP Database  │
        │ - TASK               │
        │ - TASK_STATE         │
        │ - TASK_TAG           │
        │ - SPRINT             │
        └───────┬──────────────┘
                │
        ┌───────▼──────────────┐
        │ BotHelper            │
        │ - Send message       │
        │ - Keyboard markup    │
        │ - Error handling     │
        └───────┬──────────────┘
                │
        ┌───────▼──────────────┐
        │ Telegram API         │
        │ (Send message)       │
        └─────────────────────┘
```

---

## 📚 Referencias

- **Setup Documentation:** [TELEGRAM_BOT_SETUP.md](TELEGRAM_BOT_SETUP.md)
- **Telegram Bot API:** https://core.telegram.org/bots/api
- **TelegramBots Spring Library:** https://github.com/rubenlagus/TelegramBots
- **Oracle Database Integration:** `forgetask/pom.xml`

---

**Última actualización:** Abril 30, 2026  
**Versión:** 1.0
