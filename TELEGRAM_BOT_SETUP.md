# Integración Telegram - ForgeTask Bot

## Descripción

El bot de Telegram para ForgeTask permite gestionar tareas directamente desde Telegram. El bot se conecta al servidor backend mediante **Long Polling** y ejecuta comandos para crear, actualizar, marcar como completadas, y eliminar tareas.

## Configuración

### Paso 1: Crear el Bot en Telegram

1. Abre **@BotFather** en Telegram (es el bot oficial para crear otros bots)
2. Escribe `/start` y sigue las instrucciones
3. Escribe `/newbot` para crear un nuevo bot
4. Dale un nombre a tu bot (ej: "ForgeTask Bot")
5. Dale un username único terminado en "_bot" (ej: "forgetask_bot")
6. **BotFather te dará un token** como este:
   ```
   123456789:ABCdefGhiJKlmNoPqrSTUvWxYz...
   ```

### Paso 2: Configurar Variables de Entorno

Edita el archivo `.env` en la raíz del proyecto:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_ENABLED=true
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_NAME=
```

Reemplaza:
- `TELEGRAM_BOT_ENABLED=true` para activar el bot (por defecto es `false`)
- `TELEGRAM_BOT_TOKEN` con el token que recibiste de BotFather
- `TELEGRAM_BOT_NAME` con el username del bot (sin la @)

### Paso 3: Compilar y Ejecutar

```bash
# Desde la carpeta forgetask/
mvn clean compile

# Ejecutar en local
docker compose -f docker-compose.dev.yml up backend

# O sin Docker
mvn spring-boot:run
```

### Paso 4: Usar el Bot

En Telegram:
1. Busca tu bot por su nombre (ej: @forgetask_bot)
2. Escribe `/start` para ver el menú principal
3. Usa los comandos disponibles

## Comandos del Bot

| Comando | Descripción |
|---------|-------------|
| `/start` | Muestra el menú principal |
| `/todolist` o "List All Items" | Muestra todas las tareas |
| `/additem` o "Add New Item" | Inicia el proceso para agregar una nueva tarea |
| `/hide` o "Hide Main Screen" | Cierra el menú |

## Botones Interactivos

Una vez que ejecutas `/todolist`, el bot muestra:

### Tareas Activas (no completadas)
- Título de la tarea
- Botón **DONE** — marca la tarea como completada

### Tareas Completadas
- Título de la tarea
- Botón **UNDO** — marca nuevamente como activa
- Botón **DELETE** — elimina la tarea

## Estructura de Archivos Telegram

Todos los archivos relacionados con Telegram están en `forgetask/src/main/java/com/cloudforge/api/forgetask/`:

```
forgetask/src/main/java/com/cloudforge/api/forgetask/
├── controller/
│   └── TelegramBotController.java      # Controlador principal del bot
├── config/
│   ├── TelegramBotConfig.java          # Properties (@ConfigurationProperties)
│   └── TelegramBotClientConfig.java    # Configuración Bean de TelegramClient
└── util/
    ├── BotActions.java                 # Lógica de acciones del bot
    ├── BotHelper.java                  # Métodos para enviar mensajes
    ├── BotCommands.java                # Enumeración de comandos
    ├── BotLabels.java                  # Enumeración de botones/etiquetas
    └── BotMessages.java                # Enumeración de mensajes
```

## Flujo de Funcionamiento

```
┌─────────────────────────────────────────┐
│  Telegram (Usuario escribe mensaje)      │
└──────────┬──────────────────────────────┘
           │
           ▼ Long Polling
┌─────────────────────────────────────────┐
│  TelegramBotController                  │
│  - Detecta el mensaje                   │
│  - Crea una instancia de BotActions     │
└──────────┬──────────────────────────────┘
           │
           ▼ Procesa acciones en cadena
┌─────────────────────────────────────────┐
│  BotActions (Chain of Responsibility)   │
│  - fnStart()   → Muestra menú           │
│  - fnDone()    → Marca como hecho       │
│  - fnUndo()    → Revierte completado    │
│  - fnDelete()  → Elimina tarea          │
│  - fnListAll() → Lista tareas           │
│  - fnAddItem() → Solicita titulo        │
│  - fnElse()    → Crea tarea con titulo  │
└──────────┬──────────────────────────────┘
           │
           ▼ Actualizaciones en BD  
┌─────────────────────────────────────────┐
│  Oracle ATP Database (TASK_STATE, etc)  │
└─────────────────────────────────────────┘
           │
           ▼ Respuesta
┌─────────────────────────────────────────┐
│  Telegram (Muestra respuesta al usuario) │
└─────────────────────────────────────────┘
```

## Operaciones de Base de Datos

### Crear Tarea
```sql
INSERT INTO TASK (ID_TASK, ID_USER, ID_PROJECT, TITLE, START_TIME)
INSERT INTO TASK_STATE (ID_TASK, STATE) VALUES (?, 'backlog')
```

### Marcar como Completada
```sql
UPDATE TASK_STATE SET STATE = 'done' WHERE ID_TASK = ?
```

### Marcar como Incompleta
```sql
UPDATE TASK_STATE SET STATE = 'backlog' WHERE ID_TASK = ?
```

### Eliminar Tarea
```sql
DELETE FROM TASK_TAG WHERE ID_TASK = ?
DELETE FROM TASK_STATE WHERE ID_TASK = ?
DELETE FROM TASK WHERE ID_TASK = ?
```

## Solución de Problemas

### El bot no responde

1. **Verifica el token**: 
   ```bash
   # En el archivo .env
   TELEGRAM_BOT_ENABLED=true
   TELEGRAM_BOT_TOKEN=123456789:ABCdef...
   ```

2. **Verifica que el backend está ejecutándose**:
   ```bash
   curl http://localhost:8080/health
   ```

3. **Revisa los logs**:
   ```bash
   docker compose -f docker-compose.dev.yml logs backend
   ```

### Error "Telegram bot token is not set"

- Asegúrate de activar el bot con `TELEGRAM_BOT_ENABLED=true`
- Asegúrate de que `.env` contiene `TELEGRAM_BOT_TOKEN`
- Redeploy el backend: `docker compose -f docker-compose.dev.yml restart backend`

### Las tareas no se guardan

- Verifica la conexión a Oracle ATP: `curl http://localhost:8080/health`
- Revisa que la BD tiene datos: `SELECT COUNT(*) FROM TASK;` en SQL*Plus

## Integración con el Kanban Web

El bot de Telegram y el Kanban web comparten la **misma base de datos**:

- El bot **crea/actualiza tareas** en las tablas `TASK` y `TASK_STATE`
- El Kanban web **lee las mismas tareas** vía REST API
- Los cambios en el bot se reflejan instantáneamente en el web (vía WebSocket)

## Próximas Mejoras

- [ ] Integración con DeepSeek LLM (`/llm` comando)
- [ ] Asignación de tareas a usuarios desde Telegram
- [ ] Filtrado de tareas por prioridad/fecha desde el bot
- [ ] Notificaciones automáticas de tareas vencidas
- [ ] Attachments (archivos/fotos) asociados a tareas

