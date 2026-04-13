import UserTasksCompletionCard from "../ui/UserTasksCompletionCard"

interface User {
  id: string
  name: string
  completedTasks: number
  totalTasks: number
}

interface UserTasksCompletionKpiProps {
  users: User[]
  title?: string
}

export default function UserTasksCompletionKpi({
  users,
  title = "Tareas completadas por usuario",
}: UserTasksCompletionKpiProps) {
  return <UserTasksCompletionCard users={users} title={title} />
}
