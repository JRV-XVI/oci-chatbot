'use client'

/**
 * CREADO EN ESTE PROMPT
 * Custom Hook para manejar la conexión WebSocket y la comunicación con el backend en tiempo real
 * 
 * FUNCIONALIDAD:
 * - Conecta al endpoint WebSocket del backend (/ws/tasks)
 * - Se suscribe al tópico /topic/tasks para recibir eventos en tiempo real
 * - Proporciona funciones para enviar cambios (create, update, delete) al backend
 * - Maneja reconexión automática si se pierde la conexión
 * - Llama callback cuando recibe eventos del servidor
 * 
 * FLUJO:
 * 1. useEffect conecta a WebSocket al montar el componente
 * 2. Se suscribe a /topic/tasks para recibir eventos
 * 3. Componente llama updateTask(), createTask(), deleteTask()
 * 4. Hook envía mensaje al backend vía WebSocket
 * 5. Backend procesa y emite evento a /topic/tasks
 * 6. Callback onTaskChange se ejecuta con el evento
 */

import { useEffect, useCallback, useRef } from 'react'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'
import taskService from '@/app/services/taskService'
import type { Task } from '@/app/types/task'

/**
 * Interfaz que define la estructura de los eventos que vienen del servidor
 * 
 * El servidor emite eventos con esta estructura a /topic/tasks:
 * type: "TASK_CREATED" | "TASK_UPDATED" | "TASK_DELETED"
 * data: La tarea actualizada (TaskDTO) o el ID de la tarea eliminada
 * timestamp: Cuándo ocurrió el evento
 */
export interface TaskEventMessage {
  type: 'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_DELETED'
  data: Task | string
  timestamp: string
}

/**
 * Hook personalizado para WebSocket
 * 
 * @param onTaskChange - Callback que se ejecuta cuando se recibe un evento del servidor
 * @returns Objeto con funciones para enviar cambios (updateTask, createTask, deleteTask)
 * 
 * EJEMPLO DE USO:
 * const { updateTask, createTask, deleteTask } = useTaskWebSocket((event) => {
 *   if (event.type === 'TASK_UPDATED') {
 *     // Actualizar estado global
 *   }
 * })
 */
export function useTaskWebSocket(
  onTaskChange: (event: TaskEventMessage) => void
) {
  // Referencia al cliente STOMP para mantenerlo disponible en todo el ciclo de vida
  const stompClientRef = useRef<Client | null>(null)

  useEffect(() => {
    // Función para establecer la conexión WebSocket
    const connect = () => {
      try {
        // Crear conexión SockJS al endpoint /ws/tasks del backend
        // SockJS proporciona fallback a WebSocket emulado si el navegador no lo soporta
        const socket = new SockJS('http://localhost:8080/ws/tasks')

        // Envolver la conexión con STOMP para protocolo de mensajería
        const stompClient = new Client({
          webSocketFactory: () => socket,
          reconnectDelay: 5000,
          debug: (message) => console.log('[STOMP]', message),
          onConnect: (frame) => {
            console.log('✅ WebSocket conectado con STOMP:', frame)

            // Suscribirse al topic /topic/tasks
            // Todos los cambios de tareas serán publicados aquí por el servidor
            stompClient.subscribe('/topic/tasks', (message) => {
              try {
                const event: TaskEventMessage = JSON.parse(message.body)
                console.log('📨 Evento recibido del servidor:', event.type, event.data)
                onTaskChange(event)
              } catch (error) {
                console.error('Error procesando evento WebSocket:', error)
              }
            })

            console.log('📢 Suscrito a /topic/tasks para recibir eventos en tiempo real')
            stompClientRef.current = stompClient
          },
          onDisconnect: () => {
            console.warn('⚠️ WebSocket desconectado de STOMP')
          },
          onStompError: (frame) => {
            console.error('❌ Error STOMP:', frame)
          },
        })

        stompClient.activate()
      } catch (error) {
        console.error('Error creando WebSocket:', error)
      }
    }

    // Conectar al montar el componente
    connect()

    // Limpiar conexión al desmontar
    return () => {
      if (stompClientRef.current?.active) {
        stompClientRef.current.deactivate()
        console.log('👋 WebSocket desconectado')
      }
    }
  }, [onTaskChange])

  /**
   * Enviar actualización de tarea al backend
   * 
   * ENVÍA al backend: /app/task/update
   * Backend recibe y procesa la actualización, luego emite evento a /topic/tasks
   * 
   * @param taskId - ID de la tarea a actualizar
   * @param taskData - Objeto con los campos a actualizar
   * 
   * EJEMPLO:
   * updateTask("5", { status: "in-progress", title: "Actualizado" })
   */
  const updateTask = useCallback((taskId: string, taskData: Partial<Task>) => {
    const client = stompClientRef.current
    const fallbackToHttp = async () => {
      try {
        const updatedTask = await taskService.updateTask(taskId, taskData)
        onTaskChange({
          type: 'TASK_UPDATED',
          data: updatedTask,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error('❌ Error actualizando tarea por HTTP fallback:', error)
      }
    }

    if (client?.active && client.connected) {
      console.log('📤 Enviando UPDATE de tarea:', taskId, taskData)

      try {
        client.publish({
          destination: '/app/task/update',
          body: JSON.stringify({ taskId, taskData }),
        })
      } catch (error) {
        console.warn('⚠️ Fallo publish STOMP, usando fallback HTTP para update:', error)
        void fallbackToHttp()
      }
    } else {
      console.warn('WebSocket no conectado. Usando fallback HTTP para update.')
      void fallbackToHttp()
    }
  }, [onTaskChange])

  /**
   * Enviar creación de nueva tarea al backend
   * 
   * ENVÍA al backend: /app/task/create
   * Backend crea la tarea y emite evento a /topic/tasks con el ID asignado
   * 
   * @param taskData - Objeto con los datos de la nueva tarea
   * 
   * EJEMPLO:
   * createTask({ title: "Nueva tarea", description: "...", status: "backlog" })
   */
  const createTask = useCallback((taskData: Omit<Task, 'id'>) => {
    const client = stompClientRef.current
    const fallbackToHttp = async () => {
      try {
        const createdTask = await taskService.createTask(taskData)
        onTaskChange({
          type: 'TASK_CREATED',
          data: createdTask,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error('❌ Error creando tarea por HTTP fallback:', error)
      }
    }

    if (client?.active && client.connected) {
      console.log('📤 Enviando CREATE de nueva tarea:', taskData)

      try {
        client.publish({
          destination: '/app/task/create',
          body: JSON.stringify({ taskData }),
        })
      } catch (error) {
        console.warn('⚠️ Fallo publish STOMP, usando fallback HTTP para create:', error)
        void fallbackToHttp()
      }
    } else {
      console.warn('WebSocket no conectado. Usando fallback HTTP para create.')
      void fallbackToHttp()
    }
  }, [onTaskChange])

  /**
   * Enviar eliminación de tarea al backend
   * 
   * ENVÍA al backend: /app/task/delete
   * Backend elimina la tarea y emite evento a /topic/tasks
   * 
   * @param taskId - ID de la tarea a eliminar
   * 
   * EJEMPLO:
   * deleteTask("5")
   */
  const deleteTask = useCallback((taskId: string) => {
    const client = stompClientRef.current
    const fallbackToHttp = async () => {
      try {
        const deleted = await taskService.deleteTask(taskId)
        if (deleted) {
          onTaskChange({
            type: 'TASK_DELETED',
            data: taskId,
            timestamp: new Date().toISOString(),
          })
        }
      } catch (error) {
        console.error('❌ Error eliminando tarea por HTTP fallback:', error)
      }
    }

    if (client?.active && client.connected) {
      console.log('📤 Enviando DELETE de tarea:', taskId)

      try {
        client.publish({
          destination: '/app/task/delete',
          body: JSON.stringify({ taskId }),
        })
      } catch (error) {
        console.warn('⚠️ Fallo publish STOMP, usando fallback HTTP para delete:', error)
        void fallbackToHttp()
      }
    } else {
      console.warn('WebSocket no conectado. Usando fallback HTTP para delete.')
      void fallbackToHttp()
    }
  }, [onTaskChange])

  // Retornar las funciones para que el componente las use
  return { updateTask, createTask, deleteTask }
}
