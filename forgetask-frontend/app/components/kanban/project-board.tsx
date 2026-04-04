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
import { useDrop } from 'react-dnd'
import {
  Circle,
  Layers,
  CircleDot,
  Eye,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Users,
} from 'lucide-react'
import { TaskCard, type Task } from './task-card'
import { AddTaskDialog } from './add-task-dialog'
import { TaskDetailsDialog } from './task-details-dialog'
import { MembersDialog } from './members-dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Progress } from '../ui/progress'
import { useTaskStore } from '@/app/store/taskStore'

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
  
  // Detectar si está sobrecargado (solo si hay límite esperado)
  const isOverloaded = expectedTasks !== undefined && tasks.length > expectedTasks
  
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
      className={`flex flex-col h-full rounded-lg border-2 transition-colors relative ${
        isOver ? 'border-primary bg-primary/5' : 'border-border bg-card'
      }`}
    >
      {/* Alerta de Sobrecarga - Posicionada mejor dentro del contenedor */}
      {isOverloaded && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-red-400/10 border border-red-400/30 rounded px-2 py-1">
          <AlertTriangle className="w-3 h-3 text-red-400" />
          <span className="text-xs text-red-400 font-medium">+{tasks.length - (expectedTasks || 0)}</span>
        </div>
      )}

      {/* Column Header - Altura fija */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-foreground">{title}</span>
          
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
                    ? 'bg-red-500/20 text-red-600 border border-red-500/50'
                    : 'bg-accent/10 text-accent'
                }`}
                title={isOverloaded ? `Sobre límite: ${tasks.length}/${expectedTasks}` : `Click para editar límite`}
              >
                {tasks.length}/{expectedTasks}
              </span>
            )
          )}
        </div>
      </div>

      {/* Tasks Container - Altura flexible con scroll individual */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
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
}

/**
 * Componente principal del tablero Kanban
 * Lee tareas del store global y envía cambios via WebSocket
 */
export function ProjectBoard({
  onSendUpdate,
  onSendCreate,
  onSendDelete,
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
    onSendUpdate(task.id, { ...task, status: newStatus })
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
    console.log('📤 Eliminando tarea:', id)

    // Enviar al backend via WebSocket
    onSendDelete(id)
  }, [onSendDelete])

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
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex-shrink-0">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Project Board</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your tasks and track progress · Real-time updates via WebSocket
                </p>
              </div>
              {/* Indicador de conexión WebSocket */}
              <div className="flex items-center gap-2 ml-4 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-muted-foreground">WebSocket Connected</span>
              </div>
            </div>
          </div>

          {/* Progreso */}
          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-foreground">
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
            <AddTaskDialog onAddTask={handleAddTask} />
          </div>
        </div>
      </header>

      {/* Columns Container */}
      <div className="flex-1 min-h-0 overflow-x-auto p-6 bg-background">
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
              icon={<Eye className="w-5 h-5 text-accent" />}
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
