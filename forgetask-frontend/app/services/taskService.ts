/**
 * Task API Service
 * Handles all task-related API calls to the backend
 * This service will eventually call the real backend endpoints
 */
import type { Task } from "@/app/types/task";
import type { TaskAssigneeOption } from "@/app/types/task";
import { getApiBaseUrl } from "@/app/services/apiBaseUrl";
import { fetchWithAuth } from "@/app/services/apiClient";

export type { Task };

const API_BASE_URL = getApiBaseUrl();

class TaskService {
  
  async getAllTasks(): Promise<Task[]> {
    const response = await fetchWithAuth('/api/tasks/project', {
      method: 'GET',
    })
    if (!response.ok) throw new Error(`Failed to fetch tasks: ${response.statusText}`)
    return response.json()
  }

  async getTaskById(id: string): Promise<Task> {
    const response = await fetchWithAuth(`/api/tasks/${id}`, {
      method: 'GET',
    })
    if (!response.ok) throw new Error(`Failed to fetch task: ${response.statusText}`)
    return response.json()
  }

  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    const response = await fetchWithAuth('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    })
    if (!response.ok) throw new Error(`Failed to create task: ${response.statusText}`)
    return response.json()
  }

  async updateTask(id: string, task: Partial<Task>): Promise<Task> {
    const response = await fetchWithAuth(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    })
    if (!response.ok) throw new Error(`Failed to update task: ${response.statusText}`)
    return response.json()
  }

  async deleteTask(id: string): Promise<boolean> {
    const response = await fetchWithAuth(`/api/tasks/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Failed to delete task: ${response.statusText} ${errorBody}`)
    }
    return response.json()
  }

  async getProjectUsers(projectId?: number): Promise<TaskAssigneeOption[]> {
    const query = projectId !== undefined ? `?projectId=${projectId}` : ''
    const response = await fetchWithAuth(`/api/tasks/meta/users${query}`, {
      method: 'GET',
    })
    if (!response.ok) throw new Error(`Failed to fetch project users: ${response.statusText}`)
    return response.json()
  }
}

const taskService = new TaskService();
export default taskService;