'use client'

import type * as React from 'react'
import { useState, useEffect } from 'react'
import { Plus, AlertTriangle, Info } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { DatePickerInput } from '../ui/date-picker-input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import type { Task } from './task-card'
import type { TaskAssigneeOption } from '@/app/types/task'
import type { SprintOption } from '@/app/types/sprint'

interface AddTaskDialogProps {
  onAddTask: (task: Omit<Task, 'id'>) => void
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

// ─── Component ──────────────────────────────────────────────────────────────

export function AddTaskDialog({ onAddTask, assigneeOptions, sprintOptions }: AddTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Task['status']>('backlog')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [estimatedTime, setEstimatedTime] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [sprintId, setSprintId] = useState('')

  const [touched, setTouched] = useState({
    startDate: false,
    endDate: false,
    estimatedTime: false,
  })

  // ── Derived state ──────────────────────────────────────────────────────────
  const selectedSprint = sprintOptions.find((s) => String(s.idSprint) === sprintId) ?? null

  // Date validation against sprint range
  const startOutOfRange =
    !!startDate && !!selectedSprint &&
    !isWithinSprintRange(startDate, selectedSprint)

  const endOutOfRange =
    !!endDate && !!selectedSprint &&
    !isWithinSprintRange(endDate, selectedSprint)

  const endBeforeStart = !!startDate && !!endDate && endDate < startDate

  const dateError = endBeforeStart
    ? 'End date must be after start date.'
    : startOutOfRange
      ? `Start date must be within sprint range: ${selectedSprint!.startDate} – ${selectedSprint!.endDate}`
      : endOutOfRange
        ? `End date must be within sprint range: ${selectedSprint!.startDate} – ${selectedSprint!.endDate}`
        : ''

  // Soft warnings (non-blocking)
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



  // ── Handlers ───────────────────────────────────────────────────────────────

  const openDialog = () => {
    setTitle('')
    setDescription('')
    setStatus('backlog')
    setPriority('medium')
    setStartDate('')
    setEndDate('')
    setEstimatedTime('')
    setAssignedTo('')
    setSprintId('')
    setOpen(true)
    setTouched({
      startDate: false,
      endDate: false,
      estimatedTime: false,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !assignedTo || !startDate || !endDate || estimatedTime === '' || dateError) return

    const parsedEst = estimatedTime.trim() === '' ? undefined : Number(estimatedTime)
    const estimatedTimeValue = Number.isFinite(parsedEst) ? parsedEst : undefined

    const resolvedSprintId = sprintId ? Number(sprintId) : null
    const sprintIdValue =
      resolvedSprintId === null ? null : Number.isFinite(resolvedSprintId) ? resolvedSprintId : null

    onAddTask({
      sprintId: sprintIdValue,
      title,
      description: description || undefined,
      status,
      priority,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      estimatedTime: estimatedTimeValue,
      realTime: 0,
      assignedTo: [assignedTo],
    })

    setOpen(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const sprintRangeHint =
    selectedSprint?.startDate && selectedSprint?.endDate
      ? `Sprint range: ${selectedSprint.startDate} – ${selectedSprint.endDate}`
      : null

  return (
    <>
      <Button className="gap-2 cursor-pointer" onClick={openDialog} data-testid="btn-new-task">
        <Plus className="w-4 h-4" />
        New Task
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-[2px] p-4" data-testid="dialog-add-task">
          <div className="w-full max-w-[680px] max-h-[90vh] overflow-y-auto rounded-xl border border-[#2b3542] bg-[#0d1117] p-6 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#2b3542]">
                <div>
                  <h2 className="text-xl font-semibold text-[#e6edf3]">Create New Task</h2>
                  <p className="text-sm text-[#9aa4b2] mt-1">Add a new task to your project board.</p>
                </div>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">Close</Button>
              </div>

              <div className="grid gap-4 py-5">
                {/* Title */}
                <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    data-testid="input-task-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter task title"
                    required
                  />
                </div>

                {/* Description */}
                <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    data-testid="input-task-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter task description"
                    rows={3}
                  />
                </div>

                {/* Status + Priority */}
                <div className="grid grid-cols-2 gap-4 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <select id="status" data-testid="select-task-status" value={status} onChange={(e) => setStatus(e.target.value as Task['status'])} title="Task status" className="border-input bg-input-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer">
                      <option value="backlog">Backlog</option>
                      <option value="ready">Ready</option>
                      <option value="in-progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <select id="priority" data-testid="select-task-priority" value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])} title="Task priority" className="border-input bg-input-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                {/* ── Sprint — PRIMERO que las fechas ── */}
                <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
                  <Label htmlFor="sprintId">Sprint</Label>
                  <select
                    id="sprintId"
                    data-testid="select-task-sprint"
                    value={sprintId}
                    onChange={(e) => {
                      setSprintId(e.target.value)
                      setStartDate('')
                      setEndDate('')
                    }}
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
                  <Label htmlFor="startDate">Start Date</Label>
                  <DatePickerInput
                    id="startDate"
                    testId="input-task-start-date"
                    value={startDate}
                    onChange={(value) => {
                      setStartDate(value)
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
                  <Label htmlFor="endDate">End Date</Label>
                  <DatePickerInput
                    id="endDate"
                    testId="input-task-end-date"
                    value={endDate}
                    onChange={(value) => {
                      setEndDate(value)
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
                  {/* Soft warning: duration > 3 days */}
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
                      <Label htmlFor="estimatedTime">Estimated Time</Label>
                      <Input
                        id="estimatedTime"
                        data-testid="input-task-estimated-time"
                        type="number"
                        step="0.5"
                        min="0"
                        value={estimatedTime}
                        onChange={(e) => setEstimatedTime(e.target.value)}
                        placeholder="0"
                      />
                      {touched.estimatedTime && estimatedTime === '' && (
                        <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          Estimated time is required.
                        </p>
                      )}
                      {/* Soft warning: estimated > 4h */}
                      {hoursWarning && (
                        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 mt-1">
                          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-300">{hoursWarning}</p>
                        </div>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="realTime">Real Time</Label>
                      <Input id="realTime" type="number" step="0.5" min="0" value="0" readOnly disabled placeholder="0" />
                    </div>
                  </div>
                </div>

                {/* Assigned To */}
                <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
                  <Label htmlFor="assignedTo">Assigned To *</Label>
                  <select
                    id="assignedTo"
                    data-testid="select-task-assigned-to"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    title="Assigned user"
                    className="border-input bg-input-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer"
                    disabled={assigneeOptions.length === 0}
                    required
                  >
                    <option value="" disabled>Select user</option>
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
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">Cancel</Button>
                <Button
                  type="submit"
                  disabled={!startDate || !endDate || estimatedTime === '' || !!dateError}
                  data-testid="btn-save-task"
                  className={`cursor-pointer text-white ${
                    !startDate || !endDate || estimatedTime === '' || dateError
                      ? 'opacity-50 cursor-not-allowed bg-gray-600'
                      : 'neon-orange-bg'
                  }`}
                >
                  Create Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}