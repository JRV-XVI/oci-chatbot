# C4 Level 4 — Code Diagrams

Diagramas de clases generados automáticamente desde el código fuente Java del backend de **Forgetask**.  
Generados por el plugin `plantuml-generator-maven-plugin` vía GitHub Actions en cada push a `main`.

> **Para visualizar los diagramas:** Instala la extensión [PlantUML for GitHub](https://chromewebstore.google.com/detail/plantuml-for-github) en Chrome o Firefox. Los bloques de código se renderizarán automáticamente al abrir esta página.

---

## 1a. Controllers — Business (Sprint, Task, KPI, Report)

Controllers que manejan la lógica de negocio principal: sprints, tareas, métricas y reportes.

```plantuml
@startuml

class SprintController {
	{field} -jdbcTemplate : JdbcTemplate
	{method} +createSprint ( request : SprintCreateRequest ) : ResponseEntity
	{method} +deleteSprint ( sprintId : int ) : ResponseEntity
	{method} +getCurrentSprint ( projectId : Integer ) : ResponseEntity
	{method} +listSprints ( projectId : Integer ) : List
	{method} +updateSprint ( sprintId : int , request : SprintUpdateRequest ) : ResponseEntity
}

class SprintController$SprintCreateRequest {
	{field} +endDate : String
	{field} +goal : String
	{field} +projectId : Integer
	{field} +sprintNumber : Integer
	{field} +startDate : String
	{field} +title : String
}

class SprintController$SprintUpdateRequest {
	{field} +endDate : String
	{field} +goal : String
	{field} +projectId : Integer
	{field} +sprintNumber : Integer
	{field} +startDate : String
	{field} +title : String
}

class TaskController {
	{field} -jdbcTemplate : JdbcTemplate
	{field} -jwtUtil : JwtUtil
	{method} +createTask ( task : TaskDTO ) : ResponseEntity
	{method} +deleteTask ( id : String ) : ResponseEntity
	{method} +getAllTasks () : ResponseEntity
	{method} +getProjectUsers ( projectId : Integer ) : ResponseEntity
	{method} +getTaskById ( id : String ) : ResponseEntity
	{method} +getTasksByProjectAndSprint ( projectId : int , sprintId : int ) : ResponseEntity
	{method} +updateTask ( id : String , task : TaskDTO ) : ResponseEntity
}

class KPIController {
	{field} -kpiService : KPIService
	{method} +calculateKPIs ( request : KPICalculationRequest ) : ResponseEntity
	{method} +getProjectKpisSummary ( projectId : Integer ) : ResponseEntity
	{method} +getRealHoursBySprintUser ( sprintId : Integer ) : ResponseEntity
	{method} +getRealHoursByUser ( sprintId : Integer ) : ResponseEntity
	{method} +health () : ResponseEntity
}

class ReportController {
	{field} -kpiService : KPIService
	{field} -llmService : LLMService
	{field} -pdfGeneratorService : PDFGeneratorService
	{field} -reportGeneratorService : ReportGeneratorService
	{field} -telegramReportService : TelegramReportService
	{method} +generateHTMLReport ( projectId : Integer , sprintId : Integer ) : ResponseEntity
	{method} +generatePDFReport ( projectId : Integer , sprintId : Integer ) : ResponseEntity
	{method} +generateTextReport ( projectId : Integer , sprintId : Integer ) : ResponseEntity
	{method} +health () : ResponseEntity
}

class MetricsController {
	{field} -jdbcTemplate : JdbcTemplate
	{method} +getTasksDoneByUserInSprint ( sprintId : int ) : List
}

ReportController *-- SprintController : sprintController
ReportController *-- TaskController : taskController

@enduml
```

## 1b. Controllers — Infrastructure (Auth, Invite, Project, WebSocket, Telegram)

Controllers que manejan autenticación, invitaciones, proyectos, comunicación en tiempo real y el bot de Telegram.

```plantuml
@startuml

class AuthController {
	{field} -authService : AuthService
	{method} +login ( request : LoginRequestDTO ) : ResponseEntity
	{method} +signup ( request : SignupRequestDTO ) : ResponseEntity
}

class InviteController {
	{field} -inviteService : InviteService
	{method} +createInvite ( request : CreateInviteRequestDTO ) : ResponseEntity
	{method} +validateInvite ( token : String ) : ResponseEntity
}

class ProjectController {
	{field} -jdbcTemplate : JdbcTemplate
	{field} -projectRepository : ProjectRepository
	{method} +completeOnboarding ( id : Long , dto : ProjectOnboardingDTO ) : ResponseEntity
	{method} +listProjects () : List
}

class TaskWebSocketController {
	{field} -messagingTemplate : SimpMessagingTemplate
	{method} +handleTaskCreate ( message : TaskCreateMessage ) : void
	{method} +handleTaskDelete ( message : TaskDeleteMessage ) : void
	{method} +handleTaskUpdate ( message : TaskUpdateMessage ) : void
}

class TelegramBotController {
	{field} -conversationManager : ConversationManager
	{field} -telegramReportService : TelegramReportService
	{method} +consume ( update : Update ) : void
	{method} +getBotToken () : String
	{method} +getUpdatesConsumer () : LongPollingUpdateConsumer
}

TelegramBotController *-- TaskController : taskController
TelegramBotController *-- SprintController : sprintController

@enduml
```

---

## 2. Services — Business Logic

Clases que contienen la lógica de negocio. Orquestan operaciones, validan reglas y coordinan con los repositorios de datos.

```plantuml
@startuml

class com.cloudforge.api.forgetask.service.KPIService {
	{field} -jdbcTemplate : org.springframework.jdbc.core.JdbcTemplate
	{method} +calculateKPIs ( tasks : java.util.List ) : com.cloudforge.api.forgetask.dto.KPIMetrics
	{method} +calculateKPIs ( tasks : java.util.List , expectedTaskCounts : java.util.Map ) : com.cloudforge.api.forgetask.dto.KPIMetrics
	{method} +getProjectKpisSummary ( projectId : Integer ) : com.cloudforge.api.forgetask.dto.ProjectKpisSummaryDTO
	{method} +getRealHoursBySprintUser ( sprintId : Integer ) : java.util.List
	{method} +getRealHoursByUser ( sprintId : Integer ) : java.util.List
	{method} +getRealHoursTasksByUser ( username : String , sprintId : Integer ) : java.util.List
	{method} +getTaskDistributionByStatus ( tasks : java.util.List ) : java.util.Map
	{method} +getTimeMetricsSummary ( tasks : java.util.List ) : java.util.Map
}


class com.cloudforge.api.forgetask.service.LLMService {
	{field} -llmConfig : com.cloudforge.api.forgetask.config.LLMConfig
	{field} {static} -logger : org.slf4j.Logger
	{field} -restTemplate : org.springframework.web.client.RestTemplate
	{method} +generateText ( prompt : String ) : String
	{method} +isConfigured () : boolean
}


class com.cloudforge.api.forgetask.service.PDFGeneratorService {
	{field} {static} -logger : org.slf4j.Logger
	{method} +generateFilename ( projectId : Integer , sprintId : Integer ) : String
	{method} +generatePDF ( reportContent : String , projectId : Integer , sprintId : Integer ) : [B
	{method} +generatePDF ( reportContent : String , projectId : Integer , sprintId : Integer , metrics : java.util.Map , userHours : java.util.List ) : [B
}


class com.cloudforge.api.forgetask.service.ReportGeneratorService {
	{field} {static} -logger : org.slf4j.Logger
	{method} +generateManagementReport ( projectId : Integer , sprintId : Integer , tasks : java.util.List ) : String
	{method} +generateManagementReport ( projectId : Integer , sprintId : Integer , tasks : java.util.List , userHours : java.util.List ) : String
}


class com.cloudforge.api.forgetask.service.SprintChunkBuilder {
	{field} -jdbcTemplate : org.springframework.jdbc.core.JdbcTemplate
	{field} {static} -logger : org.slf4j.Logger
	{method} +buildSprintChunk ( idSprint : int ) : String
}


class com.cloudforge.api.forgetask.service.SprintEmbeddingService {
	{field} -jdbcTemplate : org.springframework.jdbc.core.JdbcTemplate
	{field} {static} -logger : org.slf4j.Logger
	{method} +indexSprint ( idSprint : int , idProject : int , sprintTitle : String ) : void
}


class com.cloudforge.api.forgetask.service.TelegramReportService {
	{field} {static} -logger : org.slf4j.Logger
	{field} -sprintController : com.cloudforge.api.forgetask.controller.SprintController
	{field} -taskController : com.cloudforge.api.forgetask.controller.TaskController
	{method} +generateAndSendReport ( chatId : long , projectId : Integer , sprintId : Integer , telegramClient : org.telegram.telegrambots.meta.generics.TelegramClient ) : void
}


class com.cloudforge.api.forgetask.service.VectorContextRetriever {
	{field} -jdbcTemplate : org.springframework.jdbc.core.JdbcTemplate
	{field} {static} -logger : org.slf4j.Logger
	{field} -topK : int
	{method} +retrieveSprintContext ( queryText : String , excludeSprintId : int , idProject : int ) : java.util.List
}


class com.cloudforge.api.forgetask.service.auth.AuthService {
	{field} -jwtUtil : com.cloudforge.api.forgetask.security.JwtUtil
	{field} -passwordEncoder : org.springframework.security.crypto.password.PasswordEncoder
	{field} -projectRepository : com.cloudforge.api.forgetask.repository.ProjectRepository
	{field} -userRepo : com.cloudforge.api.forgetask.repository.UserAccountRepository
	{field} -userRoleRepository : com.cloudforge.api.forgetask.repository.UserRoleRepository
	{method} +login ( request : com.cloudforge.api.forgetask.dto.auth.LoginRequestDTO ) : com.cloudforge.api.forgetask.dto.auth.LoginResponseDTO
	{method} +signup ( request : com.cloudforge.api.forgetask.dto.auth.SignupRequestDTO ) : com.cloudforge.api.forgetask.dto.auth.LoginResponseDTO
}


class com.cloudforge.api.forgetask.service.invite.InviteService {
	{field} -inviteRepo : com.cloudforge.api.forgetask.repository.ProjectInviteRepository
	{method} +consumeInvite ( token : String ) : com.cloudforge.api.forgetask.model.ProjectInvite
	{method} +createInvite ( request : com.cloudforge.api.forgetask.dto.invite.CreateInviteRequestDTO ) : String
	{method} +validateToken ( token : String ) : com.cloudforge.api.forgetask.dto.invite.ValidateInviteResponseDTO
}

com.cloudforge.api.forgetask.service.ReportGeneratorService *--  com.cloudforge.api.forgetask.service.KPIService : kpiService
com.cloudforge.api.forgetask.service.ReportGeneratorService *--  com.cloudforge.api.forgetask.service.LLMService : llmService
com.cloudforge.api.forgetask.service.SprintEmbeddingService *--  com.cloudforge.api.forgetask.service.SprintChunkBuilder : chunkBuilder
com.cloudforge.api.forgetask.service.TelegramReportService *--  com.cloudforge.api.forgetask.service.PDFGeneratorService : pdfGeneratorService
com.cloudforge.api.forgetask.service.TelegramReportService *--  com.cloudforge.api.forgetask.service.ReportGeneratorService : reportGeneratorService
com.cloudforge.api.forgetask.service.auth.AuthService *--  com.cloudforge.api.forgetask.service.invite.InviteService : inviteService

@enduml
```

---

## 3. Models — JPA Entities

Entidades JPA que representan las tablas de Oracle DB. Muestran la estructura de datos persistida, columnas y relaciones entre entidades.

```plantuml
@startuml

class com.cloudforge.api.forgetask.model.Project <<Entity>>  <<Table>>  {
 {TableName=PROJECT}
 {TableSchema=APP_USER}
--
	{field} +@Column("BUDGET") budget : java.math.BigDecimal
	{field} +@Column("DESCRIPTION") description : String
	{field} +@Column("END_DATE") endDate : java.time.LocalDateTime
	{field} +@Column("ESTIMATED_TIME") estimatedTime : java.math.BigDecimal
	{field} +@Column("ID_PROJECT") @Id idProject : Long
	{field} +@Column("REAL_TIME") realTime : java.math.BigDecimal
	{field} +@Column("START_DATE") startDate : java.time.LocalDateTime
	{field} +@Column("TITLE") title : String
}


class com.cloudforge.api.forgetask.model.ProjectInvite <<Entity>>  <<Table>>  {
 {TableName=PROJECT_INVITE}
 {TableSchema=APP_USER}
--
	{field} +@Column("CREATED_AT") createdAt : java.time.LocalDateTime
	{field} +@Column("EMAIL") email : String
	{field} +@Column("EXPIRES_AT") expiresAt : java.time.LocalDateTime
	{field} +@Column("ID_INVITE") @Id idInvite : Long
	{field} +@Column("ID_PROJECT") idProject : Long
	{field} +@Column("INVITE_TOKEN") inviteToken : String
	{field} +@Column("ROLE") role : String
	{field} +@Column("STATUS") status : String
}


class com.cloudforge.api.forgetask.model.UserAccount <<Entity>>  <<Table>>  {
 {TableName=USER_ACCOUNT}
 {TableSchema=APP_USER}
--
	{field} +@Column("EMAIL") email : String
	{field} +@Column("FIRST_NAME") firstName : String
	{field} +@Column("ID_PROJECT") idProject : Long
	{field} +@Column("ID_USER") @Id idUser : Long
	{field} +@Column("LAST_NAME") lastName : String
	{field} +@Column("PASSWORD") password : String
	{field} +@Column("PHONE_NUMBER") phoneNumber : String
	{field} +@Column("USERNAME") username : String
}


class com.cloudforge.api.forgetask.model.UserRole <<Entity>>  <<Table>>  {
 {TableName=USER_ROLE}
 {TableSchema=APP_USER}
--
	{method} +getRole () : String
}


class com.cloudforge.api.forgetask.model.UserRoleId {
	{field} +@Column("ID_USER") idUser : Long
	{field} +@Column("ROLE") role : String
	{method} +equals ( o : Object ) : boolean
	{method} +hashCode () : int
}

com.cloudforge.api.forgetask.model.UserAccount "1" o-- "0..*"  com.cloudforge.api.forgetask.model.UserRole :  @OneToMany\nroles
com.cloudforge.api.forgetask.model.UserRole -->  com.cloudforge.api.forgetask.model.UserRoleId : id

hide methods

@enduml
```

---

## 4. Security — JWT Authentication

Clases que implementan la autenticación mediante JWT. `JwtAuthFilter` intercepta cada request HTTP y valida el token. `JwtUtil` genera y verifica los tokens.

```plantuml
@startuml

class com.cloudforge.api.forgetask.security.JwtAuthFilter {
	{method} #doFilterInternal ( request : jakarta.servlet.http.HttpServletRequest , response : jakarta.servlet.http.HttpServletResponse , filterChain : jakarta.servlet.FilterChain ) : void
	{method} -extractToken ( request : jakarta.servlet.http.HttpServletRequest ) : String
}


class com.cloudforge.api.forgetask.security.JwtUtil {
	{field} -expirationMs : long
	{field} -secret : String
	{method} +generateToken ( email : String ) : String
	{method} +generateToken ( email : String , idProject : Integer ) : String
	{method} +getEmailFromToken ( token : String ) : String
	{method} +getIdProjectFromToken ( token : String ) : Integer
	{method} -getSigningKey () : java.security.Key
	{method} +validateToken ( token : String ) : boolean
}

com.cloudforge.api.forgetask.security.JwtAuthFilter *--  com.cloudforge.api.forgetask.security.JwtUtil : jwtUtil

@enduml
```

---

## 5. DTOs — Data Transfer Objects

Clases que definen el contrato de la API: la forma exacta de los datos que viajan entre el frontend y el backend en cada request y response.

```plantuml
@startuml

class com.cloudforge.api.forgetask.dto.KPIMetrics {
	{field} +backlogCount : int
	{field} +completedEstimatedHours : double
	{field} +completedTasks : int
	{field} +doneCount : int
	{field} +inProgressCount : int
	{field} +progressPercentage : int
	{field} +readyCount : int
	{field} +reviewCount : int
	{field} +timeVariance : double
	{field} +totalEstimatedHours : double
	{field} +totalRealHours : double
	{field} +totalTasks : int
}


class com.cloudforge.api.forgetask.dto.ProjectOnboardingDTO {
	{field} +budget : Double
	{field} +description : String
	{field} +endDate : java.time.LocalDateTime
	{field} +estimatedTime : Double
	{field} +startDate : java.time.LocalDateTime
	{field} +title : String
}


class com.cloudforge.api.forgetask.dto.SprintOptionDTO {
	{field} +endDate : String
	{field} +goal : String
	{field} +idProject : int
	{field} +idSprint : int
	{field} +sprintNumber : int
	{field} +startDate : String
	{field} +title : String
}


class com.cloudforge.api.forgetask.dto.TaskDTO {
	{field} +assignedRole : String
	{field} +assignedTo : java.util.List
	{field} +assignedUsername : String
	{field} +description : String
	{field} +endDate : String
	{field} +estimatedTime : Double
	{field} +id : String
	{field} +priority : String
	{field} +realTime : Double
	{field} +sprintId : Integer
	{field} +sprintNumber : Integer
	{field} +sprintTitle : String
	{field} +startDate : String
	{field} +status : String
	{field} +title : String
}


class com.cloudforge.api.forgetask.dto.TaskEventMessage {
	{field} {static} +TASK_CREATED : String
	{field} {static} +TASK_DELETED : String
	{field} {static} +TASK_UPDATED : String
	{field} +data : Object
	{field} +timestamp : java.time.LocalDateTime
	{field} +type : String
}


class com.cloudforge.api.forgetask.dto.auth.LoginRequestDTO {
	{field} +email : String
	{field} +password : String
}


class com.cloudforge.api.forgetask.dto.auth.LoginResponseDTO {
	{field} -email : String
	{field} -firstName : String
	{field} -idProject : Long
	{field} -idUser : Long
	{field} -lastName : String
	{field} -roles : java.util.List
	{field} -token : String
	{field} -tokenType : String
	{field} -username : String
}


class com.cloudforge.api.forgetask.dto.auth.SignupRequestDTO {
	{field} +email : String
	{field} +firstName : String
	{field} +inviteToken : String
	{field} +lastName : String
	{field} +password : String
	{field} +username : String
}


class com.cloudforge.api.forgetask.dto.invite.CreateInviteRequestDTO {
	{field} +email : String
	{field} +idProject : Long
	{field} +role : String
}


class com.cloudforge.api.forgetask.dto.invite.ValidateInviteResponseDTO {
	{field} -email : String
	{field} -idProject : Long
	{field} -role : String
	{field} -valid : boolean
}

hide methods

@enduml
```