'use client'

import * as React from 'react'
import { useState } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay)
}

function isWithinSprintRange(date: string, sprint: SprintOption): boolean {
  if (!sprint.startDate || !sprint.endDate) return true
  return date >= sprint.startDate && date <= sprint.endDate
}

function normalizeDateForInput(value?: string): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (trimmed.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  return ''
}

// ─── Form initializer ────────────────────────────────────────────────────────
// Función pura que construye el estado inicial del formulario a partir de una
// tarea. Se usa como inicializador lazy de useState y también como valor
// cuando el padre pasa key={task?.id} para montar una instancia nueva.

function buildFormFromTask(task: Task | null, assigneeOptions: TaskAssigneeOption[]) {
  if (!task) {
    return {
      title: '', description: '',
      status: 'backlog' as Task['status'],
      priority: 'medium' as Task['priority'],
      startDate: '', endDate: '',
      estimatedTime: '', realTime: '',
      assignedTo: '', sprintId: '',
    }
  }
  const usernameFromTask = task.assignedUsername || ''
  const displayNameFromTask = task.assignedTo?.[0] || ''
  const matchedOption = assigneeOptions.find(
    (o) => (usernameFromTask && o.username === usernameFromTask) ||
            (displayNameFromTask && o.displayName === displayNameFromTask)
  )
  return {
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: (task.priority || 'medium') as Task['priority'],
    startDate: normalizeDateForInput(task.startDate),
    endDate: normalizeDateForInput(task.endDate),
    estimatedTime: task.estimatedTime?.toString() || '',
    realTime: task.realTime?.toString() || '',
    assignedTo: matchedOption?.username || usernameFromTask || '',
    sprintId: task.sprintId != null ? String(task.sprintId) : '',
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TaskDetailsDialog({
  task,
  open,
  onOpenChange,
  onUpdateTask,
  assigneeOptions,
  sprintOptions,
}: TaskDetailsDialogProps) {
  // Estado único del formulario inicializado desde la tarea.
  const [form, setForm] = useState(() => buildFormFromTask(task, assigneeOptions))
  const [touched, setTouched] = useState({
    startDate: false,
    endDate: false,
    estimatedTime: false,
  })
  const { title, description, status, priority, startDate, endDate, estimatedTime, realTime, assignedTo, sprintId } = form

  const set = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }))

  // ── Derived state ──────────────────────────────────────────────────────────
  const selectedSprint = sprintOptions.find((s) => String(s.idSprint) === sprintId) ?? null

  const startOutOfRange =
    !!startDate && !!selectedSprint && !isWithinSprintRange(startDate, selectedSprint)

  const endOutOfRange =
    !!endDate && !!selectedSprint && !isWithinSprintRange(endDate, selectedSprint)

  const endBeforeStart = !!startDate && !!endDate && endDate < startDate
  
  const dateError = endBeforeStart
    ? 'End date must be after start date.'
    : startOutOfRange
      ? `Start date must be within sprint range: ${selectedSprint!.startDate} – ${selectedSprint!.endDate}`
      : endOutOfRange
        ? `End date must be within sprint range: ${selectedSprint!.startDate} – ${selectedSprint!.endDate}`
        : ''

  const isInvalid =
    !startDate || !endDate || estimatedTime === '' || !!dateError

  const hasInteracted =
    touched.startDate || touched.endDate || touched.estimatedTime

  const durationDays =
    startDate && endDate && !endBeforeStart ? daysBetween(startDate, endDate) : null

  const durationWarning =
    durationDays !== null && durationDays > 3
      ? `This task spans ${durationDays} days. We recommend tasks of 1–3 days. Consider splitting it into smaller tasks.`
      : ''

  const hoursWarning =
    estimatedTime !== '' && Number(estimatedTime) > 4
      ? 'Estimated time exceeds 4 hours. Consider splitting this task — tasks should ideally take no more than 4 hours.'
      : ''

  const sprintRangeHint =
    selectedSprint?.startDate && selectedSprint?.endDate
      ? `Sprint range: ${selectedSprint.startDate} – ${selectedSprint.endDate}`
      : null

  // Reset dates cuando el usuario cambia el sprint manualmente
  const handleSprintChange = (newSprintId: string) => {
    set({ sprintId: newSprintId, startDate: '', endDate: '' })
  }
  React.useEffect(() => {
    if (!open) return
    setForm(buildFormFromTask(task, assigneeOptions))
    setTouched({
      startDate: false,
      endDate: false,
      estimatedTime: false,
    })
  }, [open, task?.id, assigneeOptions])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  if (!task || !title.trim() || !startDate || !endDate || estimatedTime === '' || dateError) return

    const parsedEst = estimatedTime.trim() === '' ? undefined : Number(estimatedTime)
    const parsedReal = realTime.trim() === '' ? undefined : Number(realTime)

    const estimatedTimeValue = Number.isFinite(parsedEst) ? parsedEst : undefined
    const realTimeValue = Number.isFinite(parsedReal) ? parsedReal : undefined

    const resolvedSprintId = sprintId ? Number(sprintId) : null
    const sprintIdValue =
      resolvedSprintId === null ? null : Number.isFinite(resolvedSprintId) ? resolvedSprintId : null

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
    })

    onOpenChange(false)
  }

  if (!task || !open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-[2px] p-4" data-testid="dialog-task-details">
      <div className="w-full max-w-[680px] max-h-[90vh] overflow-y-auto rounded-xl border border-[#2b3542] bg-[#0d1117] p-6 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#2b3542]">
          <div>
            <h2 className="text-xl font-semibold text-[#e6edf3]">Task Details</h2>
            <p className="text-sm text-[#9aa4b2] mt-1">View and edit the details of this task.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">Close</Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-5">
            {/* Title */}
            <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                data-testid="input-edit-task-title"
                value={title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="Enter task title"
                required
              />
            </div>

            {/* Description */}
            <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                data-testid="input-edit-task-description"
                value={description}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="Enter task description"
                rows={3}
              />
            </div>

            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <select id="edit-status" data-testid="select-edit-task-status" value={status} onChange={(e) => set({ status: e.target.value as Task['status'] })} title="Task status" className="border-input bg-input-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer">
                  <option value="backlog">Backlog</option>
                  <option value="ready">Ready</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <select id="edit-priority" data-testid="select-edit-task-priority" value={priority} onChange={(e) => set({ priority: e.target.value as Task['priority'] })} title="Task priority" className="border-input bg-input-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* ── Sprint — PRIMERO que las fechas ── */}
            <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
              <Label htmlFor="edit-sprint">Sprint</Label>
              <select
                id="edit-sprint"
                data-testid="select-edit-task-sprint"
                value={sprintId}
                onChange={(e) => handleSprintChange(e.target.value)}
                title="Sprint"
                className="border-input bg-input-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer"
              >
                <option value="">Sin sprint</option>
                {sprintOptions.map((sprint) => (
                  <option key={sprint.idSprint} value={String(sprint.idSprint)}>
                    {sprint.title}
                    {sprint.startDate && sprint.endDate ? ` (${sprint.startDate} – ${sprint.endDate})` : ''}
                  </option>
                ))}
              </select>
              {sprintRangeHint && (
                <p className="flex items-center gap-1.5 text-xs text-[#58a6ff] mt-1">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  {sprintRangeHint} — task dates must fall within this range.
                </p>
              )}
            </div>

            {/* ── Start Date ── */}
            <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
              <Label htmlFor="edit-startDate">Start Date</Label>
              <DatePickerInput
                id="edit-startDate"
                testId="input-edit-task-start-date"
                value={startDate}
                onChange={(v) => {
                  set({ startDate: v })
                  setTouched((prev) => ({ ...prev, startDate: true }))
                }}
              />
              {startOutOfRange && (
                <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  Date outside sprint range ({selectedSprint!.startDate} – {selectedSprint!.endDate}).
                </p>
              )}
              {touched.startDate && !startDate && (
                <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  Start date are required.
                </p>
              )}     
            </div>

            {/* ── End Date ── */}
            <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
              <Label htmlFor="edit-endDate">End Date</Label>
              <DatePickerInput
                id="edit-endDate"
                testId="input-edit-task-end-date"
                value={endDate}
                onChange={(v) => {
                  set({ endDate: v })
                  setTouched((prev) => ({ ...prev, endDate: true }))
                }}
              />
              {endBeforeStart && (
                <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  End date must be after start date.
                </p>
              )}
              {!endBeforeStart && endOutOfRange && (
                <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  Date outside sprint range ({selectedSprint!.startDate} – {selectedSprint!.endDate}).
                </p>
              )}
              {touched.endDate && !endDate && (
                <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  End date are required.
                </p>
              )}
              {durationWarning && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 mt-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">{durationWarning}</p>
                </div>
              )}

            </div>

            {/* Time Tracking */}
            <div className="rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
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
                    onChange={(e) => {
                      set({ estimatedTime: e.target.value })
                      setTouched((prev) => ({ ...prev, estimatedTime: true }))
                    }}
                    placeholder="0"
                  />
                  {touched.estimatedTime && estimatedTime === '' && (
                    <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      Estimated time is required.
                    </p>
                  )}                  
                  {hoursWarning && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 mt-1">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-300">{hoursWarning}</p>
                    </div>
                  )}
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
                    onChange={(e) => {
                      set({ realTime: e.target.value })
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Assigned To */}
            <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
              <Label htmlFor="edit-assignedTo">Assigned To</Label>
              <select
                id="edit-assignedTo"
                data-testid="select-edit-task-assigned-to"
                value={assignedTo}
                onChange={(e) => set({ assignedTo: e.target.value })}
                title="Assigned user"
                className="border-input bg-input-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer"
                disabled={assigneeOptions.length === 0}
              >
                {assigneeOptions.length === 0 ? (
                  <option value="">No users available</option>
                ) : (
                  assigneeOptions.map((option) => (
                    <option key={`${option.idProject}-${option.idUser}`} value={option.username}>
                      {option.displayName}{option.role ? ` (${option.role})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-[#2b3542]">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">Cancel</Button>
            <Button
              type="submit"
              disabled={hasInteracted && isInvalid}
              data-testid="btn-save-task"
              className={`cursor-pointer text-white ${
                hasInteracted && isInvalid
                  ? 'opacity-50 cursor-not-allowed bg-gray-600'
                  : 'neon-orange-bg'
              }`}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}