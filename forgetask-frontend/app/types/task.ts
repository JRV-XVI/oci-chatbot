export interface Task {
  id: string;
  sprintId?: number;
  title: string;
  description?: string;
  status: "backlog" | "ready" | "in-progress" | "review" | "done";
  priority?: "low" | "medium" | "high";
  startDate?: string;
  endDate?: string;
  estimatedTime?: number;
  realTime?: number;
  assignedTo?: string[];
  assignedUsername?: string;
  assignedRole?: string;
}

export interface TaskAssigneeOption {
  idUser: number;
  idProject: number;
  username: string;
  displayName: string;
  role?: string;
}
