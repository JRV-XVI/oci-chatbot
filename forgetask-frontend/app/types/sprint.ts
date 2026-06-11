export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'CLOSED'

export interface SprintOption {
  idSprint: number
  idProject: number
  sprintNumber: number
  title: string
  goal?: string
  startDate?: string
  endDate?: string
  status?: SprintStatus  // Nuevo — opcional para compatibilidad con respuestas antiguas
}

export interface SprintCreateRequest {
  projectId?: number
  title: string
  sprintNumber?: number
  goal?: string
  startDate?: string
  endDate?: string
}
