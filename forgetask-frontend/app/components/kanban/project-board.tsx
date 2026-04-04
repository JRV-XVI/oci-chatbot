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
import Image from 'next/image'
import { useDrop } from 'react-dnd'
import {
  Circle,
  Layers,
  CircleDot,
  Eye,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Users,
} from 'lucide-react'
import { TaskCard, type Task } from './task-card'
import { AddTaskDialog } from './add-task-dialog'
import { TaskDetailsDialog } from './task-details-dialog'
import { MembersDialog } from './members-dialog'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { useTaskStore } from '@/app/store/taskStore'
import type { TaskAssigneeOption } from '@/app/types/task'

interface ColumnProps {
  title: string
  status: Task['status']
  tasks: Task[]
  icon: React.ReactNode
  expectedTasks?: number  // Opcional - si es undefined, no hay límite (como Done)
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
      className={`flex flex-col h-full rounded-xl border transition-colors ${
        isOver
          ? 'border-[#e76b36]/75 bg-[#20120d]/95 shadow-[0_0_18px_rgba(231,107,54,0.26)]'
          : 'border-[#923811]/55 bg-[#170f0c]/95 shadow-[0_0_10px_rgba(146,56,17,0.24)]'
      }`}
    >
      {/* Column Header - Altura fija */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-[#923811]/40">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-[#ffe7dc]">{title}</span>
          
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
                    : 'bg-[#2a130b] text-[#ffb693] border border-[#923811]/60'
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
            className={`cursor-pointer select-none flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-[#e76b36] border border-[#e76b36]/50 bg-[#2d1208]/70 transition-all duration-150 ${
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
        <div className="mx-3 mt-3 rounded-md border border-[#923811]/70 bg-[#140c09] p-3 text-xs shadow-[0_0_14px_rgba(146,56,17,0.45)]">
          <p className="font-semibold text-[#e76b36] neon-orange">Over limit in {title}</p>
          <p className="mt-1 text-[#ffccb3]">
            Current: <span className="text-[#fff1e9]">{tasks.length}</span> · Expected: <span className="text-[#fff1e9]">{expectedTasks}</span>
          </p>
          {overloadedTasks.length > 0 && (
            <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
              {overloadedTasks.map((task) => (
                <p key={task.id} className="truncate text-[#ffd5c2]">
                  {task.title}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tasks Container - Altura flexible con scroll individual */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[#c99a84] text-sm">
            No tasks in {title.toLowerCase()}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
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
  onSendUpdate: (taskId: string, taskData: Partial<Task>) => void
  onSendCreate: (taskData: Omit<Task, 'id'>) => void
  onSendDelete: (taskId: string) => void
  assigneeOptions: TaskAssigneeOption[]
}

/**
 * Componente principal del tablero Kanban
 * Lee tareas del store global y envía cambios via WebSocket
 */
export function ProjectBoard({
  onSendUpdate,
  onSendCreate,
  onSendDelete,
  assigneeOptions,
}: ProjectBoardProps) {
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
    onSendUpdate(task.id, { status: newStatus })
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
  const handleGenerateReport = () => {
    const totalTasks = tasks.length
    const completedTasks = doneTasks.length
    const inProgressCount = inProgressTasks.length
    const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0)
    const totalRealHours = tasks.reduce((sum, task) => sum + (task.realTime || 0), 0)

    const report = `Project Board Report\nGenerated: ${new Date().toLocaleString()}\n\n=== Summary ===\nTotal Tasks: ${totalTasks}\nCompleted: ${completedTasks}\nIn Progress: ${inProgressCount}\nBacklog: ${backlogTasks.length}\nReady: ${readyTasks.length}\nReview: ${reviewTasks.length}\n\n=== Time Tracking ===\nTotal Estimated Hours: ${totalEstimatedHours}\nTotal Real Hours: ${totalRealHours}\nVariance: ${totalRealHours - totalEstimatedHours} hours\n\n=== Tasks by Status ===\n${tasks
      .map(
        (task) =>
          `- [${task.status.toUpperCase()}] ${task.title} (Priority: ${task.priority || 'none'})`,
      )
      .join('\n')}`

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `project-report-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Filtrar tareas por estado - memoizado para evitar re-cálculos innecesarios
  const backlogTasks = useMemo(() => tasks.filter((task) => task.status === 'backlog'), [tasks])
  const readyTasks = useMemo(() => tasks.filter((task) => task.status === 'ready'), [tasks])
  const inProgressTasks = useMemo(() => tasks.filter((task) => task.status === 'in-progress'), [tasks])
  const reviewTasks = useMemo(() => tasks.filter((task) => task.status === 'review'), [tasks])
  const doneTasks = useMemo(() => tasks.filter((task) => task.status === 'done'), [tasks])

  // Calcular métricas - memoizado
  const totalEstimatedHours = useMemo(() => tasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0), [tasks])
  const completedEstimatedHours = useMemo(() => doneTasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0), [doneTasks])
  const progressPercentage = useMemo(() =>
    totalEstimatedHours > 0 ? Math.round((completedEstimatedHours / totalEstimatedHours) * 100) : 0,
    [totalEstimatedHours, completedEstimatedHours]
  )

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* Header */}
      <header className="border-b border-[#923811]/45 bg-[#160f0c] px-6 py-4 shadow-[0_0_18px_rgba(146,56,17,0.22)]">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center rounded-xl border border-[#e76b36]/50 bg-[#1b0f0b] p-3 shadow-[0_0_22px_rgba(231,107,54,0.55)]">
                <Image src="/CloudForge.svg" alt="CloudForge" width={86} height={86} priority />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#ffe9dd] neon-orange">Project Board</h1>
                <p className="text-sm text-[#d1a28c] mt-1">
                  Manage your tasks and track progress · Real-time updates via WebSocket
                </p>
              </div>
              {/* Indicador de conexión WebSocket */}
              <div className="flex items-center gap-2 ml-4 px-3 py-1 rounded-full bg-[#923811]/20 border border-[#923811]/50 shadow-[0_0_10px_rgba(146,56,17,0.5)]">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-[#ffd5c2] neon-brown">WebSocket Connected</span>
              </div>
            </div>
          </div>

          {/* Progreso */}
          <div className="flex-1 max-w-md min-w-[240px]">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[#d1a28c]">Progress</span>
              <span className="font-semibold text-[#fff1e9]">
                {completedEstimatedHours}h / {totalEstimatedHours}h ({progressPercentage}%)
              </span>
            </div>
            <Progress value={progressPercentage} className="h-1.5" />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button onClick={() => setMembersDialogOpen(true)} variant="outline" className="cursor-pointer">
              <Users className="w-4 h-4 mr-2" />
              Members
            </Button>
            <Button onClick={handleGenerateReport} variant="outline" className="cursor-pointer">
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
            <AddTaskDialog onAddTask={handleAddTask} assigneeOptions={assigneeOptions} />
          </div>
        </div>
      </header>

      {/* Columns Container */}
      <div className="flex-1 min-h-0 overflow-x-auto p-6 app-background">
        <div className="flex gap-6 h-full">
          {/* Backlog Column */}
          <div className="flex-1 min-w-[300px] h-full">
            <MemoizedColumn
              title="Backlog"
              status="backlog"
              tasks={backlogTasks}
              icon={<Circle className="w-5 h-5 text-muted-foreground" />}
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
              icon={<CircleDot className="w-5 h-5 text-blue-400" />}
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
              icon={<Eye className="w-5 h-5 text-destructive" />}
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
              icon={<CheckCircle2 className="w-5 h-5 text-green-400" />}
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
        />
      )}

      {/* Members Dialog */}
      <MembersDialog
        open={membersDialogOpen}
        onOpenChange={setMembersDialogOpen}
        tasks={tasks}
      />
    </div>
  )
}
