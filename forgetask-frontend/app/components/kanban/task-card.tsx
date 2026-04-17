'use client'

/**
 * MODIFICADO EN ESTE PROMPT
 * Tarjeta de tarea arrastra y sueltable
 * 
 * CAMBIOS: Agregados comentarios explicativos
 * Se integra con el sistema WebSocket donde ProjectBoard maneja las acciones
 */

import { useDrag } from 'react-dnd'
import { GripVertical, Trash2, Calendar, Clock, User, Layers } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { memo } from 'react'
import type { Task } from '@/app/types/task'
import type { SprintOption } from '@/app/types/sprint'
export type { Task }

interface TaskCardProps {
  task: Task
  sprintOptions: SprintOption[]
  onTaskClick: (task: Task) => void
  onDeleteTask: (id: string) => void
}

/**
 * Tarjeta de tarea draggable
 *
 * PROPS:
 * - task: Datos de la tarea a mostrar
 * - onTaskClick: Callback cuando usuario hace click - abre diálogo de detalles
 * - onDeleteTask: Callback cuando usuario hace click en eliminar - envía DELETE via WebSocket
 *
 * CARACTERÍSTICAS:
 * - Draggable: Usa react-dnd para permitir arrastrar el cuerpo a otra columna
 * - Se suscribe a drag events y cambia opacidad cuando se arrastra
 * - Muestra prioridad con badge de colores (bajo=verde, medio=amarillo, alto=rojo)
 * - Muestra fechas, horas estimadas/reales, y usuario asignado
 * - Botón delete que aparece al pasar el mouse
 */
export function TaskCard({ task, sprintOptions, onTaskClick, onDeleteTask }: TaskCardProps) {
  // useDrag: Hook de react-dnd que hace esta tarjeta arrastrable
  // Cuando se arrastra, se envía el objeto { task } al drop handler en Column
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'task', // Tipo de objeto que se arrastra
    item: { task }, // Datos que se envían al soltar
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(), // true si actualmente se esta arrastrando
    }),
  }))

  const priorityColors = {
    low: 'task-tag task-tag-priority-low',
    medium: 'task-tag task-tag-priority-medium',
    high: 'task-tag task-tag-priority-high',
  }

  const sprintTagVariants = [
    'task-tag-sprint-1',
    'task-tag-sprint-2',
    'task-tag-sprint-3',
    'task-tag-sprint-4',
    'task-tag-sprint-5',
    'task-tag-sprint-6',
  ] as const

  const resolveSprintTagClass = (sprintId?: number | null) => {
    if (!sprintId || !Number.isFinite(sprintId)) {
      return sprintTagVariants[0]
    }

    return sprintTagVariants[Math.abs(sprintId) % sprintTagVariants.length]
  }

  /**
   * Al hacer click en la tarjeta, abrir diálogo de detalles
   */
  const handleCardClick = () => {
    onTaskClick(task)
  }

  const formatTaskDate = (value: string) => {
    const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/
    const match = value.match(dateOnlyPattern)

    // Keep backend date-only values as-is for consistent UI and input compatibility.
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`
    }

    const trimmed = value.trim()
    if (trimmed.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10)
    }

    return value
  }

  const hasAnyDate = Boolean(task.startDate || task.endDate)
  const dateRangeLabel = `${task.startDate ? formatTaskDate(task.startDate) : '-'} - ${task.endDate ? formatTaskDate(task.endDate) : '-'}`

  const sprint = task.sprintId ? sprintOptions.find((option) => option.idSprint === task.sprintId) : undefined
  const sprintLabel = sprint?.title
  const sprintRangeTitle = sprint ? `${sprint.title} (${sprint.startDate || '-'} - ${sprint.endDate || '-'})` : undefined

  return (
    <div
      ref={(node) => {
        drag(node)
      }}
      className={`bg-[#0d1117] rounded-lg border border-[#2b3542] p-3 group hover:border-[#e76b36]/55 hover:shadow-[0_0_12px_rgba(231,107,54,0.18)] transition-all cursor-pointer ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle Icon */}
        <div className="cursor-move">
          <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        </div>

        {/* Task Content */}
        <div className="flex-1 min-w-0 space-y-2" onClick={handleCardClick}>
          <h3 className="font-medium text-[#e6edf3]">{task.title}</h3>

          {/* Priority Badge */}
          {task.priority && (
            <Badge variant="outline" className={priorityColors[task.priority]}>
              {task.priority}
            </Badge>
          )}

          {/* Sprint */}
          {task.sprintId !== undefined && task.sprintId !== null && sprintLabel && (
            <Badge
              variant="outline"
              className={`task-tag ${resolveSprintTagClass(task.sprintId)}`}
              title={sprintRangeTitle}
            >
              <Layers className="w-3 h-3 flex-shrink-0" />
              <span className="truncate max-w-[170px]">{sprintLabel}</span>
            </Badge>
          )}

          {/* Date Range */}
          {hasAnyDate && (
            <div className="flex items-center gap-1 text-xs text-[#e6edf3]">
              <Calendar className="w-3 h-3 flex-shrink-0 text-[#f19367]" />
              <div className="inline-block font-medium">
                {dateRangeLabel}
              </div>
            </div>
          )}

          {/* Time Estimates */}
          <div className="flex items-center gap-3 text-xs text-[#9aa4b2]">
            {task.estimatedTime !== undefined && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>Est: {task.estimatedTime}h</span>
              </div>
            )}
            {task.realTime !== undefined && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>Real: {task.realTime}h</span>
              </div>
            )}
          </div>

          {/* Assignee */}
          {task.assignedTo && task.assignedTo.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-[#9aa4b2]">
              <User className="w-3 h-3 flex-shrink-0" />
              <span>{task.assignedTo.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Delete Button - appears on hover */}
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 flex-shrink-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            // Enviar DELETE al backend via WebSocket (onDeleteTask)
            onDeleteTask(task.id)
          }}
        >
          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </div>
  )
}

export default memo(TaskCard)
