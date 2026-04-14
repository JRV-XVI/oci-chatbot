"use client"

import { ProgressCircle } from "./ProgressCircle"

interface User {
  id: string
  name: string
  completedTasks: number
  totalTasks: number
}

interface UserTaskItemCardProps {
  user: User
  percentage: number
  circleColor: string
}

export function UserTaskItemCard({
  user,
  percentage,
  circleColor,
}: UserTaskItemCardProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <ProgressCircle value={percentage} radius={70} color={circleColor}>
        <span className="text-xl font-semibold text-gray-900 dark:text-gray-200">
          {percentage}%
        </span>
      </ProgressCircle>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
          {user.completedTasks}/{user.totalTasks}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {user.name}
        </p>
      </div>
    </div>
  )
}
