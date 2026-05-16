export interface SprintOption {
  idSprint: number;
  idProject: number;
  sprintNumber: number;
  title: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

export interface SprintCreateRequest {
  projectId?: number;
  title: string;
  sprintNumber?: number;
  goal?: string;
  startDate?: string;
  endDate?: string;
}
