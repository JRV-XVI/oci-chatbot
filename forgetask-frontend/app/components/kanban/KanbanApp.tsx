'use client'

/**
 * MODIFICADO EN ESTE PROMPT
 * Aplicación Kanban raíz que:
 * 1. Proporciona contexto para Drag & Drop (DnD)
 * 2. Conecta al WebSocket para comunicación en tiempo real
 * 3. Carga tareas iniciales desde el backend
 * 4. Escucha eventos en tiempo real y actualiza el estado global
 */

import { useEffect, useCallback, useState } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { ProjectBoard } from './project-board'
import { useTaskWebSocket, type TaskEventMessage } from '@/app/hooks/useTaskWebSocket'
import { useTaskStore } from '@/app/store/taskStore'
import taskService from '@/app/services/taskService'
import projectService from '@/app/services/projectService'
import type { TaskAssigneeOption } from '@/app/types/task'
import sprintService from '@/app/services/sprintService'
import type { SprintOption } from '@/app/types/sprint'

export function KanbanApp() {
  // Obtener acciones del store global de tareas
  const { tasks, setTasks, updateTask, addTask, removeTask } = useTaskStore()
  const [assigneeOptions, setAssigneeOptions] = useState<TaskAssigneeOption[]>([])
  const [projectId, setProjectId] = useState<number | null>(null)
  const [projectTitle, setProjectTitle] = useState<string>('Project Board')
  const [sprintOptions, setSprintOptions] = useState<SprintOption[]>([])

  /**
   * Callback que se ejecuta cuando llega un evento del servidor via WebSocket
   * Maneja los tres tipos de eventos:
   * 1. TASK_CREATED: Nueva tarea agregada por otro usuario
   * 2. TASK_UPDATED: Tarea modificada por otro usuario
   * 3. TASK_DELETED: Tarea eliminada por otro usuario
   */
  const handleTaskChange = useCallback(
    (event: TaskEventMessage) => {
      console.log('🎯 KanbanApp: Evento recibido:', event.type)

      switch (event.type) {
        case 'TASK_UPDATED':
          // Una tarea fue actualizada
          console.log('Actualizando tarea en store:', event.data)
          if (typeof event.data !== 'string') {
            updateTask(event.data)
          }
          break

        case 'TASK_CREATED':
          // Una nueva tarea fue creada
          console.log('Agregando nueva tarea a store:', event.data)
          if (typeof event.data !== 'string') {
            addTask(event.data)
          }
          break

        case 'TASK_DELETED':
          // Una tarea fue eliminada (event.data es el ID)
          console.log('Eliminando tarea del store:', event.data)
          if (typeof event.data === 'string') {
            removeTask(event.data)
          }
          break

        default:
          console.warn('Tipo de evento desconocido:', event.type)
      }
    },
    [updateTask, addTask, removeTask]
  )

  // Conectar al WebSocket del backend
  // El hook se encarga de establecer la conexión y mantenerla activa
  const { updateTask: sendUpdateTask, createTask: sendCreateTask, deleteTask: sendDeleteTask } =
    useTaskWebSocket(handleTaskChange)

  /**
   * Cargar tareas iniciales desde el backend cuando el componente monta
   * Luego, todas las actualizaciones llegaran via WebSocket
   */
  useEffect(() => {
    const loadInitialTasks = async () => {
      const maxAttempts = 6
      const retryDelayMs = 2000

      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          console.log(`📥 Cargando tareas iniciales desde el backend (intento ${attempt}/${maxAttempts})...`)
          const [tasks, projects] = await Promise.all([
            taskService.getAllTasks(),
            projectService.listProjects()
          ])
          console.log('✅ Tareas cargadas:', tasks.length)
          setTasks(tasks)

          const resolvedProjectId = projects.length > 0 ? projects[0].idProject : null
          setProjectId(resolvedProjectId)
          const resolvedProjectTitle = projects.length > 0 && projects[0].title
            ? projects[0].title
            : 'Project Board'
          setProjectTitle(resolvedProjectTitle)

          if (resolvedProjectId) {
            const [users, sprints] = await Promise.all([
              taskService.getProjectUsers(resolvedProjectId),
              sprintService.listSprints(resolvedProjectId)
            ])
            setAssigneeOptions(users)
            setSprintOptions(sprints)
          } else {
            setAssigneeOptions([])
            setSprintOptions([])
          }

          return
        } catch (error) {
          console.error(`❌ Error cargando tareas iniciales (intento ${attempt}/${maxAttempts}):`, error)
          if (attempt === maxAttempts) {
            return
          }
          await sleep(retryDelayMs)
        }
      }
    }

    loadInitialTasks()
  }, [setTasks])

  const handleSprintSaved = useCallback((savedSprint: SprintOption) => {
    setSprintOptions((current) => {
      const next = current.some((sprint) => sprint.idSprint === savedSprint.idSprint)
        ? current.map((sprint) => (sprint.idSprint === savedSprint.idSprint ? savedSprint : sprint))
        : [...current, savedSprint]

      return next.sort((a, b) => a.sprintNumber - b.sprintNumber)
    })
  }, [])
  
  const handleSprintDeleted = useCallback((sprintId: number) => {
    setSprintOptions((current) => current.filter((sprint) => sprint.idSprint !== sprintId))
    setTasks(
      tasks.map((task) => (task.sprintId === sprintId ? { ...task, sprintId: undefined } : task))
    )
  }, [setTasks, tasks])

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen app-background">
        {/* ProjectBoard accederá a tareas del store global y tendrá funciones WebSocket vía Context */}
        <ProjectBoard
          projectTitle={projectTitle}
          onSendUpdate={sendUpdateTask}
          onSendCreate={sendCreateTask}
          onSendDelete={sendDeleteTask}
          assigneeOptions={assigneeOptions}
          projectId={projectId}
          sprintOptions={sprintOptions}
          onSprintSaved={handleSprintSaved}
          onSprintDeleted={handleSprintDeleted}
        />
      </div>
    </DndProvider>
  )
}

