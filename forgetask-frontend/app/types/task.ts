export interface Task {
  id: string;
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
<<<<<<< HEAD
=======
}

export interface TaskAssigneeOption {
  idUser: number;
  idProject: number;
  username: string;
  displayName: string;
  role?: string;
>>>>>>> 32212d3df3d431df7710776bb60c1888d4d0b534
}