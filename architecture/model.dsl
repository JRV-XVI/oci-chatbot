// ═══════════════════════════════════════════════════════════════
//  ACTORES
// ═══════════════════════════════════════════════════════════════
manager   = person "Manager"   "Crea y gestiona sprints, tareas y reportes"
developer = person "Developer" "Trabaja en tareas, visualiza KPIs y genera reportes"

// ═══════════════════════════════════════════════════════════════
//  SISTEMAS EXTERNOS
// ═══════════════════════════════════════════════════════════════
telegram = softwareSystem "Telegram"    "Mensajería para notificaciones del bot"
oci      = softwareSystem "OCI"         "Oracle Cloud Infrastructure"
github   = softwareSystem "GitHub" "Repositorio y pipelines CI/CD"

oracleDb = softwareSystem "Oracle DB" "Base de datos relacional gestionada" {
    tags "Database"
}



// ═══════════════════════════════════════════════════════════════
//  SISTEMA PRINCIPAL
// ═══════════════════════════════════════════════════════════════
forgetask = softwareSystem "Forgetask" "Aplicación web para gestión de tareas y sprints" {

frontend = container "Frontend" "Interfaz web" "Next.js" {
    pageKanban = component "Kanban Page"      "Muestra y manipula tareas en columnas Kanban" "Presentation Layer"
    pageKPI    = component "KPI Dashboard"    "Visualización de métricas y gráficos"         "Presentation Layer"
    pageAuth   = component "Login / Register" "Formularios de autenticación y registro"      "Presentation Layer"
}

backend = container "Backend" "API REST y lógica de negocio" "Spring Boot (Java)" {

    sprintCreator = component "Sprint Creator" "Crea sprints; valida datos y persiste"     "Sprint Domain"
    sprintEditor  = component "Sprint Editor"  "Modifica atributos de un sprint existente" "Sprint Domain"
    sprintRemover = component "Sprint Remover" "Elimina sprints y datos relacionados"      "Sprint Domain"

    taskCreator       = component "Task Creator"        "Crea tareas asociadas a un sprint"   "Task Domain"
    taskEditor        = component "Task Editor"         "Modifica atributos de una tarea"     "Task Domain"
    taskAssigner      = component "Task Assigner"       "Asigna desarrolladores responsables" "Task Domain"
    taskStatusChanger = component "Task Status Changer" "Gestiona transiciones de estado"     "Task Domain"
    taskRemover       = component "Task Remover"        "Elimina tareas de forma segura"      "Task Domain"

    kpiDashboardService = component "KPI Dashboard Service" "Calcula y expone métricas del proyecto"       "Analytics Domain"
    userReport          = component "User Report"           "Agrega métricas de productividad por usuario" "Analytics Domain"

    aiReportGenerator = component "AI Report Generator" "Envía prompts a IA externa y construye el reporte" "AI Reporting Domain"

    sessionManager = component "Session Manager" "Autentica usuarios; crea y cierra sesiones" "User Management Domain"
    userCreator    = component "User Creator"    "Registra nuevos usuarios; valida datos"      "User Management Domain"

    database = component "Database" "Acceso a Oracle DB vía JDBC" "Persistence Layer"
}


}

// ═══════════════════════════════════════════════════════════════
//  RELACIONES — CONTEXT
// ═══════════════════════════════════════════════════════════════
manager   -> forgetask "Usa la aplicación"
developer -> forgetask "Usa la aplicación"
manager   -> github    "Cambio de código"
developer -> github    "Cambio de código"

forgetask -> telegram "Envía notificaciones"
forgetask -> oracleDb "Lee y escribe datos"
forgetask -> oci      "Deploy de imágenes"

github    -> oci      "CI/CD pipelines"

// ═══════════════════════════════════════════════════════════════
//  RELACIONES — CONTAINERS
// ═══════════════════════════════════════════════════════════════
manager   -> forgetask.frontend "Usa UI"
developer -> forgetask.frontend "Usa UI"
manager   -> telegram "Usa chatbot"
developer -> telegram "Usa chatbot"

forgetask.frontend  -> forgetask.backend   "HTTP REST"

forgetask.backend -> oracleDb  "JDBC"
telegram -> forgetask.backend  "HTTP API"

// ═══════════════════════════════════════════════════════════════
//  RELACIONES — PRESENTATION LAYER
// ═══════════════════════════════════════════════════════════════
manager   -> forgetask.frontend.pageKanban "View Tasks"
developer -> forgetask.frontend.pageKanban "View Tasks"

manager   -> forgetask.frontend.pageKPI "View KPIs"
developer -> forgetask.frontend.pageKPI "View KPIs"

manager   -> forgetask.frontend.pageAuth "Login/Register"
developer -> forgetask.frontend.pageAuth "Login/Register"


// ═══════════════════════════════════════════════════════════════
//  PRESENTATION → BUSINESS
// ═══════════════════════════════════════════════════════════════
forgetask.frontend.pageKanban -> forgetask.backend.sprintCreator     "createSprint()"
forgetask.frontend.pageKanban -> forgetask.backend.taskCreator       "createTask()"
forgetask.frontend.pageKanban -> forgetask.backend.taskEditor        "editTask()"
forgetask.frontend.pageKanban -> forgetask.backend.taskStatusChanger "changeStatus()"

forgetask.frontend.pageKPI -> forgetask.backend.kpiDashboardService "getKPIs()"
forgetask.frontend.pageKPI -> forgetask.backend.userReport          "getUserStats()"
forgetask.frontend.pageKPI -> forgetask.backend.aiReportGenerator   "generateReport()"

forgetask.frontend.pageAuth -> forgetask.backend.sessionManager "login() / logout()"
forgetask.frontend.pageAuth -> forgetask.backend.userCreator    "register()"

// ═══════════════════════════════════════════════════════════════
//  BUSINESS → PERSISTENCE
// ═══════════════════════════════════════════════════════════════
forgetask.backend.sprintCreator       -> forgetask.backend.database "INSERT sprint"
forgetask.backend.sprintEditor        -> forgetask.backend.database "UPDATE sprint"
forgetask.backend.sprintRemover       -> forgetask.backend.database "DELETE sprint"

forgetask.backend.taskCreator         -> forgetask.backend.database "INSERT task"
forgetask.backend.taskEditor          -> forgetask.backend.database "UPDATE task"
forgetask.backend.taskAssigner        -> forgetask.backend.database "UPDATE assignee"
forgetask.backend.taskStatusChanger   -> forgetask.backend.database "UPDATE status"
forgetask.backend.taskRemover         -> forgetask.backend.database "DELETE task"

forgetask.backend.userReport          -> forgetask.backend.database "SELECT actividad"
forgetask.backend.aiReportGenerator   -> forgetask.backend.database "SELECT contexto"
forgetask.backend.kpiDashboardService -> forgetask.backend.database "SELECT métricas"

forgetask.backend.sessionManager -> forgetask.backend.database "SELECT credenciales"
forgetask.backend.userCreator    -> forgetask.backend.database "INSERT usuario"

// ═══════════════════════════════════════════════════════════════
//  DEPENDENCIAS INTERNAS
// ═══════════════════════════════════════════════════════════════
forgetask.backend.aiReportGenerator -> forgetask.backend.kpiDashboardService "obtenerContexto()"
