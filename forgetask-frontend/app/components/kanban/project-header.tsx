'use client'

import * as React from 'react'
import Image from 'next/image'
import {
  BarChart3,
  Sparkles,
  Users,
  LucideIcon,
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
 * Configuration for header sections
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
}

/**
 * Default configuration for sections
 */
const DEFAULT_SECTIONS_CONFIG: ProjectHeaderSectionsConfig = {
  logo: {
    show: true,
    src: '/CloudForge.svg',
    alt: 'CloudForge',
    width: 86,
    height: 86,
  },
  title: {
    show: true,
  },
  subtitle: {
    show: true,
    text: 'Coordinate tasks, sprints, and delivery flow',
  },
  progress: {
    show: true,
  },
}

/**
 * Reusable ProjectHeader component with full customization support
 *
 * @example
 * // Minimal usage - show all default buttons
 * <ProjectHeader
 *   projectTitle="My Project"
 *   completedHours={10}
 *   totalHours={40}
 *   progressPercentage={25}
 *   buttonsConfig={{
 *     kpis: { show: true, onClick: () => {} },
 *     members: { show: true, onClick: () => {} },
 *     generateReport: { show: true, onClick: () => {} },
 *     addSprint: { show: true, projectId: 1, sprintOptions: [], onSprintSaved: () => {}, onSprintDeleted: () => {} },
 *     addTask: { show: true, onAddTask: () => {}, assigneeOptions: [], sprintOptions: [] },
 *   }}
 * />
 *
 * @example
 * // Custom usage - selective buttons
 * <ProjectHeader
 *   projectTitle="My Project"
 *   buttonsConfig={{
 *     kpis: { show: false },
 *     members: { show: true, onClick: () => {} },
 *     addTask: { show: true, onAddTask: () => {}, assigneeOptions: [], sprintOptions: [] },
 *     custom: [
 *       {
 *         label: 'Settings',
 *         icon: Settings,
 *         onClick: () => console.log('Settings'),
 *       }
 *     ]
 *   }}
 *   sectionsConfig={{
 *     progress: { show: false },
 *     subtitle: { show: true, text: 'Custom subtitle' }
 *   }}
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
}: ProjectHeaderProps) {
  // Merge with default config
  const finalSectionsConfig = { ...DEFAULT_SECTIONS_CONFIG, ...sectionsConfig }

  return (
    <header
      className={`border-b border-[#2b3542] bg-[#0d1117] px-6 py-4 shadow-[0_0_14px_rgba(0,0,0,0.35)] ${className}`}
    >
      <div className="flex items-center justify-between gap-6 flex-wrap">
        {/* Left Section: Logo + Title */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Logo */}
            {finalSectionsConfig.logo?.show && (
              <div className="flex items-center justify-center rounded-xl border border-[#2b3542] bg-[#11161f] p-3 shadow-[0_0_18px_rgba(0,0,0,0.28)]">
                <Image
                  src={finalSectionsConfig.logo.src || '/CloudForge.svg'}
                  alt={finalSectionsConfig.logo.alt || 'CloudForge'}
                  width={finalSectionsConfig.logo.width || 86}
                  height={finalSectionsConfig.logo.height || 86}
                  priority
                />
              </div>
            )}

            {/* Title & Subtitle */}
            <div>
              {finalSectionsConfig.title?.show && (
                <h1 className="text-2xl font-bold text-[#e6edf3]">{projectTitle}</h1>
              )}
              {finalSectionsConfig.subtitle?.show && (
                <p className="text-sm text-[#9aa4b2] mt-1">
                  {finalSectionsConfig.subtitle.text}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Middle Section: Progress */}
        {finalSectionsConfig.progress?.show && (
          <div className="flex-1 max-w-md min-w-[240px]">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[#9aa4b2]">Progress</span>
              <span className="font-semibold text-[#e6edf3]">
                {completedHours}h / {totalHours}h ({progressPercentage}%)
              </span>
            </div>
            <Progress value={progressPercentage} className="h-1.5" />
          </div>
        )}

        {/* Right Section: Action Buttons */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* KPIs Button */}
          {buttonsConfig.kpis?.show && (
            <Button
              onClick={buttonsConfig.kpis.onClick}
              variant="outline"
              data-testid="btn-kpis"
              className="cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              KPIs
            </Button>
          )}

          {/* Members Button */}
          {buttonsConfig.members?.show && (
            <Button
              onClick={buttonsConfig.members.onClick}
              variant="outline"
              className="cursor-pointer"
            >
              <Users className="w-4 h-4 mr-2" />
              Members
            </Button>
          )}

          {/* Generate Report Button */}
          {buttonsConfig.generateReport?.show && (
            <Button
              onClick={buttonsConfig.generateReport.onClick}
              variant="outline"
              className="cursor-pointer"
            >
              <Sparkles className="w-4 h-4 mr-2 text-[#f59e0b] drop-shadow-[0_0_7px_rgba(245,158,11,0.85)]" />
              Generate Report AI
            </Button>
          )}

          {/* Add Sprint Dialog */}
          {buttonsConfig.addSprint?.show && (
            <AddSprintDialog
              projectId={buttonsConfig.addSprint.projectId}
              sprintOptions={buttonsConfig.addSprint.sprintOptions}
              onSprintSaved={buttonsConfig.addSprint.onSprintSaved}
              onSprintDeleted={buttonsConfig.addSprint.onSprintDeleted}
            />
          )}

          {/* Add Task Dialog */}
          {buttonsConfig.addTask?.show && (
            <AddTaskDialog
              onAddTask={buttonsConfig.addTask.onAddTask}
              assigneeOptions={buttonsConfig.addTask.assigneeOptions}
              sprintOptions={buttonsConfig.addTask.sprintOptions}
            />
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
                className="cursor-pointer"
              >
                {CustomIcon && <CustomIcon className="w-4 h-4 mr-2" />}
                {customButton.label}
              </Button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
