'use client'

/**
 * MODIFICADO EN ESTE PROMPT
 * Dialogo modal para crear nuevas tareas
 * 
 * CAMBIOS: Agregados comentarios explicativos
 * CÓMO FUNCIONA CON WEBSOCKET:
 * 1. Usuario rellena el formulario con datos de la nueva tarea
 * 2. Al click en "Add Task", se ejecuta handleSubmit
 * 3. handleSubmit llama a onAddTask (que ProjectBoard pasa desde WebSocket)
 * 4. onAddTask envía el mensaje CREATE al backend via WebSocket
 * 5. Backend crea la tarea en BD y emite evento TASK_CREATED a todos los clientes
 * 6. Todos los clientes reciben el evento y actualizan el store automáticamente
 */

import type * as React from 'react'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import type { Task } from './task-card'

interface AddTaskDialogProps {
  onAddTask: (task: Omit<Task, 'id'>) => void
}

/**
 * Dialogo para crear nuevas tareas
 *
 * Props:
 * - onAddTask: Callback que recibe los datos de la tarea creada
 *   (ProjectBoard pasa una función que ejecuta WebSocket.createTask)
 */
export function AddTaskDialog({ onAddTask }: AddTaskDialogProps) {
  // Estado del formulario
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Task['status']>('backlog')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [estimatedTime, setEstimatedTime] = useState('')
  const [realTime, setRealTime] = useState('')
  const [assignedTo, setAssignedTo] = useState('')

  /**
   * Manejar envío del formulario
   * 1. Validar que al menos haya título
   * 2. Compilar datos de la tarea
   * 3. Llamar al callback onAddTask (que envía CREATE via WebSocket)
   * 4. Limpiar formulario y cerrar diálogo
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    // Enviar datos de la nueva tarea al callback (ProjectBoard)
    // ProjectBoard tiene WebSocket.createTask que envía esto al backend
    onAddTask({
      title,
      description: description || undefined,
      status,
      priority,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      estimatedTime: estimatedTime ? parseFloat(estimatedTime) : undefined,
      realTime: realTime ? parseFloat(realTime) : undefined,
      assignedTo: assignedTo ? assignedTo.split(',').map((name) => name.trim()) : undefined,
    })

    // Limpiar formulario
    setTitle('')
    setDescription('')
    setStatus('backlog')
    setPriority("medium");
    setStartDate("");
    setEndDate("");
    setEstimatedTime("");
    setRealTime("");
    setAssignedTo("");
    setOpen(false);
  };

  return (
    <>
      <Button className="gap-2 cursor-pointer" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        New Task
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-[600px] max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
            <form onSubmit={handleSubmit}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Create New Task</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add a new task to your project board. Fill in the details below.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
                  Close
                </Button>
              </div>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter task title"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter task description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as Task["status"])}
                      className="border-input bg-input-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer"
                    >
                      <option value="backlog">Backlog</option>
                      <option value="ready">Ready</option>
                      <option value="in-progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <select
                      id="priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Task["priority"])}
                      className="border-input bg-input-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="border-t pt-4 mt-2">
                  <h3 className="font-medium text-gray-100 mb-3">Time Tracking (hours)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="estimatedTime">Estimated Time</Label>
                      <Input
                        id="estimatedTime"
                        type="number"
                        step="0.5"
                        min="0"
                        value={estimatedTime}
                        onChange={(e) => setEstimatedTime(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="realTime">Real Time</Label>
                      <Input
                        id="realTime"
                        type="number"
                        step="0.5"
                        min="0"
                        value={realTime}
                        onChange={(e) => setRealTime(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="assignedTo">Assigned To</Label>
                  <Input
                    id="assignedTo"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    placeholder="Enter names separated by commas"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" className="cursor-pointer">Create Task</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
