import UserTasksCompletionCard from "../ui/UserTasksCompletionCard"
import type { SprintUserPerformance } from "@/app/services/metricsService"

interface SprintTasksByUser {
  sprintId: number
  sprintNumber: number
  sprintTitle: string
  startDate?: string
  endDate?: string
  users: SprintUserPerformance[]
}

interface UserTasksCompletionKpiProps {
  sprintData: SprintTasksByUser[]
  title?: string
}

export default function UserTasksCompletionKpi({
  sprintData,
  title = "Tasks completed by user",
}: UserTasksCompletionKpiProps) {
  return <UserTasksCompletionCard sprintData={sprintData} title={title} />
}
