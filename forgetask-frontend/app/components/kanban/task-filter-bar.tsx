'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'
import { DatePickerInput } from '../ui/date-picker-input'
import { Badge } from '../ui/badge'

export type TaskTag = 'high' | 'medium' | 'low'
export type TaskState = 'backlog' | 'ready' | 'in-progress' | 'review' | 'done'

export interface TaskFilters {
  query: string
  assigneeIds: number[]
  sprintIds: (number | 'none')[]
  states: TaskState[]
  tags: TaskTag[]
  dueDate: DueDateFilter | null
  hours: HoursFilter | null
}

export type DueDateFilter =
  | { type: 'preset'; value: 'overdue' | 'today' | 'week' | 'nodate' }
  | { type: 'range'; from: string | null; to: string | null }

export interface HoursFilter {
  min: number
  max: number
  budget: 'over' | 'within' | null
}

export interface Member {
  idUser: number
  name: string
}

export interface Sprint {
  idSprint: number
  name: string
}

interface TaskFilterBarProps {
  members: Member[]
  sprints: Sprint[]
  totalTasks: number
  matchingTasks: number
  filters: TaskFilters
  onChange: (filters: TaskFilters) => void
}

export const EMPTY_FILTERS: TaskFilters = {
  query: '',
  assigneeIds: [],
  sprintIds: [],
  states: [],
  tags: [],
  dueDate: null,
  hours: null,
}

const HOURS_MAX = 4
const HOURS_STEP = 0.5

const STATUS_TAG_META: Record<TaskState, { label: string; bg: string; text: string; border: string }> = {
  backlog: {
    label: 'Backlog',
    bg: 'rgba(180, 178, 169, 0.2)',
    text: '#d6d2c9',
    border: 'rgba(180, 178, 169, 0.55)',
  },
  ready: {
    label: 'Ready',
    bg: 'rgba(55, 138, 221, 0.2)',
    text: '#a9d0ff',
    border: 'rgba(55, 138, 221, 0.55)',
  },
  'in-progress': {
    label: 'In progress',
    bg: 'rgba(239, 159, 39, 0.2)',
    text: '#ffd59a',
    border: 'rgba(239, 159, 39, 0.55)',
  },
  review: {
    label: 'Review',
    bg: 'rgba(127, 119, 221, 0.2)',
    text: '#d6ccff',
    border: 'rgba(127, 119, 221, 0.55)',
  },
  done: {
    label: 'Done',
    bg: 'rgba(29, 158, 117, 0.2)',
    text: '#a6f0d1',
    border: 'rgba(29, 158, 117, 0.55)',
  },
}

const TAG_META: Record<TaskTag, { label: string; bg: string; text: string; border: string }> = {
  high: { label: 'High', bg: 'rgba(226, 75, 74, 0.2)', text: '#ffb4b4', border: 'rgba(226, 75, 74, 0.55)' },
  medium: { label: 'Medium', bg: 'rgba(239, 159, 39, 0.2)', text: '#ffd59a', border: 'rgba(239, 159, 39, 0.55)' },
  low: { label: 'Low', bg: 'rgba(29, 158, 117, 0.2)', text: '#a6f0d1', border: 'rgba(29, 158, 117, 0.55)' },
}

const PRESET_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  week: 'Due this week',
  nodate: 'No due date',
}

const PRESET_TAG_META: Record<'overdue' | 'today' | 'week' | 'nodate', { bg: string; text: string; border: string }> = {
  overdue: { bg: 'rgba(226, 75, 74, 0.2)', text: '#ffb4b4', border: 'rgba(226, 75, 74, 0.55)' },
  today: { bg: 'rgba(239, 159, 39, 0.2)', text: '#ffd59a', border: 'rgba(239, 159, 39, 0.55)' },
  week: { bg: 'rgba(29, 158, 117, 0.2)', text: '#a6f0d1', border: 'rgba(29, 158, 117, 0.55)' },
  nodate: { bg: 'rgba(180, 178, 169, 0.2)', text: '#d6d2c9', border: 'rgba(180, 178, 169, 0.55)' },
}

const sprintTagVariants = [
  'task-tag-sprint-1',
  'task-tag-sprint-2',
  'task-tag-sprint-3',
  'task-tag-sprint-4',
  'task-tag-sprint-5',
  'task-tag-sprint-6',
] as const

const resolveSprintTagClass = (sprintId?: number) => {
  if (sprintId === undefined || !Number.isFinite(sprintId)) {
    return sprintTagVariants[0]
  }

  return sprintTagVariants[Math.abs(sprintId) % sprintTagVariants.length]
}

export interface TaskLike {
  idTask: number
  idUser: number
  idSprint: number | null
  endDate: string | null
  estimatedTime: number | null
  realTime: number | null
  title?: string
  description?: string
  status?: TaskState
  priority?: TaskTag
  states?: TaskState[]
  tags?: TaskTag[]
  assigneeIds?: number[]
}

export function applyFilters<T extends TaskLike>(tasks: T[], f: TaskFilters): T[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return tasks.filter((task) => {
    const query = f.query.trim().toLowerCase()
    if (query) {
      const haystack = `${task.title ?? ''} ${task.description ?? ''}`.toLowerCase()
      if (!haystack.includes(query)) return false
    }

    const taskAssigneeIds = task.assigneeIds ?? (Number.isFinite(task.idUser) ? [task.idUser] : [])
    if (f.assigneeIds.length > 0 && !f.assigneeIds.some((id) => taskAssigneeIds.includes(id))) return false

    if (f.sprintIds.length > 0) {
      const match =
        (task.idSprint === null && f.sprintIds.includes('none')) ||
        (task.idSprint !== null && f.sprintIds.includes(task.idSprint))
      if (!match) return false
    }

    if (f.states.length > 0) {
      const taskStates = task.states ?? (task.status ? [task.status] : [])
      if (!f.states.some((s) => taskStates.includes(s))) return false
    }

    if (f.tags.length > 0) {
      const taskTags = task.tags ?? (task.priority ? [task.priority] : [])
      if (!f.tags.some((t) => taskTags.includes(t))) return false
    }

    if (f.dueDate) {
      const end = task.endDate ? new Date(task.endDate) : null
      const d = f.dueDate
      if (d.type === 'preset') {
        if (d.value === 'nodate' && end !== null) return false
        if (d.value !== 'nodate' && end === null) return false
        if (end) {
          const endDay = new Date(end)
          endDay.setHours(0, 0, 0, 0)
          if (d.value === 'overdue' && endDay >= today) return false
          if (d.value === 'today' && endDay.getTime() !== today.getTime()) return false
          if (d.value === 'week') {
            const weekEnd = new Date(today)
            weekEnd.setDate(today.getDate() + 7)
            if (endDay < today || endDay > weekEnd) return false
          }
        }
      } else {
        if (!end) return false
        if (d.from && new Date(end) < new Date(d.from)) return false
        if (d.to && new Date(end) > new Date(d.to)) return false
      }
    }

    if (f.hours) {
      const est = task.estimatedTime ?? 0
      const real = task.realTime ?? 0
      if (est < f.hours.min || est > f.hours.max) return false
      if (f.hours.budget === 'over' && real <= est) return false
      if (f.hours.budget === 'within' && real > est) return false
    }

    return true
  })
}

function hasActive(f: TaskFilters) {
  return (
    f.query.trim().length > 0 ||
    f.assigneeIds.length > 0 ||
    f.sprintIds.length > 0 ||
    f.states.length > 0 ||
    f.tags.length > 0 ||
    f.dueDate !== null ||
    f.hours !== null
  )
}

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path
        d="M2 3.5l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface DropdownProps {
  open: boolean
  children: ReactNode
  minWidth?: number
}

function Dropdown({ open, children, minWidth = 240 }: DropdownProps) {
  if (!open) return null
  return (
    <div
      className="absolute top-[calc(100%+6px)] left-0 z-50 rounded-xl overflow-hidden bg-card border border-border shadow-[0_12px_24px_rgba(0,0,0,0.45)]"
      style={{ minWidth }}
    >
      {children}
    </div>
  )
}

interface CheckItemProps {
  label: ReactNode
  selected: boolean
  onClick: () => void
}

function CheckItem({ label, selected, onClick }: CheckItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-left transition-colors cursor-pointer ${
        selected
          ? 'bg-[#e76b36]/15 text-[#ffd5c2]'
          : 'text-foreground hover:bg-accent/70'
      }`}
    >
      <span
        className={`flex-shrink-0 w-[15px] h-[15px] rounded border flex items-center justify-center ${
          selected ? 'bg-[#e76b36] border-[#e76b36]' : 'border-border'
        }`}
      >
        {selected && (
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path
              d="M1.5 4.5l2 2 4-4"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      {label}
    </button>
  )
}

interface FilterBtnProps {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}

function FilterBtn({ active, onClick, icon, label }: FilterBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-[5px] rounded-md border text-sm transition-colors cursor-pointer ${
        active
          ? 'border-[#e76b36]/60 bg-[#e76b36]/15 text-[#ffd5c2]'
          : 'border-border bg-card text-muted-foreground hover:bg-accent/70 hover:text-foreground'
      }`}
    >
      {icon}
      {label}
      <ChevronIcon />
    </button>
  )
}

interface HoursDropdownProps {
  value: HoursFilter | null
  onChange: (h: HoursFilter | null) => void
  onClose: () => void
}

function HoursDropdown({ value, onChange, onClose }: HoursDropdownProps) {
  const [min, setMin] = useState(value?.min ?? 0)
  const [max, setMax] = useState(value?.max ?? HOURS_MAX)
  const [budget, setBudget] = useState<'over' | 'within' | null>(value?.budget ?? null)

  const pctLeft = (min / HOURS_MAX) * 100
  const pctWidth = ((max - min) / HOURS_MAX) * 100
  const fmt = (v: number) => `${v}h`

  const clampMin = (e: React.ChangeEvent<HTMLInputElement>) =>
    setMin(Math.min(Number.parseFloat(e.target.value), max))
  const clampMax = (e: React.ChangeEvent<HTMLInputElement>) =>
    setMax(Math.max(Number.parseFloat(e.target.value), min))

  const apply = () => {
    const rangeActive = !(min === 0 && max === HOURS_MAX)
    onChange(rangeActive || budget ? { min, max, budget } : null)
    onClose()
  }

  return (
    <>
      <div className="px-3.5 py-3">
        <div className="flex justify-between items-baseline mb-2.5">
          <span className="text-xs text-muted-foreground">Estimated time</span>
          <span className="text-sm font-medium text-foreground">
            {fmt(min)} - {fmt(max)}
          </span>
        </div>

        <div className="relative h-1 bg-[#1a222d] rounded-full">
          <div
            className="absolute h-full bg-[#e76b36] rounded-full pointer-events-none"
            style={{ left: `${pctLeft}%`, width: `${pctWidth}%` }}
          />
        </div>

        <div className="relative" style={{ marginTop: -6 }}>
          <input
            type="range"
            min={0}
            max={HOURS_MAX}
            step={HOURS_STEP}
            value={min}
            onChange={clampMin}
            style={{ position: 'absolute', width: '100%', zIndex: min > HOURS_MAX - 1 ? 5 : 3 }}
            className="appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0d1117] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#e76b36] [&::-webkit-slider-thumb]:shadow"
          />
          <input
            type="range"
            min={0}
            max={HOURS_MAX}
            step={HOURS_STEP}
            value={max}
            onChange={clampMax}
            style={{ position: 'absolute', width: '100%', zIndex: 4 }}
            className="appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0d1117] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#e76b36] [&::-webkit-slider-thumb]:shadow"
          />
          <div style={{ height: 18 }} />
        </div>

        <div className="flex justify-between mt-2.5">
          {[0, 1, 2, 3, 4].map((v) => (
            <span key={v} className="text-[11px] text-muted-foreground">
              {v}h
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-border/60 p-1.5">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-2 py-1">
          vs real time
        </p>
        <CheckItem
          label={
            <span className="flex items-center gap-2">Over budget</span>
          }
          selected={budget === 'over'}
          onClick={() => setBudget((b) => (b === 'over' ? null : 'over'))}
        />
        <CheckItem
          label={
            <span className="flex items-center gap-2">Within budget</span>
          }
          selected={budget === 'within'}
          onClick={() => setBudget((b) => (b === 'within' ? null : 'within'))}
        />
      </div>

      <div className="border-t border-border/60 p-2.5">
        <button
          onClick={apply}
          className="w-full py-1.5 text-sm rounded-md border border-border bg-card hover:bg-accent/60 transition-colors text-foreground cursor-pointer"
        >
          Apply
        </button>
      </div>
    </>
  )
}

type DDKey = 'assignee' | 'sprint' | 'status' | 'tag' | 'due' | 'hours' | null

export function TaskFilterBar({
  members,
  sprints,
  totalTasks,
  matchingTasks,
  filters,
  onChange,
}: TaskFilterBarProps) {
  const [open, setOpen] = useState<DDKey>(null)
  const [assigneeQ, setAssigneeQ] = useState('')
  const [sprintQ, setSprintQ] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const barRef = useRef<HTMLDivElement>(null)

  const toggle = (k: DDKey) => setOpen((prev) => (prev === k ? null : k))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggleInArray<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
  }

  const toggleAssignee = useCallback(
    (id: number) => onChange({ ...filters, assigneeIds: toggleInArray(filters.assigneeIds, id) }),
    [filters, onChange]
  )
  const toggleSprint = useCallback(
    (id: number | 'none') => onChange({ ...filters, sprintIds: toggleInArray(filters.sprintIds, id) }),
    [filters, onChange]
  )
  const toggleState = useCallback(
    (s: TaskState) => onChange({ ...filters, states: toggleInArray(filters.states, s) }),
    [filters, onChange]
  )
  const toggleTag = useCallback(
    (t: TaskTag) => onChange({ ...filters, tags: toggleInArray(filters.tags, t) }),
    [filters, onChange]
  )

  interface Chip {
    label: string
    onRemove: () => void
  }

  const chips: Chip[] = []

  filters.assigneeIds.forEach((id) => {
    const m = members.find((x) => x.idUser === id)
    if (m) chips.push({ label: `Assignee: ${m.name}`, onRemove: () => toggleAssignee(id) })
  })
  filters.sprintIds.forEach((id) => {
    const label = id === 'none' ? 'No sprint' : sprints.find((s) => s.idSprint === id)?.name ?? `Sprint ${id}`
    chips.push({ label: `Sprint: ${label}`, onRemove: () => toggleSprint(id) })
  })
  filters.states.forEach((s) =>
    chips.push({ label: `Status: ${STATUS_TAG_META[s].label}`, onRemove: () => toggleState(s) })
  )
  filters.tags.forEach((t) =>
    chips.push({ label: `Priority: ${TAG_META[t].label}`, onRemove: () => toggleTag(t) })
  )
  if (filters.dueDate) {
    const d = filters.dueDate
    const label = d.type === 'preset' ? PRESET_LABELS[d.value] : `${d.from ?? '...'} to ${d.to ?? '...'}`
    chips.push({ label: `Due: ${label}`, onRemove: () => onChange({ ...filters, dueDate: null }) })
  }
  if (filters.hours) {
    const parts: string[] = []
    if (!(filters.hours.min === 0 && filters.hours.max === HOURS_MAX))
      parts.push(`${filters.hours.min}h - ${filters.hours.max}h`)
    if (filters.hours.budget)
      parts.push(filters.hours.budget === 'over' ? 'Over budget' : 'Within budget')
    chips.push({ label: `Hours: ${parts.join(', ')}`, onRemove: () => onChange({ ...filters, hours: null }) })
  }

  const active = hasActive(filters)
  const filteredMembers = members.filter((m) => m.name.toLowerCase().includes(assigneeQ.toLowerCase()))
  const filteredSprints = sprints.filter((s) => s.name.toLowerCase().includes(sprintQ.toLowerCase()))

  const iconAssignee = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
  const iconSprint = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 7h12M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
  const iconStatus = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M5 8l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
  const iconTag = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 2h6l6 6-6 6-6-6V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="5.5" cy="5.5" r="1" fill="currentColor" />
    </svg>
  )
  const iconDue = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
  const iconHours = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v6l3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )

  return (
    <div className="w-full" ref={barRef}>
      <div className="flex flex-wrap items-center gap-2 py-3">
        <input
          id="filter-bar-component-input"
          role="combobox"
          aria-expanded="false"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls="filter-bar-component-results"
          placeholder="Filter by keyword or by field"
          autoComplete="off"
          spellCheck={false}
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          className="min-w-[220px] h-9 rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground px-3 text-sm shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2)] transition-[color,box-shadow,border-color] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />

        <div className="relative">
          <FilterBtn
            active={filters.assigneeIds.length > 0}
            onClick={() => toggle('assignee')}
            icon={iconAssignee}
            label="Assignee"
          />
          <Dropdown open={open === 'assignee'}>
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
              <input
                autoFocus
                type="text"
                placeholder="Filter members..."
                value={assigneeQ}
                onChange={(e) => setAssigneeQ(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent placeholder:text-muted-foreground text-foreground"
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1.5">
              {filteredMembers.map((m, i) => (
                <CheckItem
                  key={m.idUser}
                  label={<span className="text-sm">{m.name}</span>}
                  selected={filters.assigneeIds.includes(m.idUser)}
                  onClick={() => toggleAssignee(m.idUser)}
                />
              ))}
              {filteredMembers.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-3 text-center">No members found</p>
              )}
            </div>
          </Dropdown>
        </div>

        <div className="relative">
          <FilterBtn active={filters.sprintIds.length > 0} onClick={() => toggle('sprint')} icon={iconSprint} label="Sprint" />
          <Dropdown open={open === 'sprint'}>
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
              <input
                autoFocus
                type="text"
                placeholder="Filter sprints..."
                value={sprintQ}
                onChange={(e) => setSprintQ(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent placeholder:text-muted-foreground text-foreground"
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1.5">
              <CheckItem
                label={
                  <Badge variant="outline" className={`task-tag ${sprintTagVariants[0]}`}>
                    No sprint (Backlog)
                  </Badge>
                }
                selected={filters.sprintIds.includes('none')}
                onClick={() => toggleSprint('none')}
              />
              {filteredSprints.map((s) => (
                <CheckItem
                  key={s.idSprint}
                  label={
                    <Badge variant="outline" className={`task-tag ${resolveSprintTagClass(s.idSprint)}`}>
                      {s.name}
                    </Badge>
                  }
                  selected={filters.sprintIds.includes(s.idSprint)}
                  onClick={() => toggleSprint(s.idSprint)}
                />
              ))}
              {filteredSprints.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-3 text-center">No sprints found</p>
              )}
            </div>
          </Dropdown>
        </div>

        <div className="relative">
          <FilterBtn active={filters.states.length > 0} onClick={() => toggle('status')} icon={iconStatus} label="Status" />
          <Dropdown open={open === 'status'} minWidth={200}>
            <div className="p-1.5">
              {(Object.entries(STATUS_TAG_META) as [TaskState, (typeof STATUS_TAG_META)[TaskState]][]).map(([val, meta]) => (
                <CheckItem
                  key={val}
                  label={
                    <Badge
                      variant="outline"
                      className="task-tag"
                      style={{ background: meta.bg, color: meta.text, borderColor: meta.border }}
                    >
                      {meta.label}
                    </Badge>
                  }
                  selected={filters.states.includes(val)}
                  onClick={() => toggleState(val)}
                />
              ))}
            </div>
          </Dropdown>
        </div>

        <div className="relative">
          <FilterBtn active={filters.tags.length > 0} onClick={() => toggle('tag')} icon={iconTag} label="Priority" />
          <Dropdown open={open === 'tag'} minWidth={180}>
            <div className="p-1.5">
              {(Object.entries(TAG_META) as [TaskTag, (typeof TAG_META)[TaskTag]][]).map(([val, meta]) => (
                <CheckItem
                    key={val}
                    label={
                    <Badge
                        variant="outline"
                        className="task-tag"
                        style={{
                        background: meta.bg,
                        color: meta.text,
                        borderColor: meta.text + '55',
                        }}
                    >
                        {meta.label}
                    </Badge>
                    }
                  selected={filters.tags.includes(val)}
                  onClick={() => toggleTag(val)}
                />
              ))}
            </div>
          </Dropdown>
        </div>

        <div className="relative">
          <FilterBtn active={filters.dueDate !== null} onClick={() => toggle('due')} icon={iconDue} label="Due date" />
          <Dropdown open={open === 'due'} minWidth={260}>
            <div className="p-1.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-2 py-1">Presets</p>
              {([
                { value: 'overdue' as const },
                { value: 'today' as const },
                { value: 'week' as const },
                { value: 'nodate' as const },
              ]).map(({ value }) => (
                <CheckItem
                  key={value}
                  label={
                    <Badge
                      variant="outline"
                      className="task-tag"
                      style={{
                        background: PRESET_TAG_META[value].bg,
                        color: PRESET_TAG_META[value].text,
                        borderColor: PRESET_TAG_META[value].border,
                      }}
                    >
                      {PRESET_LABELS[value]}
                    </Badge>
                  }
                  selected={filters.dueDate?.type === 'preset' && filters.dueDate.value === value}
                  onClick={() => {
                    onChange({ ...filters, dueDate: { type: 'preset', value } })
                    setOpen(null)
                  }}
                />
              ))}
            </div>
            <div className="border-t border-border/60 p-3 flex flex-col gap-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Custom range</p>
              <label className="flex flex-col gap-2 text-sm text-muted-foreground">
                <span>From</span>
                <DatePickerInput
                  id="filter-date-from"
                  value={dateFrom}
                  onChange={setDateFrom}
                  className="w-full"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-muted-foreground">
                <span>To</span>
                <DatePickerInput
                  id="filter-date-to"
                  value={dateTo}
                  onChange={setDateTo}
                  className="w-full"
                />
              </label>
              <button
                onClick={() => {
                  if (dateFrom || dateTo) {
                    onChange({ ...filters, dueDate: { type: 'range', from: dateFrom || null, to: dateTo || null } })
                    setOpen(null)
                  }
                }}
                className="w-full py-1.5 text-sm rounded-md border border-border bg-card hover:bg-accent/60 transition-colors text-foreground cursor-pointer"
              >
                Apply range
              </button>
            </div>
          </Dropdown>
        </div>

        <div className="relative">
          <FilterBtn active={filters.hours !== null} onClick={() => toggle('hours')} icon={iconHours} label="Hours" />
          <Dropdown open={open === 'hours'} minWidth={260}>
            <HoursDropdown value={filters.hours} onChange={(h) => onChange({ ...filters, hours: h })} onClose={() => setOpen(null)} />
          </Dropdown>
        </div>

        {active && (
          <>
            <div className="w-px h-5 bg-border mx-1" />
            {chips.map((chip, i) => (
              <span
                key={i}
                className="flex items-center gap-1 px-2.5 py-[5px] rounded-md border border-[#e76b36]/50 bg-[#e76b36]/10 text-[#ffd5c2] text-sm"
              >
                {chip.label}
                <button
                  onClick={chip.onRemove}
                  className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#e76b36]/20 hover:bg-[#e76b36]/40 text-[#ffd5c2] text-[10px] leading-none cursor-pointer"
                >
                  x
                </button>
              </span>
            ))}
            <button
              onClick={() => onChange(EMPTY_FILTERS)}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-accent/60 transition-colors cursor-pointer"
            >
              Clear filters
            </button>
          </>
        )}
      </div>

      {active && <p className="text-xs text-muted-foreground pb-1">Showing {matchingTasks} of {totalTasks} tasks</p>}
    </div>
  )
}

export default TaskFilterBar
