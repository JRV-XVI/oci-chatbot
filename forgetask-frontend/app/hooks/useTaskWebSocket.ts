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
  data: any
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
  const stompClientRef = useRef<any>(null)
  // Flag para saber si estamos intentando reconectar
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

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
  const updateTask = useCallback((taskId: string, taskData: any) => {
    if (stompClientRef.current?.active) {
      console.log('📤 Enviando UPDATE de tarea:', taskId, taskData)

      stompClientRef.current.publish({
        destination: '/app/task/update',
        body: JSON.stringify({ taskId, taskData }),
      })
    } else {
      console.warn('WebSocket no conectado. No se puede enviar actualización.')
    }
  }, [])

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
  const createTask = useCallback((taskData: any) => {
    if (stompClientRef.current?.active) {
      console.log('📤 Enviando CREATE de nueva tarea:', taskData)

      stompClientRef.current.publish({
        destination: '/app/task/create',
        body: JSON.stringify({ taskData }),
      })
    } else {
      console.warn('WebSocket no conectado. No se puede crear tarea.')
    }
  }, [])

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
    if (stompClientRef.current?.active) {
      console.log('📤 Enviando DELETE de tarea:', taskId)

      stompClientRef.current.publish({
        destination: '/app/task/delete',
        body: JSON.stringify({ taskId }),
      })
    } else {
      console.warn('WebSocket no conectado. No se puede eliminar tarea.')
    }
  }, [])

  // Retornar las funciones para que el componente las use
  return { updateTask, createTask, deleteTask }
}
