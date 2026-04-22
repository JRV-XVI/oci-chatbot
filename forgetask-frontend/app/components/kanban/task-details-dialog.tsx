'use client'

/**
 * MODIFICADO EN ESTE PROMPT
 * Diálogo para ver y editar detalles de una tarea
 *
 * CAMBIOS: Agregados comentarios explicativos
 * CÓMO FUNCIONA CON WEBSOCKET:
 * 1. Usuario abre un detalles de una tarea
 * 2. Usuario modifica los campos (título, status, prioridad, etc.)
 * 3. Al click en "Save", se ejecuta handleSave
 * 4. handleSave llama a onUpdateTask (que ProjectBoard pasa desde WebSocket)
 * 5. onUpdateTask envía mensaje UPDATE al backend via WebSocket
 * 6. Backend actualiza la tarea en BD y emite evento TASK_UPDATED a todos los clientes
 * 7. Todos los clientes reciben el evento y actualizan el store automáticamente
 */

import type * as React from 'react'
import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { DatePickerInput } from '../ui/date-picker-input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import type { Task } from './task-card'
import type { TaskAssigneeOption } from '@/app/types/task'
import type { SprintOption } from '@/app/types/sprint'

interface TaskDetailsDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateTask: (task: Task) => void
  assigneeOptions: TaskAssigneeOption[]
  sprintOptions: SprintOption[]
}

/**
 * Diálogo para editar detalles de una tarea
 *
 * Props:
 * - task: Tarea a editar (null si no hay seleccionada)
 * - open: Si el diálogo está abierto
 * - onOpenChange: Callback para cambiar estado del diálogo
 * - onUpdateTask: Callback para guardar cambios
 *   (ProjectBoard pasa una función que ejecuta WebSocket.updateTask)
 */
export function TaskDetailsDialog({
  task,
  open,
  onOpenChange,
  onUpdateTask,
  assigneeOptions,
  sprintOptions,
}: TaskDetailsDialogProps) {
  // Estado del formulario
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Task['status']>('backlog')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [estimatedTime, setEstimatedTime] = useState('')
  const [realTime, setRealTime] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [sprintId, setSprintId] = useState('')
  const [dateError, setDateError] = useState('')

  const formatSprintLabel = (idSprint: number) => {
    const sprint = sprintOptions.find((option) => option.idSprint === idSprint)
    if (!sprint) {
      return 'Sprint'
    }
    const start = sprint.startDate || '-'
    const end = sprint.endDate || '-'
    return `${sprint.title} (${start} - ${end})`
  }

  const normalizeDateForInput = (value?: string) => {
    if (!value) {
      return ''
    }

    const trimmed = value.trim()
    if (trimmed.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10)
    }

    return ''
  }

  /**
   * Cuando la tarea seleccionada cambia, llenar el formulario con sus datos
   * (Cuando usuario hace click en una tarjeta, ProjectBoard abre este diálogo)
   */
  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || '')
      setStatus(task.status)
      setPriority(task.priority || 'medium')
      setStartDate(normalizeDateForInput(task.startDate))
      setEndDate(normalizeDateForInput(task.endDate))
      setEstimatedTime(task.estimatedTime?.toString() || '')
      setRealTime(task.realTime?.toString() || '')

      const usernameFromTask = task.assignedUsername || ''
      const displayNameFromTask = task.assignedTo?.[0] || ''

      const matchedOption = assigneeOptions.find((option) => {
        if (usernameFromTask && option.username === usernameFromTask) {
          return true
        }
        return displayNameFromTask && option.displayName === displayNameFromTask
      })

      setAssignedTo(matchedOption?.username || usernameFromTask || '')

      if (task.sprintId !== undefined && task.sprintId !== null) {
        setSprintId(String(task.sprintId))
      } else {
        setSprintId('')
      }
    }
  }, [task, assigneeOptions])

  /**
   * Validar rango de fechas en tiempo real
   * Si startDate > endDate, mostrar error
   */
  useEffect(() => {
    if (startDate && endDate && startDate > endDate) {
      setDateError('Start date must be before end date')
    } else {
      setDateError('')
    }
  }, [startDate, endDate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !title.trim()) return;

    // VALIDATION: START DATE < END DATE
    if (dateError) {
      return;
    }

    const parsedEstimatedTime = estimatedTime.trim() === '' ? undefined : Number(estimatedTime)
    const parsedRealTime = realTime.trim() === '' ? undefined : Number(realTime)

    const estimatedTimeValue = Number.isFinite(parsedEstimatedTime) ? parsedEstimatedTime : undefined
    const realTimeValue = Number.isFinite(parsedRealTime) ? parsedRealTime : undefined

    const resolvedSprintId = sprintId ? Number(sprintId) : null
    const sprintIdValue = resolvedSprintId === null
      ? null
      : Number.isFinite(resolvedSprintId)
        ? resolvedSprintId
        : null

    onUpdateTask({
      ...task,
      sprintId: sprintIdValue,
      title,
      description: description || undefined,
      status,
      priority,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      estimatedTime: estimatedTimeValue,
      realTime: realTimeValue,
      assignedTo: assignedTo ? [assignedTo] : undefined,
    });

    onOpenChange(false);
  };

  if (!task) return null;

  if (!task || !open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-[2px] p-4" data-testid="dialog-task-details">
      <div className="w-full max-w-[680px] max-h-[90vh] overflow-y-auto rounded-xl border border-[#2b3542] bg-[#0d1117] p-6 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#2b3542]">
          <div>
            <h2 className="text-xl font-semibold text-[#e6edf3]">Task Details</h2>
            <p className="text-sm text-[#9aa4b2] mt-1">
              View and edit the details of this task.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Close
          </Button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-5">
            <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                data-testid="input-edit-task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
                required
              />
            </div>
            <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                data-testid="input-edit-task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  data-testid="select-edit-task-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Task["status"])}
                  title="Task status"
                  className="border-input bg-input-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer"
                >
                  <option value="backlog">Backlog</option>
                  <option value="ready">Ready</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <select
                  id="edit-priority"
                  data-testid="select-edit-task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Task["priority"])}
                  title="Task priority"
                  className="border-input bg-input-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
              <Label htmlFor="edit-startDate">Start Date</Label>
              <DatePickerInput
                id="edit-startDate"
                testId="input-edit-task-start-date"
                value={startDate}
                onChange={setStartDate}
              />
            </div>
            <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
              <Label htmlFor="edit-endDate">End Date</Label>
              <DatePickerInput
                id="edit-endDate"
                testId="input-edit-task-end-date"
                value={endDate}
                onChange={setEndDate}
              />
              {dateError && (
                <div className="flex items-center gap-2 text-red-400 text-sm mt-1 font-medium">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{dateError}</span>
                </div>
              )}
            </div>
            <div className="rounded-lg border border-[#2b3542] bg-[#11161f] p-3 mt-1">
              <h3 className="font-medium text-[#e6edf3] mb-3">Time Tracking (hours)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-estimatedTime">Estimated Time</Label>
                  <Input
                    id="edit-estimatedTime"
                    data-testid="input-edit-task-estimated-time"
                    type="number"
                    step="0.5"
                    min="0"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-realTime">Real Time</Label>
                  <Input
                    id="edit-realTime"
                    data-testid="input-edit-task-real-time"
                    type="number"
                    step="0.5"
                    min="0"
                    value={realTime}
                    onChange={(e) => setRealTime(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
              <Label htmlFor="edit-assignedTo">Assigned To</Label>
              <select
                id="edit-assignedTo"
                data-testid="select-edit-task-assigned-to"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                title="Assigned user"
                className="border-input bg-input-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer"
                disabled={assigneeOptions.length === 0}
              >
                {assigneeOptions.length === 0 ? (
                  <option value="">No users available</option>
                ) : (
                  assigneeOptions.map((option) => (
                    <option key={`${option.idProject}-${option.idUser}`} value={option.username}>
                      {option.displayName}
                      {option.role ? ` (${option.role})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
              <Label htmlFor="edit-sprint">Sprint</Label>
              <select
                id="edit-sprint"
                data-testid="select-edit-task-sprint"
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                title="Sprint"
                className="border-input bg-input-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer"
              >
                <option value="">Sin sprint</option>
                {sprintOptions.map((sprint) => (
                  <option key={sprint.idSprint} value={String(sprint.idSprint)}>
                    {formatSprintLabel(sprint.idSprint)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-[#2b3542]">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!!dateError}
              data-testid="btn-save-task"
              className={`cursor-pointer text-white ${
                dateError ? 'opacity-50 cursor-not-allowed bg-gray-600' : 'neon-orange-bg'
              }`}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
