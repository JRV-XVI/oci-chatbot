'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'
import { Badge } from '../ui/badge'
import type { SprintOption } from '@/app/types/sprint'
import type { RealHoursByUser } from '@/app/services/kpiService'

// ── reutilizados del task-filter-bar ──────────────────────────

const sprintTagVariants = [
  'task-tag-sprint-1',
  'task-tag-sprint-2',
  'task-tag-sprint-3',
  'task-tag-sprint-4',
  'task-tag-sprint-5',
  'task-tag-sprint-6',
] as const

const resolveSprintTagClass = (sprintId?: number) => {
  if (sprintId === undefined || !Number.isFinite(sprintId)) return sprintTagVariants[0]
  return sprintTagVariants[Math.abs(sprintId) % sprintTagVariants.length]
}

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Dropdown({ open, children, minWidth = 240 }: { open: boolean; children: ReactNode; minWidth?: number }) {
  if (!open) return null
  const widthClass =
    minWidth === 200 ? 'min-w-[200px]' :
    minWidth === 180 ? 'min-w-[180px]' :
    minWidth === 260 ? 'min-w-[260px]' :
    'min-w-[240px]'
  return (
    <div className={`absolute top-[calc(100%+6px)] left-0 z-50 rounded-xl overflow-hidden bg-card border border-border kanban-dropdown ${widthClass}`}>
      {children}
    </div>
  )
}

function CheckItem({ label, selected, onClick }: { label: ReactNode; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-left transition-colors cursor-pointer ${selected ? 'kanban-check-item-selected' : 'kanban-check-item'}`}
    >
      <span className={`flex-shrink-0 w-[15px] h-[15px] rounded border flex items-center justify-center kanban-checkmark ${selected ? 'kanban-checkmark-selected' : ''}`}>
        {selected && (
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
    </button>
  )
}

function FilterBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-[5px] rounded-md border text-sm transition-colors cursor-pointer ${active ? 'kanban-filter-btn-active' : 'kanban-filter-btn-inactive'}`}
    >
      {icon}
      {label}
      <ChevronIcon />
    </button>
  )
}

// ── props ─────────────────────────────────────────────────────

export interface KpiFilters {
  sprintId: number | undefined
  username: string | undefined
}

interface KpiFilterBarProps {
  sprints: SprintOption[]
  perUserRows: RealHoursByUser[]
  filters: KpiFilters
  onChange: (f: KpiFilters) => void
}

// ── componente ────────────────────────────────────────────────

export function KpiFilterBar({ sprints, perUserRows, filters, onChange }: KpiFilterBarProps) {
  const [open, setOpen] = useState<'sprint' | 'dev' | null>(null)
  const [sprintQ, setSprintQ] = useState('')
  const [devQ, setDevQ] = useState('')
  const barRef = useRef<HTMLDivElement>(null)

  const toggle = (k: 'sprint' | 'dev') => setOpen((prev) => (prev === k ? null : k))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectSprint = useCallback((sprintId: number | undefined) => {
    onChange({ sprintId, username: undefined })
    setOpen(null)
  }, [onChange])

  const selectDev = useCallback((username: string | undefined) => {
    onChange({ ...filters, username })
    setOpen(null)
  }, [filters, onChange])

  const clearAll = () => onChange({ sprintId: undefined, username: undefined })

  const hasActive = filters.sprintId !== undefined || filters.username !== undefined

  const filteredSprints = sprints.filter((s) => s.title.toLowerCase().includes(sprintQ.toLowerCase()))
  const filteredDevs = perUserRows.filter((r) => r.displayName.toLowerCase().includes(devQ.toLowerCase()))

  const activeSprint = sprints.find((s) => s.idSprint === filters.sprintId)
  const activeDev = perUserRows.find((r) => r.username === filters.username)

  const iconSprint = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 7h12M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
  const iconDev = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  )

  return (
    <div className="w-full" ref={barRef}>
      <div className="flex flex-wrap items-center gap-2 py-3">

        {/* ── Filtro Sprint ── */}
        <div className="relative">
          <FilterBtn
            active={filters.sprintId !== undefined}
            onClick={() => toggle('sprint')}
            icon={iconSprint}
            label={activeSprint ? activeSprint.title : 'All Sprints'}
          />
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
                label={<span className="text-sm text-muted-foreground">All Sprints</span>}
                selected={filters.sprintId === undefined}
                onClick={() => selectSprint(undefined)}
              />
              {filteredSprints.map((s) => (
                <CheckItem
                  key={s.idSprint}
                  label={
                    <Badge variant="outline" className={`task-tag ${resolveSprintTagClass(s.idSprint)}`}>
                      {s.title}
                    </Badge>
                  }
                  selected={filters.sprintId === s.idSprint}
                  onClick={() => selectSprint(s.idSprint)}
                />
              ))}
              {filteredSprints.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-3 text-center">No sprints found</p>
              )}
            </div>
          </Dropdown>
        </div>

        {/* ── Filtro Dev ── */}
        <div className="relative">
          <FilterBtn
            active={filters.username !== undefined}
            onClick={() => toggle('dev')}
            icon={iconDev}
            label={activeDev ? activeDev.displayName : 'All Devs'}
          />
          <Dropdown open={open === 'dev'}>
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
              <input
                autoFocus
                type="text"
                placeholder="Filter developers..."
                value={devQ}
                onChange={(e) => setDevQ(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent placeholder:text-muted-foreground text-foreground"
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1.5">
              <CheckItem
                label={<span className="text-sm text-muted-foreground">All Devs</span>}
                selected={filters.username === undefined}
                onClick={() => selectDev(undefined)}
              />
              {filteredDevs.map((r) => (
                <CheckItem
                  key={r.username}
                  label={<span className="text-sm">{r.displayName}</span>}
                  selected={filters.username === r.username}
                  onClick={() => selectDev(r.username)}
                />
              ))}
              {filteredDevs.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-3 text-center">No developers found</p>
              )}
            </div>
          </Dropdown>
        </div>

        {/* ── Chips activos ── */}
        {hasActive && (
          <>
            <div className="w-px h-5 bg-border mx-1" />
            {activeSprint && (
              <span className="flex items-center gap-1 px-2.5 py-[5px] rounded-md border text-sm kanban-filter-chip">
                Sprint: {activeSprint.title}
                <button onClick={() => selectSprint(undefined)} className="flex items-center justify-center w-3.5 h-3.5 rounded-full text-[10px] leading-none cursor-pointer kanban-filter-chip-remove">x</button>
              </span>
            )}
            {activeDev && (
              <span className="flex items-center gap-1 px-2.5 py-[5px] rounded-md border text-sm kanban-filter-chip">
                Dev: {activeDev.displayName}
                <button onClick={() => selectDev(undefined)} className="flex items-center justify-center w-3.5 h-3.5 rounded-full text-[10px] leading-none cursor-pointer kanban-filter-chip-remove">x</button>
              </span>
            )}
            <button
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-accent/60 transition-colors cursor-pointer"
            >
              Clear filters
            </button>
          </>
        )}
      </div>
    </div>
  )
}