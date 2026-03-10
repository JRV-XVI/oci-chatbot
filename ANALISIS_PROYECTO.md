# Análisis Completo del Proyecto: OCI Chatbot / MyTodoList

> **Audiencia:** Junior Software Developer  
> **Fecha:** Marzo 2026  
> **Sprint:** 0

---

## Tabla de Contenidos

1. [Visión General del Proyecto](#1-visión-general-del-proyecto)
2. [Estructura de Carpetas](#2-estructura-de-carpetas)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Análisis del Código — Capa por Capa](#4-análisis-del-código--capa-por-capa)
   - [4.1 Punto de Entrada (`MyTodoListApplication.java`)](#41-punto-de-entrada)
   - [4.2 Modelos / Entidades](#42-modelos--entidades)
   - [4.3 Repositorios](#43-repositorios)
   - [4.4 Servicios](#44-servicios)
   - [4.5 Controladores REST](#45-controladores-rest)
   - [4.6 Controlador del Bot de Telegram](#46-controlador-del-bot-de-telegram)
   - [4.7 Utilidades del Bot](#47-utilidades-del-bot)
   - [4.8 Configuraciones](#48-configuraciones)
   - [4.9 Seguridad](#49-seguridad)
   - [4.10 Frontend React](#410-frontend-react)
5. [Flujo Completo de la Aplicación](#5-flujo-completo-de-la-aplicación)
   - [5.1 Flujo Web (React + REST)](#51-flujo-web-react--rest)
   - [5.2 Flujo Telegram Bot](#52-flujo-telegram-bot)
   - [5.3 Flujo DeepSeek IA](#53-flujo-deepseek-ia)
6. [Comandos y Etiquetas del Bot](#6-comandos-y-etiquetas-del-bot)
7. [Análisis del PDF — Entregables Sprint 0](#7-análisis-del-pdf--entregables-sprint-0)
   - [7.1 Sección DEMO (énfasis especial)](#71-sección-demo-énfasis-especial)
8. [Relación entre la DEMO y el Código Actual](#8-relación-entre-la-demo-y-el-código-actual)
9. [Gaps Identificados — Qué Falta Desarrollar](#9-gaps-identificados--qué-falta-desarrollar)
10. [Checklist del Entregable Sprint 0](#10-checklist-del-entregable-sprint-0)

---

## 1. Visión General del Proyecto

Este proyecto es una **herramienta de administración de tareas (Software Manager Tool)** desarrollada sobre la nube de Oracle (OCI). Consta de tres grandes piezas que se comunican entre sí:

| Pieza | Tecnología | Propósito |
|---|---|---|
| **Backend API REST** | Java 17 + Spring Boot | Expone endpoints HTTP para gestionar tareas (CRUD) |
| **Frontend Web** | React.js + Material UI | Interfaz visual en el navegador para gestionar tareas |
| **Bot de Telegram** | TelegramBots Java API | Permite gestionar tareas desde Telegram mediante comandos/botones |
| **IA (DeepSeek)** | DeepSeek API (LLM) | Genera respuestas inteligentes desde el bot |
| **Base de Datos** | Oracle Autonomous Database (ATP) | Persiste todas las tareas en la nube de OCI |
| **Infraestructura** | OKE (Oracle Kubernetes Engine) | Orquesta los contenedores en producción |

---

## 2. Estructura de Carpetas

```
oci-chatbot/
├── MtdrSpring/
│   ├── backend/
│   │   ├── src/
│   │   │   └── main/
│   │   │       ├── frontend/          ← Aplicación React
│   │   │       │   └── src/
│   │   │       │       ├── App.js     ← Componente principal React
│   │   │       │       ├── NewItem.js ← Formulario para agregar ítems
│   │   │       │       └── API.js     ← URL base del backend
│   │   │       ├── java/com/springboot/MyTodoList/
│   │   │       │   ├── MyTodoListApplication.java  ← Punto de entrada
│   │   │       │   ├── config/        ← Configuraciones (BD, Bot, IA)
│   │   │       │   ├── controller/    ← Endpoints REST + Bot Controller
│   │   │       │   ├── model/         ← Entidades JPA (tablas de BD)
│   │   │       │   ├── repository/    ← Acceso a BD (JPA)
│   │   │       │   ├── security/      ← Configuración de seguridad
│   │   │       │   ├── service/       ← Lógica de negocio
│   │   │       │   └── util/          ← Lógica del bot (comandos, acciones)
│   │   │       └── resources/
│   │   │           └── application.properties  ← Config de la app
│   │   ├── pom.xml                    ← Dependencias Maven
│   │   └── Dockerfile                 ← Imagen Docker del backend
│   └── terraform/                     ← Infraestructura como código (OCI)
└── build_spec.yaml                    ← Pipeline CI/CD de OCI DevOps
```

---

## 3. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO FINAL                        │
│          Browser Web              Telegram App              │
└──────────┬──────────────────────────────┬───────────────────┘
           │ HTTP/HTTPS                   │ Telegram Long Polling
           ▼                             ▼
┌──────────────────────┐    ┌─────────────────────────────────┐
│   OCI API Gateway    │    │     Telegram Bot Server         │
│  (enruta al backend) │    │   (recibe mensajes del usuario) │
└──────────┬───────────┘    └─────────────────┬───────────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────────────────────────────────────────────────┐
│              Spring Boot Application (OKE POD)               │
│  ┌─────────────────┐   ┌──────────────────────────────────┐  │
│  │ REST Controllers│   │  ToDoItemBotController            │  │
│  │ /todolist CRUD  │   │  (consume updates de Telegram)   │  │
│  └────────┬────────┘   └──────────────┬───────────────────┘  │
│           │                           │                       │
│           └────────────┬──────────────┘                       │
│                        ▼                                       │
│               ┌─────────────────┐   ┌───────────────────┐    │
│               │ ToDoItemService │   │  DeepSeekService  │    │
│               └────────┬────────┘   └─────────┬─────────┘    │
│                        │                       │               │
│                        ▼                       ▼               │
│               ┌─────────────────┐   ┌───────────────────┐    │
│               │ToDoItemRepository│  │ DeepSeek API (LLM)│    │
│               └────────┬────────┘   └───────────────────┘    │
└────────────────────────┼──────────────────────────────────────┘
                         │ JDBC/UCP
                         ▼
              ┌───────────────────────┐
              │  Oracle Autonomous DB │
              │  (OCI ATP)            │
              │  Tabla: TODOITEM      │
              │  Tabla: USERS         │
              └───────────────────────┘
```

---

## 4. Análisis del Código — Capa por Capa

### 4.1 Punto de Entrada

**Archivo:** `MyTodoListApplication.java`

```java
@SpringBootApplication
@EnableConfigurationProperties(BotProps.class)
@Import(DeepSeekConfig.class)
public class MyTodoListApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyTodoListApplication.class, args);
    }
}
```

**¿Qué hace?**  
Es la puerta de entrada de toda la aplicación. La anotación `@SpringBootApplication` le dice a Java que arranque el contenedor de Spring, que escanee todas las clases del paquete buscando componentes (`@Service`, `@Controller`, etc.) y los conecte automáticamente.  

- `@EnableConfigurationProperties(BotProps.class)` → activa la lectura de propiedades del bot desde `application.properties`.  
- `@Import(DeepSeekConfig.class)` → importa la configuración del cliente HTTP de DeepSeek.

---

### 4.2 Modelos / Entidades

Los modelos son el **reflejo en Java de las tablas de la base de datos**. Usan JPA (Java Persistence API) para que Spring sepa cómo mapear objetos Java a filas de Oracle.

#### `ToDoItem.java` → Tabla `TODOITEM`

| Campo Java | Columna BD | Tipo | Descripción |
|---|---|---|---|
| `ID` | `ID` | `int` (PK, autoincrement) | Identificador único |
| `description` | `DESCRIPTION` | `VARCHAR` | Texto de la tarea |
| `creation_ts` | `CREATION_TS` | `TIMESTAMP` | Fecha/hora de creación |
| `done` | `DONE` | `BOOLEAN` | Si la tarea está completada |

```java
@Entity
@Table(name = "TODOITEM")
public class ToDoItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    int ID;
    // ... getters, setters, toString
}
```

#### `User.java` → Tabla `USERS`

| Campo Java | Columna BD | Tipo | Descripción |
|---|---|---|---|
| `ID` | `ID` | `int` (PK, autoincrement) | Identificador del usuario |
| `phonenumber` | `PHONENUMBER` | `NUMBER` | Número de teléfono |
| `userpassword` | `PASSWORD` | `VARCHAR` | Contraseña |

> **Nota para Junior Dev:** La anotación `@Entity` le dice a Spring "esta clase es una tabla en la BD". `@Id` indica la llave primaria. `@GeneratedValue(IDENTITY)` significa que la BD genera el ID automáticamente.

---

### 4.3 Repositorios

**Archivo:** `ToDoItemRepository.java`

```java
@Repository
@Transactional
public interface ToDoItemRepository extends JpaRepository<ToDoItem, Integer> {
    // ¡Nada! Spring lo implementa solo
}
```

**¿Qué hace?**  
Hereda de `JpaRepository`, que ya trae implementados todos los métodos CRUD:
- `findAll()` → SELECT * FROM TODOITEM
- `findById(id)` → SELECT * FROM TODOITEM WHERE ID = ?
- `save(item)` → INSERT o UPDATE según si el ID existe
- `deleteById(id)` → DELETE FROM TODOITEM WHERE ID = ?

**No tienes que escribir SQL.** Spring lo genera por ti en tiempo de ejecución.

---

### 4.4 Servicios

Los servicios son la **capa de lógica de negocio**. Actúan como intermediarios entre los controladores y los repositorios, y son donde deben vivir las reglas de negocio más complejas.

#### `ToDoItemService.java`

| Método | Qué hace |
|---|---|
| `findAll()` | Retorna todos los ítems de la BD |
| `getItemById(int id)` | Busca un ítem por ID, retorna `ResponseEntity` |
| `getToDoItemById(int id)` | Como el anterior pero retorna `ToDoItem` directamente |
| `addToDoItem(ToDoItem)` | Inserta un nuevo ítem en la BD |
| `deleteToDoItem(int id)` | Elimina un ítem por ID |
| `updateToDoItem(int id, ToDoItem td)` | Actualiza descripción, timestamp y estado `done` |

#### `DeepSeekService.java`

Este servicio hace llamadas HTTP al **API de DeepSeek** (un LLM similar a ChatGPT).

```java
public String generateText(String prompt) throws IOException {
    // Construye un JSON de request
    String requestBody = String.format(
        "{\"model\": \"deepseek-chat\", \"messages\": [{\"role\": \"user\", \"content\": \"%s\"}]}", 
        prompt
    );
    // Ejecuta el HTTP POST al endpoint de DeepSeek
    httpPost.setEntity(new StringEntity(requestBody));
    CloseableHttpResponse response = httpClient.execute(httpPost);
    return EntityUtils.toString(response.getEntity()); // Retorna JSON de respuesta
}
```

El cliente HTTP (`CloseableHttpClient`) y el objeto `HttpPost` son creados por `DeepSeekConfig.java` usando `@Bean` y se inyectan automáticamente por Spring.

---

### 4.5 Controladores REST

**Archivo:** `ToDoItemController.java`

Es la clase que **expone la API HTTP** al mundo exterior. Cada método responde a una ruta y método HTTP específico.

| Anotación | Ruta | Método HTTP | Qué hace |
|---|---|---|---|
| `@GetMapping` | `/todolist` | GET | Retorna lista de todos los ítems |
| `@GetMapping` | `/todolist/{id}` | GET | Retorna un ítem por ID |
| `@PostMapping` | `/todolist` | POST | Crea un nuevo ítem |
| `@PutMapping` | `/todolist/{id}` | PUT | Actualiza un ítem existente |
| `@DeleteMapping` | `/todolist/{id}` | DELETE | Elimina un ítem |

**Ejemplo de flujo para crear una tarea (POST):**  
1. El frontend envía `POST /todolist` con `{ "description": "Mi tarea" }` en el body.
2. Spring deserializa el JSON a un objeto `ToDoItem`.
3. El controlador llama a `toDoItemService.addToDoItem(todoItem)`.
4. El servicio llama a `toDoItemRepository.save(todoItem)`.
5. El repositorio ejecuta el `INSERT` en Oracle y retorna el ítem con su nuevo ID.
6. El controlador responde con `200 OK` y el header `location: <nuevo_id>`.

---

### 4.6 Controlador del Bot de Telegram

**Archivo:** `ToDoItemBotController.java`

Esta clase es el **corazón del bot de Telegram**. Implementa `SpringLongPollingBot`, lo que significa que se conecta continuamente a los servidores de Telegram preguntando "¿hay mensajes nuevos para mí?" (Long Polling).

```java
@Override
public void consume(Update update) {
    // Extrae el texto del mensaje y el ID del chat
    String messageTextFromTelegram = update.getMessage().getText();
    long chatId = update.getMessage().getChatId();

    // Crea el objeto BotActions con todas las dependencias
    BotActions actions = new BotActions(telegramClient, toDoItemService, deepSeekService);
    actions.setRequestText(messageTextFromTelegram);
    actions.setChatId(chatId);

    // Evalúa qué acción ejecutar (orden importa: primera que coincide gana)
    actions.fnStart();    // /start o "Show Main Screen"
    actions.fnDone();     // "123-DONE"
    actions.fnUndo();     // "123-UNDO"
    actions.fnDelete();   // "123-DELETE"
    actions.fnHide();     // /hide
    actions.fnListAll();  // /todolist
    actions.fnAddItem();  // /additem o "Add New Item"
    actions.fnLLM();      // /llm
    actions.fnElse();     // cualquier otro texto → lo guarda como nueva tarea
}
```

> **Importante para Junior Dev:** El patrón usado es "Chain of Responsibility" simplificado. Cada `fnX()` revisa si el mensaje le corresponde usando la variable interna `exit`. Si ya una acción encontró su match y puso `exit = true`, las siguientes acciones no hacen nada.

---

### 4.7 Utilidades del Bot

#### `BotActions.java`
Contiene la implementación de cada acción del bot. Usa `BotHelper.sendMessageToTelegram()` para enviar respuestas.

**Acciones y su lógica:**

| Método | Trigger | Qué hace |
|---|---|---|
| `fnStart()` | `/start` o `"Show Main Screen"` | Envía bienvenida con teclado de botones |
| `fnDone()` | Mensaje contiene `"DONE"` | Extrae el ID del mensaje (`"123-DONE"`), marca tarea como done |
| `fnUndo()` | Mensaje contiene `"UNDO"` | Extrae el ID, marca tarea como no-done |
| `fnDelete()` | Mensaje contiene `"DELETE"` | Extrae el ID, elimina la tarea de la BD |
| `fnHide()` | `/hide` o `"Hide Main Screen"` | Envía despedida, oculta teclado |
| `fnListAll()` | `/todolist` o `"List All Items"` | Consulta la BD, genera teclado dinámico con tareas activas y completadas |
| `fnAddItem()` | `/additem` o `"Add New Item"` | Pide al usuario que escriba el texto de la nueva tarea |
| `fnLLM()` | `/llm` | Llama a DeepSeek con un prompt hardcodeado y muestra la respuesta |
| `fnElse()` | Cualquier otro texto | Crea una nueva tarea con ese texto como descripción |

#### `BotCommands.java` — Enum de comandos slash
```
/start, /hide, /todolist, /additem, /llm
```

#### `BotLabels.java` — Enum de etiquetas de botones
```
"Show Main Screen", "Hide Main Screen", "List All Items", 
"Add New Item", "DONE", "UNDO", "DELETE", "MY TODO LIST", "-"
```

#### `BotMessages.java` — Enum de mensajes predefinidos
```
Mensajes de bienvenida, item done/undone/deleted, bye, etc.
```

---

### 4.8 Configuraciones

#### `DeepSeekConfig.java`
- Lee `deepseek.api.key` y `deepseek.api.url` del `application.properties`.
- Crea beans de `CloseableHttpClient` y `HttpPost` pre-configurados con headers de autorización.
- Los inyecta automáticamente en `DeepSeekService`.

#### `BotProps.java`
- Lee el token del bot de Telegram desde propiedades.
- Usado como fallback si `@Value("${telegram.bot.token}")` está vacío.

#### `OracleConfiguration.java` / `DbSettings.java`
- Configuración de la conexión a Oracle ATP usando Oracle UCP (Universal Connection Pool).
- El pool tiene mínimo 10, máximo 30 conexiones simultáneas.

#### `CorsConfig.java`
- Configura CORS (Cross-Origin Resource Sharing) para que el frontend React pueda llamar al backend desde un dominio diferente.

---

### 4.9 Seguridad

**Archivo:** `WebSecurityConfiguration.java`

```java
http
    .authorizeHttpRequests(auth -> auth.anyRequest().permitAll()) // Todo sin auth
    .csrf(csrf -> csrf.disable())
    .httpBasic(httpBasic -> httpBasic.disable())
    .formLogin(formLogin -> formLogin.disable());
```

**Estado actual:** Seguridad **completamente desactivada**. Todas las rutas son públicas sin autenticación. Esto es válido para el sprint 0 / desarrollo, pero **debe mejorarse** antes de producción real.

---

### 4.10 Frontend React

**Archivo:** `App.js`

El frontend está construido con React usando **Function Components y Hooks**.

| State (useState) | Qué almacena |
|---|---|
| `isLoading` | `true` mientras espera respuesta del backend |
| `isInserting` | `true` mientras se crea un ítem nuevo |
| `items` | Array con todas las tareas (done y not-done) |
| `error` | Mensaje de error si alguna llamada falla |

**Funciones principales:**

| Función | Método HTTP | Ruta | Qué hace |
|---|---|---|---|
| `useEffect` (al iniciar) | `GET` | `/todolist` | Carga todos los ítems al montar el componente |
| `addItem(text)` | `POST` | `/todolist` | Agrega nuevo ítem |
| `deleteItem(id)` | `DELETE` | `/todolist/{id}` | Elimina un ítem |
| `toggleDone(id)` | `PUT` | `/todolist/{id}` | Cambia estado done/undone |
| `reloadOneItem(id)` | `GET` | `/todolist/{id}` | Recarga un ítem específico después de modificarlo |

**Renderizado:**
- Tabla "To Do" → muestra ítems con `done = false` con botón "Done"
- Tabla "Done items" → muestra ítems con `done = true` con botones "Undo" y "Delete"

**`API.js`:**
```javascript
const API_LIST = '/todolist'; // Ruta relativa → funciona tanto local como en nube
```

---

## 5. Flujo Completo de la Aplicación

### 5.1 Flujo Web (React + REST)

```
Usuario escribe tarea en navegador
        │
        ▼
NewItem.js captura el texto (onSubmit)
        │
        ▼
App.js llama a addItem(text)
        │  POST /todolist {"description": "tarea"}
        ▼
ToDoItemController.addToDoItem()
        │
        ▼
ToDoItemService.addToDoItem()
        │
        ▼
ToDoItemRepository.save(item)  ──► Oracle ATP (INSERT INTO TODOITEM)
        │
        ▼
Retorna el nuevo ítem con ID
        │
        ▼
App.js agrega el ítem al state items[]
        │
        ▼
React re-renderiza la tabla automáticamente
```

### 5.2 Flujo Telegram Bot

```
Usuario envía mensaje en Telegram
        │
        ▼
Telegram Servers (Long Polling)
        │ POST update
        ▼
ToDoItemBotController.consume(update)
        │
        ▼
BotActions.fnStart/fnDone/fnListAll/fnElse... (evaluación en cascada)
        │
        ├── Si es fnListAll: llama ToDoItemService.findAll()
        │                    → Oracle BD → lista de tareas
        │                    → Construye ReplyKeyboardMarkup dinámico
        │
        ├── Si es fnDone:    extrae ID del texto "123-DONE"
        │                    → ToDoItemService.updateToDoItem(id, item.done=true)
        │
        └── Si es fnElse:    texto libre → nuevo ToDoItem
                             → ToDoItemService.addToDoItem(newItem)
        │
        ▼
BotHelper.sendMessageToTelegram(chatId, mensaje, teclado)
        │  Telegram API
        ▼
Usuario recibe respuesta en Telegram
```

### 5.3 Flujo DeepSeek IA

```
Usuario envía "/llm" en Telegram
        │
        ▼
BotActions.fnLLM()
        │
        ▼
DeepSeekService.generateText(prompt)
        │  POST https://api.deepseek.com/v1/chat/completions
        │  Headers: Authorization: Bearer <API_KEY>
        │  Body: {"model": "deepseek-chat", "messages": [...]}
        ▼
DeepSeek LLM procesa el prompt
        │
        ▼
Retorna JSON con la respuesta generada
        │
        ▼
BotHelper.sendMessageToTelegram(chatId, "LLM: " + respuesta)
```

> **⚠️ Nota actual:** El prompt está hardcodeado como `"Dame los datos del clima en mty"`. Esto es un placeholder que debe ser reemplazado por el mensaje real del usuario.

---

## 6. Comandos y Etiquetas del Bot

### Comandos slash (escribir directamente)

| Comando | Acción |
|---|---|
| `/start` | Muestra pantalla principal con teclado |
| `/hide` | Oculta el teclado y despide |
| `/todolist` | Muestra todas las tareas con botones de acción |
| `/additem` | Pide texto para nueva tarea |
| `/llm` | Consulta al LLM de DeepSeek |

### Botones del teclado (generados dinámicamente)

| Botón | Acción |
|---|---|
| `Show Main Screen` | Vuelve al menú principal |
| `Hide Main Screen` | Oculta el teclado |
| `List All Items` | Lista todas las tareas |
| `Add New Item` | Inicia flujo de agregar tarea |
| `123-DONE` | Marca tarea #123 como completada |
| `123-UNDO` | Desmarca tarea #123 como completada |
| `123-DELETE` | Elimina tarea #123 |

### Flujo de interacción con texto libre
Si el usuario escribe cualquier texto que **no sea un comando ni un botón**, `fnElse()` lo toma y lo guarda como **nueva tarea**. Esto es la forma más rápida de agregar tareas.

---

## 7. Análisis del PDF — Entregables Sprint 0

El PDF define los siguientes **bloques obligatorios** para la presentación del Sprint 0:

### Portada
- Nombre, foto y rol de cada integrante
- Badges de certificaciones obtenidas

### Sección 1 — Visión y Alcance
- Propósito del proyecto y resultado esperado
- Qué está dentro y fuera del alcance
- Metodología Ágil → flexibilidad ante requisitos cambiantes

### Sección 2 — Impacto Económico
- **2.1 Infraestructura:** Costos de servicios OCI hasta semana 5, estimación hasta semana 12, incluir Free Tier
- **2.2 Recursos Humanos:** Costo en dólares basado en horas trabajadas. Fórmula: `horas × (50,000 / 2080)`. Evidencia por desarrollador.

### Sección 3 — Requerimientos
- **3.1 Funcionales:** Enfocados en Productivity / Visibility / Accountability, KPIs, feature de IA
- **3.2 No funcionales:** Todo lo que solicitó Oracle
- **3.3 Historia de Usuario:** Feature de IA en la herramienta
- **3.4 KPIs propuestos:** Definición y ejemplos con datos reales de la semana

### Sección 4 — Arquitectura
- **4.1 Diagrama cloud nativo:** Formato Oracle (OKE + ATP + API Gateway)
- **4.2 Modelo relacional:** Diagrama generado por OCI Autonomous Database. Incluir campo de horas trabajadas por task. Diseño en 3NF con PK y FKs. Snapshots con máximo 12-15 tasks (terminadas y planeadas).

### Sección 5 — Demo *(ver sección 7.1)*

### Sección 6 — Siguientes Pasos
- Mockup de la aplicación a desarrollar (con propuesta de IA y KPIs)
- Backlog del proyecto
- Plan de DevOps CI/CD

---

## 7.1 Sección DEMO (énfasis especial)

Esta es la sección más crítica del entregable porque **demuestra que el código funciona en producción en la nube de OCI**.

### Lo que se debe mostrar — checklist de la DEMO:

#### 1. Aplicación desplegada en la nube
- [ ] Mostrar la **URL pública** de la aplicación web funcionando en OCI
- [ ] La URL debe estar detrás del API Gateway o Load Balancer de OKE

#### 2. Kubernetes (OKE)
- [ ] Mostrar los **servicios de Kubernetes** activos (`kubectl get services`)
- [ ] Mostrar los **PODS corriendo** (`kubectl get pods`)
- [ ] Se deben ver los pods del backend Spring Boot en estado `Running`

#### 3. Base de Datos en OCI
- [ ] Mostrar **TODAS las bases de datos** en el panel de OCI Autonomous Database
- [ ] Debe ser legible el tipo (Free Tier u otro tier)
- [ ] Mostrar las tablas con **pending tasks** (tareas sin completar)
- [ ] Mostrar las tablas con **completed tasks** (tareas completadas)
- [ ] Los datos deben ser **tareas reales del equipo** asociadas al reto (no datos de prueba)

#### 4. Escenario de demostración en vivo (flujo end-to-end)

Este es el flujo exacto que se debe ejecutar durante la presentación:

```
PASO 1: Dar de alta una tarea en Telegram
   → Abrir Telegram
   → Enviar mensaje al bot: "Hacer Video Demo de app"
   → El bot responde: "New item added!"

PASO 2: Mostrar la tarea en la web
   → Abrir la URL pública de la aplicación web
   → Verificar que aparece la tarea "Hacer Video Demo de app" en la tabla "To Do"
   → Esto prueba sincronización bot ↔ BD ↔ web

PASO 3: Completar la tarea en la web
   → Hacer clic en el botón "Done" de la tarea
   → La tarea se mueve a la tabla "Done items"

PASO 4: Mostrar las tareas en Telegram
   → En Telegram enviar /todolist o presionar "List All Items"
   → Verificar que la tarea "Hacer Video Demo de app" aparece en el bot
     como completada (con botones UNDO y DELETE en vez de DONE)
```

---

### Por qué cada paso importa técnicamente:

| Paso | Qué prueba en el código |
|---|---|
| Paso 1 (Telegram → BD) | `ToDoItemBotController.consume()` → `BotActions.fnElse()` → `ToDoItemService.addToDoItem()` → Oracle ATP |
| Paso 2 (BD → Web) | `useEffect` en `App.js` → `GET /todolist` → `ToDoItemController.getAllToDoItems()` → Oracle ATP |
| Paso 3 (Web → BD) | `toggleDone()` en `App.js` → `PUT /todolist/{id}` → `ToDoItemService.updateToDoItem()` → Oracle ATP |
| Paso 4 (BD → Telegram) | `/todolist` en bot → `BotActions.fnListAll()` → `ToDoItemService.findAll()` → Oracle ATP → teclado dinámico |

---

## 8. Relación entre la DEMO y el Código Actual

### ¿Qué está listo para la demo?

| Funcionalidad | Estado | Archivo(s) clave |
|---|---|---|
| Agregar tarea por Telegram (texto libre) | ✅ Implementado | `BotActions.fnElse()` |
| Listar tareas en Telegram con botones | ✅ Implementado | `BotActions.fnListAll()` |
| Marcar tarea como done/undo desde Telegram | ✅ Implementado | `BotActions.fnDone()`, `fnUndo()` |
| Eliminar tarea desde Telegram | ✅ Implementado | `BotActions.fnDelete()` |
| CRUD completo desde la web React | ✅ Implementado | `App.js`, `ToDoItemController.java` |
| Conexión a Oracle ATP en OCI | ✅ Configurado | `application.properties`, `OracleConfiguration.java` |
| Despliegue en OKE (Kubernetes) | ✅ Configurado | `Dockerfile`, `todolistapp-springboot.yaml`, `terraform/` |
| Integración con DeepSeek LLM | ⚠️ Parcial | `BotActions.fnLLM()` (prompt hardcodeado) |

### ¿Qué falta o debe mejorarse para la demo?

| Item | Problema | Solución sugerida |
|---|---|---|
| Token del bot Telegram | Comentado en `application.properties` | Configurar como secret en Kubernetes |
| API Key DeepSeek | Valor dummy `sk-test` | Configurar como K8s secret real |
| Datos reales en la BD | La demo debe usar tasks reales del equipo | Insertar tareas del backlog del proyecto en la BD |
| LLM prompt dinámico | Hardcodeado como clima en Monterrey | Usar el texto del usuario como prompt real |
| Tablas de BD legibles | Se deben mostrar captures de OCI | Preparar screenshots antes de la presentación |

---

## 9. Gaps Identificados — Qué Falta Desarrollar

Comparando el código actual con los requerimientos del PDF:

### BD — Modelo Relacional (Sección 4.2 del PDF)

El PDF requiere que la BD incluya **horas trabajadas por task** y esté en **3NF con PK y FK**. La tabla `TODOITEM` actual **no tiene** los campos necesarios:

**Tabla TODOITEM actual:**
```
ID | DESCRIPTION | CREATION_TS | DONE
```

**Tabla TODOITEM propuesta (para cumplir con el PDF):**
```
ID | DESCRIPTION | CREATION_TS | DONE | HOURS_WORKED | ASSIGNED_TO (FK → USERS) | COMPLEXITY | ESTIMATED_HOURS
```

### User — Modelo incompleto

La tabla `USERS` tiene `ID`, `PHONENUMBER`, `PASSWORD`, pero le faltan campos como `NAME`, `LASTNAME` que sí están en el DDL comentado en `User.java`.

### KPIs — No implementados

El PDF pide KPIs de Productivity/Visibility/Accountability. No existe ningún endpoint ni vista que calcule KPIs. Esto sería trabajo del siguiente sprint.

### IA — Feature incompleta

El comando `/llm` existe pero el prompt es estático. Para la demo debe poder aceptar preguntas del usuario y responder con contexto de las tareas.

---

## 10. Checklist del Entregable Sprint 0

### Presentación (7-10 min)

- [ ] **Portada:** Foto, nombre, rol y badge de certificación de cada integrante
- [ ] **Visión & Alcance:** Propósito claro, qué está dentro/fuera del alcance
- [ ] **Impacto Económico:** Costos OCI (semanas 1-5 y estimación completa) + costo en USD por horas de trabajo
- [ ] **Requerimientos:** Funcionales, no funcionales, historia de usuario de IA, KPIs definidos con ejemplos
- [ ] **Arquitectura:** Diagrama cloud nativo (OKE + ATP + API GW) + modelo relacional en 3NF con horas_trabajadas
- [ ] **DEMO en vivo:**
  - [ ] URL pública funcionando
  - [ ] `kubectl get pods` y `kubectl get services` visibles
  - [ ] Paneles de OCI ATP con Free Tier visible
  - [ ] Tasks **reales del equipo** en la BD (pending y completed)
  - [ ] Flujo: Crear tarea en Telegram → ver en web → completar en web → verificar en Telegram
- [ ] **Siguientes pasos:** Mockup de la app, backlog, plan CI/CD

### Técnico (antes de la presentación)

- [ ] Configurar token real de Telegram como Kubernetes Secret
- [ ] Configurar API key real de DeepSeek como Kubernetes Secret
- [ ] Insertar en la BD al menos 10-15 tasks reales del equipo (con horas trabajadas)
- [ ] Verificar que los PODS están en estado `Running` en OKE
- [ ] Verificar URL pública accesible desde cualquier red
- [ ] Preparar screenshots de OCI ATP (tablas, tipo free tier)
- [ ] Agregar campo `HOURS_WORKED` a la tabla `TODOITEM` en la BD

---

## Apéndice — Tecnologías y Versiones

| Tecnología | Uso | Configuración |
|---|---|---|
| Java 17 | Lenguaje del backend | `pom.xml` |
| Spring Boot 3.x | Framework web + IoC + JPA | `pom.xml`, `application.properties` |
| TelegramBots Java 7.x | Long Polling para el bot | `ToDoItemBotController.java` |
| Oracle JDBC + UCP | Conexión a Oracle ATP | `application.properties` |
| Apache HttpClient 5 | Llamadas HTTP a DeepSeek API | `DeepSeekConfig.java` |
| React 18 | Frontend web | `frontend/package.json` |
| Material UI | Componentes visuales React | `App.js` |
| Docker | Contenedorización | `Dockerfile` |
| Kubernetes (OKE) | Orquestación en nube | `todolistapp-springboot.yaml` |
| Terraform | Infraestructura como código (OCI) | `terraform/` |
| Oracle ATP | Base de datos en nube | OCI Console |
| DeepSeek API | LLM para funcionalidad de IA | `DeepSeekConfig.java` |

---

*Documento generado el 10 de Marzo de 2026*
