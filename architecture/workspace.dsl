workspace "Forgetask Architecture" "Basado en model-1.md — Actions/Actors Approach" {

    !identifiers hierarchical

    model {
        !include model.dsl

        deploymentEnvironment "Produccion" {
            deploymentNode "OCI Environment" "Ambiente de Oracle" "Oracle Cloud" {
                infrastructureNode "Build Pipeline" "Ejecuta el Deployment"
                infrastructureNode "Deploy Stage" "Contiene imágenes del frontend y backend"
                infrastructureNode "Test Stage" "Contiene imagen del testing"
            }


            // Aquí referenciamos el softwareSystem GitHub
            deploymentNode "GitHub Actions" "Pipeline CI/CD" "GitHub" {
                softwareSystemInstance github
            }

            
        }
    }

    views {

        systemContext forgetask "C1_Context" "Nivel C1 — Sistema y actores externos" {
            include *
            autoLayout lr
        }

        container forgetask "C2_Containers" "Nivel C2 — Frontend, Backend" {
            include *
            autoLayout lr
        }

        component forgetask.backend "C3_Backend" "Nivel C3 — Dominios del backend" {
            include manager
            include developer

            include forgetask.frontend.pageKanban
            include forgetask.frontend.pageKPI
            include forgetask.frontend.pageAuth

            include forgetask.backend.sprintCreator
            include forgetask.backend.taskCreator
            include forgetask.backend.taskEditor
            include forgetask.backend.taskStatusChanger

            include forgetask.backend.kpiDashboardService
            include forgetask.backend.userReport
            include forgetask.backend.aiReportGenerator

            include forgetask.backend.sessionManager
            include forgetask.backend.userCreator

            autoLayout tb
        }

        component forgetask.frontend "C3_Frontend" "Nivel C3 — Presentation Layer" {
            include manager
            include developer

            include forgetask.frontend.pageKanban
            include forgetask.frontend.pageKPI
            include forgetask.frontend.pageAuth

            autoLayout lr
        }

        deployment forgetask "Produccion" "Deploy_Produccion" "Entorno de producción en OCI / Kubernetes" {
            include *
            autoLayout lr
        }

        dynamic forgetask "D1_Create_Sprint" "Manager crea un sprint" {
            manager -> forgetask.frontend "Accede a la vista Kanban"
            forgetask.frontend -> forgetask.backend "createSprint()"
            forgetask.backend -> oracleDb "INSERT sprint"
            autoLayout lr
        }

        dynamic forgetask "D2_Create_Task" "Manager crea una tarea" {
            developer -> forgetask.frontend "Rellena formulario de tarea"
            forgetask.frontend -> forgetask.backend "createTask()"
            forgetask.backend -> oracleDb "INSERT task"
            autoLayout lr
        }

        dynamic forgetask "D3_Assign_Task" "Manager asigna una tarea" {
            manager -> forgetask.frontend "Selecciona tarea y asigna responsable"
            forgetask.frontend -> forgetask.backend "assignTask()"
            forgetask.backend -> oracleDb "UPDATE assignee"
            autoLayout lr
        }

        dynamic forgetask "D4_Change_Task_State" "Developer cambia estado de tarea" {
            developer -> forgetask.frontend "Mueve tarjeta en el tablero Kanban"
            forgetask.frontend -> forgetask.backend "changeStatus()"
            forgetask.backend -> oracleDb "UPDATE status"
            autoLayout lr
        }

        theme default
    }

    configuration {
        scope softwaresystem
    }
}
