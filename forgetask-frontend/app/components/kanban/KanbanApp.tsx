'use client'

import { useEffect, useCallback, useState, useMemo } from 'react'
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
import { CheckCircle, Play } from 'lucide-react'

export function KanbanApp() {
  const { tasks, setTasks, updateTask, addTask, removeTask } = useTaskStore()
  const [assigneeOptions, setAssigneeOptions] = useState<TaskAssigneeOption[]>([])
  const [projectId, setProjectId] = useState<number | null>(null)
  const [projectTitle, setProjectTitle] = useState<string>('Project Board')
  const [sprintOptions, setSprintOptions] = useState<SprintOption[]>([])
  const [isSprintActionLoading, setIsSprintActionLoading] = useState(false)

  // ── Derivar el sprint activo de la lista de sprints ──────────────────────
  // Busca el sprint con status ACTIVE. Si no hay ninguno, busca el más
  // reciente con status PLANNED para ofrecer activarlo.
  const activeSprint = useMemo(
    () => sprintOptions.find((s) => s.status === 'ACTIVE') ?? null,
    [sprintOptions]
  )

  const nextPlannedSprint = useMemo(
    () => sprintOptions.find((s) => s.status === 'PLANNED') ?? null,
    [sprintOptions]
  )

  const handleTaskChange = useCallback(
    (event: TaskEventMessage) => {
      console.log('🎯 KanbanApp: Evento recibido:', event.type)
      switch (event.type) {
        case 'TASK_UPDATED':
          if (typeof event.data !== 'string') updateTask(event.data)
          break
        case 'TASK_CREATED':
          if (typeof event.data !== 'string') addTask(event.data)
          break
        case 'TASK_DELETED':
          if (typeof event.data === 'string') removeTask(event.data)
          break
        default:
          console.warn('Tipo de evento desconocido:', event.type)
      }
    },
    [updateTask, addTask, removeTask]
  )

  const { updateTask: sendUpdateTask, createTask: sendCreateTask, deleteTask: sendDeleteTask } =
    useTaskWebSocket(handleTaskChange)

  useEffect(() => {
    const loadInitialData = async () => {
      const maxAttempts = 6
      const retryDelayMs = 2000
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          console.log(`📥 Cargando datos iniciales (intento ${attempt}/${maxAttempts})...`)
          const [loadedTasks, projects] = await Promise.all([
            taskService.getAllTasks(),
            projectService.listProjects(),
          ])
          setTasks(loadedTasks)

          const resolvedProjectId = projects.length > 0 ? projects[0].idProject : null
          setProjectId(resolvedProjectId)
          setProjectTitle(
            projects.length > 0 && projects[0].title ? projects[0].title : 'Project Board'
          )

          if (resolvedProjectId) {
            const [users, sprints] = await Promise.all([
              taskService.getProjectUsers(resolvedProjectId),
              sprintService.listSprints(resolvedProjectId),
            ])
            setAssigneeOptions(users)
            setSprintOptions(sprints)
          } else {
            setAssigneeOptions([])
            setSprintOptions([])
          }
          return
        } catch (error) {
          console.error(`❌ Error cargando datos iniciales (intento ${attempt}/${maxAttempts}):`, error)
          if (attempt === maxAttempts) return
          await sleep(retryDelayMs)
        }
      }
    }
    loadInitialData()
  }, [setTasks])

  const handleSprintSaved = useCallback((savedSprint: SprintOption) => {
    setSprintOptions((current) => {
      const next = current.some((s) => s.idSprint === savedSprint.idSprint)
        ? current.map((s) => (s.idSprint === savedSprint.idSprint ? savedSprint : s))
        : [...current, savedSprint]
      return next.sort((a, b) => a.sprintNumber - b.sprintNumber)
    })
  }, [])

  const handleSprintDeleted = useCallback(
    (sprintId: number) => {
      setSprintOptions((current) => current.filter((s) => s.idSprint !== sprintId))
      setTasks(
        tasks.map((task) => (task.sprintId === sprintId ? { ...task, sprintId: undefined } : task))
      )
    },
    [setTasks, tasks]
  )

  // ── Activar sprint ────────────────────────────────────────────────────────
  const handleActivateSprint = useCallback(async () => {
    if (!nextPlannedSprint || isSprintActionLoading) return
    const confirmed = window.confirm(
      `¿Activar el sprint "${nextPlannedSprint.title}"?\n\nEsto lo marcará como el sprint en curso.`
    )
    if (!confirmed) return

    setIsSprintActionLoading(true)
    try {
      const updated = await sprintService.activateSprint(nextPlannedSprint.idSprint)
      setSprintOptions((current) =>
        current.map((s) => (s.idSprint === updated.idSprint ? updated : s))
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al activar el sprint.')
    } finally {
      setIsSprintActionLoading(false)
    }
  }, [nextPlannedSprint, isSprintActionLoading])

  // ── Cerrar sprint (trigger del RAG) ──────────────────────────────────────
  const handleCloseSprint = useCallback(async () => {
    if (!activeSprint || isSprintActionLoading) return
    const confirmed = window.confirm(
      `¿Cerrar el sprint "${activeSprint.title}"?\n\n` +
        `Esta acción guardará el estado definitivo de todas las tareas ` +
        `y generará el embedding del sprint para el sistema de reportes RAG.\n\n` +
        `Esta operación no puede revertirse.`
    )
    if (!confirmed) return

    setIsSprintActionLoading(true)
    try {
      const updated = await sprintService.closeSprint(activeSprint.idSprint)
      setSprintOptions((current) =>
        current.map((s) => (s.idSprint === updated.idSprint ? updated : s))
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cerrar el sprint.')
    } finally {
      setIsSprintActionLoading(false)
    }
  }, [activeSprint, isSprintActionLoading])

  // ── Construir los custom buttons del header dinámicamente ─────────────────
  const sprintLifecycleButtons = useMemo(() => {
    const buttons = []

    // Botón "Activar Sprint" — visible si hay un sprint PLANNED y ninguno ACTIVE
    if (!activeSprint && nextPlannedSprint) {
      buttons.push({
        label: isSprintActionLoading ? 'Activando...' : `Activar: ${nextPlannedSprint.title}`,
        icon: Play,
        onClick: handleActivateSprint,
        variant: 'outline' as const,
        testId: 'btn-activate-sprint',
      })
    }

    // Botón "Cerrar Sprint" — visible solo si hay un sprint ACTIVE
    if (activeSprint) {
      buttons.push({
        label: isSprintActionLoading ? 'Cerrando...' : `Cerrar: ${activeSprint.title}`,
        icon: CheckCircle,
        onClick: handleCloseSprint,
        variant: 'outline' as const,
        testId: 'btn-close-sprint',
      })
    }

    return buttons
  }, [activeSprint, nextPlannedSprint, isSprintActionLoading, handleActivateSprint, handleCloseSprint])

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen app-background">
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
          // Pasar los botones de ciclo de vida como custom buttons del header
          sprintLifecycleButtons={sprintLifecycleButtons}
        />
      </div>
    </DndProvider>
  )
}