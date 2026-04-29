'use client'

import * as React from 'react'
import Image from 'next/image'
import {
  BarChart3,
  Sparkles,
  Users,
  LucideIcon,
  Menu,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import type { SprintOption } from '@/app/types/sprint'
import type { TaskAssigneeOption } from '@/app/types/task'
import { AddSprintDialog } from './add-sprint-dialog'
import { AddTaskDialog } from './add-task-dialog'

/**
 * Configuration object for customizing which buttons appear in the header
 */
export interface ProjectHeaderButtonsConfig {
  kpis?: {
    show: boolean
    onClick: () => void
  }
  members?: {
    show: boolean
    onClick: () => void
  }
  generateReport?: {
    show: boolean
    onClick: () => void
  }
  addSprint?: {
    show: boolean
    projectId: number | null
    sprintOptions: SprintOption[]
    onSprintSaved: (sprint: SprintOption) => void
    onSprintDeleted: (sprintId: number) => void
  }
  addTask?: {
    show: boolean
    onAddTask: (task: any) => void
    assigneeOptions: TaskAssigneeOption[]
    sprintOptions: SprintOption[]
  }
  // Custom buttons - array of buttons to display after standard buttons
  custom?: Array<{
    label: string
    icon?: LucideIcon
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost'
    testId?: string
  }>
}

/**
 * Configuration for header sections (deprecated - kept for backward compatibility)
 */
export interface ProjectHeaderSectionsConfig {
  logo?: {
    show: boolean
    src?: string
    alt?: string
    width?: number
    height?: number
  }
  title?: {
    show: boolean
  }
  subtitle?: {
    show: boolean
    text?: string
  }
  progress?: {
    show: boolean
  }
}

/**
 * Props for the ProjectHeader component
 */
export interface ProjectHeaderProps {
  projectTitle: string
  completedHours?: number
  totalHours?: number
  progressPercentage?: number
  buttonsConfig: ProjectHeaderButtonsConfig
  sectionsConfig?: ProjectHeaderSectionsConfig
  className?: string
  showSidebarToggle?: boolean
  onSidebarToggle?: () => void
  showProgress?: boolean
}

/**
 * Compact ProjectHeader component without logo
 * Used with the new AppLayout with sidebar
 * 
 * The sidebar toggle button is always visible and allows collapsing/expanding the sidebar.
 * Progress bar can be optionally displayed (for Kanban only).
 *
 * @example
 * <ProjectHeader
 *   projectTitle="My Project"
 *   buttonsConfig={{
 *     kpis: { show: true, onClick: () => {} },
 *     generateReport: { show: true, onClick: () => {} },
 *     addSprint: { show: true, projectId: 1, sprintOptions: [], onSprintSaved: () => {}, onSprintDeleted: () => {} },
 *     addTask: { show: true, onAddTask: () => {}, assigneeOptions: [], sprintOptions: [] },
 *   }}
 *   showSidebarToggle={true}
 *   onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
 *   showProgress={true}
 *   completedHours={10}
 *   totalHours={40}
 *   progressPercentage={25}
 * />
 */
export function ProjectHeader({
  projectTitle,
  completedHours = 0,
  totalHours = 0,
  progressPercentage = 0,
  buttonsConfig,
  sectionsConfig,
  className = '',
  showSidebarToggle = false,
  onSidebarToggle,
  showProgress = false,
}: ProjectHeaderProps) {
  // Merge with default config (for backward compatibility)
  const defaultConfig: ProjectHeaderSectionsConfig = {
    logo: { show: false },
    title: { show: false },
    subtitle: { show: false },
    progress: { show: false },
  }
  const finalSectionsConfig = { ...defaultConfig, ...sectionsConfig }

  return (
    <header
      className={`border-b border-[#2b3542] bg-[#0d1117] px-4 py-2 shadow-[0_0_14px_rgba(0,0,0,0.35)] overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-3 h-fit">

        {/* Middle Section: Progress Bar */}
        {showProgress && (
          <div className="flex-1 min-w-0 flex items-center gap-2 py-0.5 px-3">
            <div className="flex items-center gap-1.5 min-w-fit">
              <span className="text-xs text-[#9aa4b2]">Progress:</span>
              <span className="text-xs font-semibold text-[#e6edf3] whitespace-nowrap">
                {completedHours}h / {totalHours}h ({progressPercentage}%)
              </span>
            </div>
            <Progress value={progressPercentage} className="h-1 flex-1 max-w-[150px]" />
          </div>
        )}

        {/* Right Section: Action Buttons (scrollable) */}
        <div className="flex min-w-0 overflow-x-auto flex items-center gap-2">
          {/* KPIs Button */}
          {buttonsConfig.kpis?.show && (
            <Button
              onClick={buttonsConfig.kpis.onClick}
              variant="outline"
              data-testid="btn-kpis"
              className="cursor-pointer whitespace-nowrap flex-shrink-0"
              size="sm"
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              KPIs
            </Button>
          )}

          {/* Generate Report Button */}
          {buttonsConfig.generateReport?.show && (
            <Button
              onClick={buttonsConfig.generateReport.onClick}
              variant="outline"
              className="cursor-pointer whitespace-nowrap flex-shrink-0"
              size="sm"
            >
              <Sparkles className="w-4 h-4 mr-1 text-[#f59e0b] drop-shadow-[0_0_7px_rgba(245,158,11,0.85)]" />
              Generate Report AI
            </Button>
          )}

          {/* Add Sprint Dialog */}
          {buttonsConfig.addSprint?.show && (
            <div className="flex-shrink-0">
              <AddSprintDialog
                projectId={buttonsConfig.addSprint.projectId}
                sprintOptions={buttonsConfig.addSprint.sprintOptions}
                onSprintSaved={buttonsConfig.addSprint.onSprintSaved}
                onSprintDeleted={buttonsConfig.addSprint.onSprintDeleted}
              />
            </div>
          )}

          {/* Add Task Dialog */}
          {buttonsConfig.addTask?.show && (
            <div className="flex-shrink-0">
              <AddTaskDialog
                onAddTask={buttonsConfig.addTask.onAddTask}
                assigneeOptions={buttonsConfig.addTask.assigneeOptions}
                sprintOptions={buttonsConfig.addTask.sprintOptions}
              />
            </div>
          )}

          {/* Custom Buttons */}
          {buttonsConfig.custom?.map((customButton, index) => {
            const CustomIcon = customButton.icon
            return (
              <Button
                key={index}
                onClick={customButton.onClick}
                variant={customButton.variant || 'outline'}
                data-testid={customButton.testId}
                className="cursor-pointer whitespace-nowrap flex-shrink-0"
                size="sm"
              >
                {CustomIcon && <CustomIcon className="w-4 h-4 mr-1" />}
                {customButton.label}
              </Button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
