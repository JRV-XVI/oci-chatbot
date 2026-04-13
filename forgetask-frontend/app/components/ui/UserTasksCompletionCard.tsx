"use client"

import { Users } from "lucide-react"
import { Card } from "./Card"
import { UserTaskItemCard } from "./UserTaskItemCard"
import { getTaskCompletionColor } from "./userTasksColorUtils"

interface User {
  id: string
  name: string
  completedTasks: number
  totalTasks: number
}

interface UserTasksCompletionCardProps {
  users: User[]
  title?: string
  icon?: React.ReactNode
}

export default function UserTasksCompletionCard({
  users,
  title = "Tareas completadas por usuario",
  icon = <Users size={20} />,
}: UserTasksCompletionCardProps) {
  return (
    <Card className="px-5 py-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        {icon && (
          <span className="text-muted-foreground opacity-60">{icon}</span>
        )}
      </div>

      {/* ── Body: User Progress Circles (Horizontal Scroll) ── */}
      {users.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            No hay usuarios disponibles
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-6">
          <div className="flex w-max min-w-full gap-8 px-3">
            {users.map((user) => {
              const percentage =
                user.totalTasks > 0
                  ? Math.round((user.completedTasks / user.totalTasks) * 100)
                  : 0

              const circleColor = getTaskCompletionColor(percentage)

              return (
                <div key={user.id} className="flex-shrink-0">
                  <UserTaskItemCard
                    user={user}
                    percentage={percentage}
                    circleColor={circleColor}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}
