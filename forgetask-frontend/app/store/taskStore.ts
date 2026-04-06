'use client'

/**
 * CREADO EN ESTE PROMPT
 * Zustand Store para manejar el estado global de las tareas
 * 
 * RAZÓN: En lugar de tener el estado en cada componente, usamos un store global
 * que se actualiza automáticamente cuando llegan eventos del servidor via WebSocket.
 * 
 * BENEFICIOS:
 * - Todos los componentes ven los mismos datos
 * - Actualizaciones en tiempo real cuando otros usuarios hacen cambios
 * - No necesitamos prop drilling (pasar props a muchos niveles)
 * - Fácil de testear
 * 
 * FLUJO:
 * 1. Componente se suscribe al store con useTaskStore()
 * 2. WebSocket recibe evento del servidor
 * 3. Componente llama a store.updateTask() o similar
 * 4. Estado global se actualiza
 * 5. Todos los componentes re-renderizan automáticamente con los nuevos datos
 */

import { create } from 'zustand'

// Interfaz de Task que debe coincidir con TaskDTO del backend
interface Task {
  id: string
  title: string
  description?: string
  status: 'backlog' | 'ready' | 'in-progress' | 'review' | 'done'
  priority?: 'low' | 'medium' | 'high'
  startDate?: string
  endDate?: string
  estimatedTime?: number
  realTime?: number
  assignedTo?: string[]
  assignedUsername?: string
  assignedRole?: string
}

/**
 * Interfaz del Store que define qué datos y funciones proporciona
 */
interface TaskStore {
  // Estado
  tasks: Task[]

  // Acciones para actualizar el estado
  /**
   * Reemplazar todas las tareas (usado cuando carga inicial desde BD)
   */
  setTasks: (tasks: Task[]) => void

  /**
   * Actualizar una tarea existente
   * Busca la tarea por ID y reemplaza sus datos
   */
  updateTask: (updatedTask: Task) => void

  /**
   * Agregar una nueva tarea a la lista
   */
  addTask: (task: Task) => void

  /**
   * Eliminar una tarea por ID
   */
  removeTask: (taskId: string) => void
}

/**
 * Crear el store con Zustand
 * 
 * CÓMO USARLO EN UN COMPONENTE:
 * const { tasks, updateTask } = useTaskStore()
 * 
 * El componente se SUSCRIBE automáticamente y re-renderiza cuando el store cambia
 */
export const useTaskStore = create<TaskStore>((set) => ({
  // Estado inicial
  tasks: [],

  // Acción: Reemplazar todas las tareas
  // Usado cuando se carga el listado inicial desde el servidor
  setTasks: (tasks: Task[]) => {
    console.log('📝 Store: Estableciendo', tasks.length, 'tareas')
    set({ tasks })
  },

  /**
   * Acción: Actualizar una tarea existente
   * Busca la tarea por ID en el estado actual y reemplaza sus datos
   * 
   * EJEMPLO:
   * updateTask({ id: "5", title: "Actualizada", status: "in-progress", ... })
   * 
   * Si la tarea no existe, se agrega como nueva
   */
  updateTask: (updatedTask: Task) => {
    console.log('✏️ Store: Actualizando tarea:', updatedTask.id)

    set((state) => ({
      tasks: state.tasks
        .map((task) => (task.id === updatedTask.id ? updatedTask : task))
        // Si la tarea no existe en la lista, agregarla (por seguridad)
        .concat(
          state.tasks.find((t) => t.id === updatedTask.id) ? [] : [updatedTask]
        ),
    }))
  },

  /**
   * Acción: Agregar una nueva tarea
   * 
   * EJEMPLO:
   * addTask({ id: "10", title: "Nueva", status: "backlog", ... })
   */
  addTask: (task: Task) => {
    console.log('✨ Store: Agregando tarea:', task.id)

    set((state) => ({
      tasks: [...state.tasks, task],
    }))
  },

  /**
   * Acción: Eliminar una tarea por ID
   * 
   * EJEMPLO:
   * removeTask("5")
   */
  removeTask: (taskId: string) => {
    console.log('🗑️ Store: Eliminando tarea:', taskId)

    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
    }))
  },
}))
