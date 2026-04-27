'use client'

/**
 * MODIFICADO EN ESTE PROMPT
 * Tablero Kanban principal que:
 * 1. Lee tareas del store global de Zustand (no state local)
 * 2. Acepta funciones WebSocket para enviar cambios al backend
 * 3. Maneja dragging, creación, actualización y eliminación de tareas via WebSocket
 * 4. Re-renderiza automáticamente cuando el store cambia
 * 5. Muestra indicador de conexión
 */

import * as React from 'react'
import { useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDrop } from 'react-dnd'
import {
  Circle,
  Layers,
  CircleDot,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { TaskCard, type Task } from './task-card'
import { AddTaskDialog } from './add-task-dialog'
import { AddSprintDialog } from './add-sprint-dialog'
import { TaskDetailsDialog } from './task-details-dialog'
import { MembersDialog } from './members-dialog'
import { ProjectHeader } from './project-header'
import { useTaskStore } from '@/app/store/taskStore'
import type { TaskAssigneeOption } from '@/app/types/task'
import type { SprintOption } from '@/app/types/sprint'
import reportService from '@/app/services/reportService'
import { getCurrentProjectId } from '@/app/services/authUtils'

interface ColumnProps {
  title: string
  status: Task['status']
  tasks: Task[]
  icon: React.ReactNode
  expectedTasks?: number  // Opcional - si es undefined, no hay límite (como Done)
  sprintOptions: SprintOption[]
  onDrop: (task: Task, newStatus: Task['status']) => void
  onDeleteTask: (id: string) => void
  onTaskClick: (task: Task) => void
  onExpectedChange: (status: Task['status'], value: number) => void
}

function Column({
  title,
  status,
  tasks,
  icon,
  expectedTasks,
  sprintOptions,
  onDrop,
  onDeleteTask,
  onTaskClick,
  onExpectedChange,
}: ColumnProps) {
  // Estado para edición del contador esperado
  const [isEditingExpected, setIsEditingExpected] = useState(false)
  const [editValue, setEditValue] = useState(expectedTasks?.toString() || '0')
  const [showOverloadDetails, setShowOverloadDetails] = useState(false)
  
  // Detectar si está sobrecargado (solo si hay límite esperado)
  const isOverloaded = expectedTasks !== undefined && tasks.length > expectedTasks
  const overloadCount = expectedTasks !== undefined ? Math.max(tasks.length - expectedTasks, 0) : 0
  const overloadedTasks = expectedTasks !== undefined ? tasks.slice(expectedTasks) : []
  
  // Detectar si es columna sin límite (Done)
  const hasNoLimit = expectedTasks === undefined

  // Manejar guardar el nuevo valor esperado
  const handleSaveExpected = useCallback(() => {
    const newValue = parseInt(editValue)
    if (!isNaN(newValue) && newValue > 0) {
      onExpectedChange(status, newValue)
    } else if (expectedTasks !== undefined) {
      setEditValue(expectedTasks.toString())
    }
    setIsEditingExpected(false)
  }, [editValue, status, expectedTasks, onExpectedChange])

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'task',
    drop: (item: { task: Task }) => {
      onDrop(item.task, status)
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }))

  return (
    <div
      ref={drop as unknown as React.LegacyRef<HTMLDivElement>}
      data-testid={`kanban-column-${status}`}
      className={`flex flex-col h-full rounded-xl border transition-colors ${
        isOver
          ? 'border-[#e76b36]/70 bg-[#11161f]/95 shadow-[0_0_16px_rgba(231,107,54,0.24)]'
          : 'border-[#2b3542] bg-[#0d1117]/95 shadow-[0_0_10px_rgba(0,0,0,0.28)]'
      }`}
    >
      {/* Column Header - Altura fija */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-[#2b3542]">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-[#e6edf3]">{title}</span>
          
          {/* CASO 1: Columna sin límite (Done) - Solo mostrar contador simple */}
          {hasNoLimit ? (
            <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded font-semibold">
              {tasks.length}
            </span>
          ) : (
            /* CASO 2: Columna con límite - Contador editable con formato actual/esperado */
            isEditingExpected ? (
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSaveExpected}
                onKeyPress={(e) => e.key === 'Enter' && handleSaveExpected()}
                autoFocus
                aria-label={`Expected tasks for ${title}`}
                title={`Expected tasks for ${title}`}
                placeholder="Expected"
                className="w-12 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded border border-accent text-center font-semibold"
              />
            ) : (
              <span
                onClick={() => {
                  setEditValue(expectedTasks?.toString() || '0')
                  setIsEditingExpected(true)
                }}
                className={`text-xs px-2 py-0.5 rounded cursor-pointer font-semibold transition-all duration-200 ${
                  isOverloaded
                    ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                    : 'bg-[#11161f] text-[#f19367] border border-[#2b3542]'
                }`}
                title={isOverloaded ? `Sobre límite: ${tasks.length}/${expectedTasks}` : `Click para editar límite`}
              >
                {tasks.length}/{expectedTasks}
              </span>
            )
          )}
        </div>

        {isOverloaded && (
          <button
            type="button"
            onClick={() => setShowOverloadDetails((current) => !current)}
            className={`cursor-pointer select-none flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-[#e76b36] border border-[#e76b36]/45 bg-[#11161f] transition-all duration-150 ${
              showOverloadDetails
                ? 'shadow-[0_0_16px_rgba(231,107,54,0.62)] ring-1 ring-[#e76b36]/65'
                : 'shadow-[0_0_10px_rgba(231,107,54,0.45)] hover:shadow-[0_0_14px_rgba(231,107,54,0.58)]'
            }`}
            title="Show overload details"
            aria-label={`Column ${title} has ${overloadCount} extra tasks`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>+{overloadCount}</span>
            {showOverloadDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {showOverloadDetails && isOverloaded && (
        <div className="mx-3 mt-3 rounded-md border border-[#2b3542] bg-[#0d1117] p-3 text-xs shadow-[0_0_12px_rgba(0,0,0,0.26)]">
          <p className="font-semibold text-[#e76b36] neon-orange">Over limit in {title}</p>
          <p className="mt-1 text-[#9aa4b2]">
            Current: <span className="text-[#e6edf3]">{tasks.length}</span> · Expected: <span className="text-[#e6edf3]">{expectedTasks}</span>
          </p>
          {overloadedTasks.length > 0 && (
            <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
              {overloadedTasks.map((task) => (
                <p key={task.id} className="truncate text-[#e6edf3]">
                  {task.title}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tasks Container - Altura flexible con scroll individual */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3" data-testid={`kanban-column-${status}-tasks`}>
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[#9aa4b2] text-sm">
            No tasks in {title.toLowerCase()}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              sprintOptions={sprintOptions}
              onTaskClick={onTaskClick}
              onDeleteTask={onDeleteTask}
            />
          ))
        )}
      </div>
    </div>
  )
}

const MemoizedColumn = React.memo(Column)

/**
 * Props que recibe ProjectBoard de KanbanApp
 * Funciones WebSocket para enviar cambios al backend
 */
interface ProjectBoardProps {
  projectTitle: string
  onSendUpdate: (taskId: string, taskData: Partial<Task>) => void
  onSendCreate: (taskData: Omit<Task, 'id'>) => void
  onSendDelete: (taskId: string) => void
  assigneeOptions: TaskAssigneeOption[]
  projectId: number | null
  sprintOptions: SprintOption[]
  onSprintSaved: (sprint: SprintOption) => void
  onSprintDeleted: (sprintId: number) => void
}

/**
 * Componente principal del tablero Kanban
 * Lee tareas del store global y envía cambios via WebSocket
 */
export function ProjectBoard({
  projectTitle,
  onSendUpdate,
  onSendCreate,
  onSendDelete,
  assigneeOptions,
  projectId,
  sprintOptions,
  onSprintSaved,
  onSprintDeleted,
}: ProjectBoardProps) {
  const router = useRouter()

  // Obtener tareas del store global (se actualiza automáticamente con eventos WebSocket)
  const tasks = useTaskStore((state) => state.tasks)

  // Estados locales para UI
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [membersDialogOpen, setMembersDialogOpen] = useState(false)
  const [expectedTasks, setExpectedTasks] = useState({
    backlog: 5,
    ready: 3,
    'in-progress': 4,
    review: 2,
    done: 10,
  })

  const resolvedProjectId = useMemo(() => projectId ?? getCurrentProjectId(), [projectId])

  /**
   * Manejar drag & drop
   * Cuando usuario arrastra tarea a otra columna, enviar UPDATE via WebSocket
   */
  const handleDrop = useCallback((task: Task, newStatus: Task['status']) => {
    if (task.status === newStatus) return

    console.log(`📤 Arrastrando tarea ${task.id} a ${newStatus}`)

    // Enviar al backend via WebSocket
    // El backend emitirá evento a todos los clientes
    // No actualizamos state localmente - esperamos respuesta del servidor
    onSendUpdate(task.id, { status: newStatus, sprintId: task.sprintId ?? null })
  }, [onSendUpdate])

  /**
   * Manejar creación de nueva tarea
   * Enviar al backend via WebSocket
   */
  const handleAddTask = useCallback((newTask: Omit<Task, 'id'>) => {
    console.log('📤 Creando nueva tarea:', newTask.title)

    // Enviar al backend via WebSocket
    onSendCreate(newTask)
  }, [onSendCreate])

  /**
   * Manejar eliminación de tarea
   * Enviar al backend via WebSocket
   */
  const handleDeleteTask = useCallback((id: string) => {
    const taskToDelete = tasks.find((task) => task.id === id)
    const taskLabel = taskToDelete?.title ? `"${taskToDelete.title}"` : `#${id}`

    const confirmed = window.confirm(
      `Are you sure you want to delete task ${taskLabel}? This action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    console.log('📤 Eliminando tarea:', id)

    // Enviar al backend via WebSocket
    onSendDelete(id)
  }, [onSendDelete, tasks])

  /**
   * Manejar click en tarea para abrir detalles
   */
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task)
    setDetailsDialogOpen(true)
  }, [])

  /**
   * Manejar actualización de tarea desde el diálogo de detalles
   */
  const handleUpdateTask = useCallback((updatedTask: Task) => {
    console.log('📤 Actualizando tarea:', updatedTask.id)

    // Enviar al backend via WebSocket
    onSendUpdate(updatedTask.id, updatedTask)
  }, [onSendUpdate])

  /**
   * Manejar cambio de tareas esperadas para una columna
   */
  const handleExpectedChange = useCallback((status: Task['status'], value: number) => {
    setExpectedTasks((prev) => ({ ...prev, [status]: value }))
  }, [])

  /**
   * Generar reporte de proyecto
   */
  const handleGenerateReport = useCallback(async () => {
    try {
      const { blob, filename } = await reportService.generateCurrentSprintPdfReport()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating PDF report:', error)
      window.alert(error instanceof Error ? error.message : 'No se pudo generar el reporte PDF.')
    }
  }, [])

  const handleOpenKpis = useCallback(() => {
    router.push('/kpis')
  }, [router])

  // Filtrar tareas por estado
  const backlogTasks = tasks.filter((task) => task.status === 'backlog')
  const readyTasks = tasks.filter((task) => task.status === 'ready')
  const inProgressTasks = tasks.filter((task) => task.status === 'in-progress')
  const reviewTasks = tasks.filter((task) => task.status === 'review')
  const doneTasks = tasks.filter((task) => task.status === 'done')

  // Calcular métricas - memoizado
  const totalEstimatedHours = useMemo(() => tasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0), [tasks])
  const completedRealHours = useMemo(() => doneTasks.reduce((sum, task) => sum + (task.realTime || 0), 0), [doneTasks])
  const progressPercentage = useMemo(() =>
    totalEstimatedHours > 0 ? Math.round((completedRealHours / totalEstimatedHours) * 100) : 0,
    [totalEstimatedHours, completedRealHours]
  )

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* Header */}
      <ProjectHeader
        projectTitle={projectTitle}
        completedHours={completedRealHours}
        totalHours={totalEstimatedHours}
        progressPercentage={progressPercentage}
        buttonsConfig={{
          kpis: {
            show: true,
            onClick: handleOpenKpis,
          },
          members: {
            show: true,
            onClick: () => setMembersDialogOpen(true),
          },
          generateReport: {
            show: true,
            onClick: handleGenerateReport,
          },
          addSprint: {
            show: true,
            projectId,
            sprintOptions,
            onSprintSaved,
            onSprintDeleted,
          },
          addTask: {
            show: true,
            onAddTask: handleAddTask,
            assigneeOptions,
            sprintOptions,
          },
        }}
      />

      {/* Columns Container */}
      <div className="flex-1 min-h-0 overflow-x-auto p-6 app-background">
        <div className="flex gap-6 h-full flex-shrink-0 w-fit">
          {/* Backlog Column */}
          <div className="flex-1 min-w-[300px] h-full">
            <MemoizedColumn
              title="Backlog"
              status="backlog"
              tasks={backlogTasks}
              icon={<Circle className="w-5 h-5 text-muted-foreground" />}
              sprintOptions={sprintOptions}
              onDrop={handleDrop}
              onDeleteTask={handleDeleteTask}
              onTaskClick={handleTaskClick}
              onExpectedChange={handleExpectedChange}
              expectedTasks={expectedTasks.backlog}
            />
          </div>

          {/* Ready Column */}
          <div className="flex-1 min-w-[300px] h-full">
            <MemoizedColumn
              title="Ready"
              status="ready"
              tasks={readyTasks}
              icon={<Layers className="w-5 h-5 text-secondary" />}
              sprintOptions={sprintOptions}
              onDrop={handleDrop}
              onDeleteTask={handleDeleteTask}
              onTaskClick={handleTaskClick}
              onExpectedChange={handleExpectedChange}
              expectedTasks={expectedTasks.ready}
            />
          </div>

          {/* In Progress Column */}
          <div className="flex-1 min-w-[300px] h-full">
            <MemoizedColumn
              title="In Progress"
              status="in-progress"
              tasks={inProgressTasks}
              icon={<CircleDot className="w-5 h-5 text-[#f19367]" />}
              sprintOptions={sprintOptions}
              onDrop={handleDrop}
              onDeleteTask={handleDeleteTask}
              onTaskClick={handleTaskClick}
              onExpectedChange={handleExpectedChange}
              expectedTasks={expectedTasks['in-progress']}
            />
          </div>

          {/* Review Column */}
          <div className="flex-1 min-w-[300px] h-full">
            <MemoizedColumn
              title="Review"
              status="review"
              tasks={reviewTasks}
              icon={<Eye className="w-5 h-5 text-[#ffb28e]" />}
              sprintOptions={sprintOptions}
              onDrop={handleDrop}
              onDeleteTask={handleDeleteTask}
              onTaskClick={handleTaskClick}
              onExpectedChange={handleExpectedChange}
              expectedTasks={expectedTasks.review}
            />
          </div>

          {/* Done Column */}
          <div className="flex-1 min-w-[300px] h-full">
            <MemoizedColumn
              title="Done"
              status="done"
              tasks={doneTasks}
              icon={<CheckCircle2 className="w-5 h-5 text-[#e76b36]" />}
              sprintOptions={sprintOptions}
              onDrop={handleDrop}
              onDeleteTask={handleDeleteTask}
              onTaskClick={handleTaskClick}
              onExpectedChange={handleExpectedChange}
            />
          </div>
        </div>
      </div>

      {/* Task Details Dialog */}
      {selectedTask && (
        <TaskDetailsDialog
          task={selectedTask}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          onUpdateTask={handleUpdateTask}
          assigneeOptions={assigneeOptions}
          sprintOptions={sprintOptions}
        />
      )}

      {/* Members Dialog */}
      <MembersDialog
        open={membersDialogOpen}
        onOpenChange={setMembersDialogOpen}
        tasks={tasks}
        projectId={resolvedProjectId ?? undefined}
      />
    </div>
  )
}
