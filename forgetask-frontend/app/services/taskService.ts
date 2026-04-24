/**
 * Task API Service
 * Handles all task-related API calls to the backend
 * This service will eventually call the real backend endpoints
 */
import type { Task } from "@/app/types/task";
import type { TaskAssigneeOption } from "@/app/types/task";
import { getApiBaseUrl } from "@/app/services/apiBaseUrl";
export type { Task };

const API_BASE_URL = getApiBaseUrl();

class TaskService {
  /**
   * Get all tasks from the backend
   * This will be used instead of hardcoded data
   */
  async getAllTasks(): Promise<Task[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching tasks:", error);
      throw error;
    }
  }

  /**
   * Get a single task by ID
   */
  async getTaskById(id: string): Promise<Task> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch task: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching task:", error);
      throw error;
    }
  }

  /**
   * Create a new task
   */
  async createTask(task: Omit<Task, "id">): Promise<Task> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(task),
      });

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(id: string, task: Partial<Task>): Promise<Task> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(task),
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  }

  /**
   * Delete a task by ID
   */
  async deleteTask(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to delete task: ${response.statusText || errorBody}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  }

  /**
   * Get assignable users for a project.
   */
  async getProjectUsers(projectId?: number): Promise<TaskAssigneeOption[]> {
    try {
      const query = projectId !== undefined ? `?projectId=${projectId}` : "";
      const response = await fetch(`${API_BASE_URL}/api/tasks/meta/users${query}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch project users: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching project users:", error);
      throw error;
    }
  }
}

const taskService = new TaskService();

export default taskService;