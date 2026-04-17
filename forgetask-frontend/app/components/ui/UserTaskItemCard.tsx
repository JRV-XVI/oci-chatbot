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
    <div className="flex flex-col items-center justify-center gap-2 text-center">
      <ProgressCircle value={percentage} radius={70} color={circleColor}>
        <span className="text-xl font-semibold text-foreground">
          {percentage}%
        </span>
      </ProgressCircle>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-foreground">
          {user.completedTasks}/{user.totalTasks}
        </p>
        <p className="text-xs text-muted-foreground">
          {user.name}
        </p>
      </div>
    </div>
  )
}
