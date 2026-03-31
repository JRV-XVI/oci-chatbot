"use client";

import * as React from "react";
import { useState } from "react";
import { useDrop } from "react-dnd";
import { Circle, Layers, CircleDot, Eye, CheckCircle2, FileText, Settings } from "lucide-react";
import { TaskCard, type Task } from "./task-card";
import { AddTaskDialog } from "./add-task-dialog";
import { TaskDetailsDialog } from "./task-details-dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const INITIAL_TASKS: Task[] = [
  {
    id: "1",
    title: "Extender requerimientos (F y NF)",
    description: "Ampliar y detallar los requerimientos funcionales y no funcionales del proyecto.",
    status: "backlog",
    priority: "high",
    startDate: "2026-03-23",
    endDate: "2026-03-26",
    estimatedTime: 6,
    realTime: 0,
    assignedTo: ["Team Lead"],
  },
  {
    id: "2",
    title: "Reparto de tareas a desarrollar",
    description: "Distribucion y asignacion de las tareas de desarrollo entre los miembros del equipo.",
    status: "backlog",
    priority: "high",
    startDate: "2026-03-23",
    endDate: "2026-03-24",
    estimatedTime: 1,
    realTime: 0,
    assignedTo: ["Team Lead"],
  },
  {
    id: "3",
    title: "Plantear plan de DevOps y CI/CD",
    description: "Diseno del plan de integracion continua y despliegue continuo para el proyecto.",
    status: "backlog",
    priority: "medium",
    startDate: "2026-03-25",
    endDate: "2026-03-27",
    estimatedTime: 4,
    realTime: 0,
    assignedTo: ["Team Lead"],
  },
  {
    id: "4",
    title: "Plantear propuesta de Feature de IA",
    description: "Definir y proponer la funcionalidad de Inteligencia Artificial que se integrara al chatbot.",
    status: "backlog",
    priority: "medium",
    startDate: "2026-03-24",
    endDate: "2026-03-24",
    estimatedTime: 1,
    realTime: 0,
    assignedTo: ["Team Lead"],
  },
  {
    id: "5",
    title: "Presentacion (Leer descripcion)",
    description: "Preparacion y entrega de la presentacion del avance del proyecto ante el equipo evaluador.",
    status: "in-progress",
    priority: "high",
    startDate: "2026-03-11",
    endDate: "2026-03-12",
    estimatedTime: 8,
    realTime: 5,
    assignedTo: ["Team Lead"],
  },
  {
    id: "6",
    title: "Revision de requerimientos no funcionales",
    description: "Revision y validacion de los requerimientos no funcionales definidos para el sistema.",
    status: "in-progress",
    priority: "high",
    startDate: "2026-03-11",
    endDate: "2026-03-11",
    estimatedTime: 2,
    realTime: 0,
    assignedTo: ["Requirements Analyst"],
  },
  {
    id: "7",
    title: "Mock-up",
    description: "Diseno de los prototipos visuales (mockups) de la interfaz del chatbot.",
    status: "in-progress",
    priority: "high",
    startDate: "2026-03-12",
    endDate: "2026-03-12",
    estimatedTime: 4,
    realTime: 0,
    assignedTo: ["Team Lead"],
  },
  {
    id: "8",
    title: "Grabar la DEMO con todo ya configurado",
    description: "Grabacion del video demostrativo con el sistema completamente configurado y funcional.",
    status: "review",
    priority: "high",
    startDate: "2026-03-09",
    endDate: "2026-03-11",
    estimatedTime: 2,
    realTime: 1,
    assignedTo: ["Team Lead"],
  },
  {
    id: "9",
    title: "Entrega de la actividad de Java",
    description: "Entrega de la actividad individual de programacion en Java correspondiente al modulo del curso.",
    status: "review",
    priority: "medium",
    startDate: "2026-03-10",
    endDate: "2026-03-10",
    estimatedTime: 3,
    realTime: 0,
    assignedTo: ["Java Developer"],
  },
  {
    id: "10",
    title: "Capacitacion con OCI Foundations",
    description: "Estudio y certificacion de los fundamentos de Oracle Cloud Infrastructure (OCI Foundations).",
    status: "done",
    priority: "high",
    startDate: "2026-02-09",
    endDate: "2026-03-08",
    estimatedTime: 10,
    realTime: 18,
    assignedTo: ["Team Lead"],
  },
  {
    id: "11",
    title: "Levantamiento de requerimientos funcionales",
    description: "Recopilacion y documentacion de los requerimientos funcionales del sistema chatbot.",
    status: "done",
    priority: "high",
    startDate: "2026-02-25",
    endDate: "2026-03-08",
    estimatedTime: 12,
    realTime: 10,
    assignedTo: ["Requirements Analyst"],
  },
  {
    id: "12",
    title: "Diagramas de casos de uso",
    description: "Elaboracion de los diagramas UML de casos de uso del sistema.",
    status: "done",
    priority: "high",
    startDate: "2026-03-05",
    endDate: "2026-03-08",
    estimatedTime: 4,
    realTime: 4,
    assignedTo: ["Requirements Analyst"],
  },
  {
    id: "13",
    title: "Despliegue Web avanzado",
    description: "Configuracion y despliegue avanzado de la aplicacion web. Ref: https://github.com/JRV-XVI/forms-app-web/issues/18",
    status: "done",
    priority: "high",
    startDate: "2026-03-07",
    endDate: "2026-03-08",
    estimatedTime: 6,
    realTime: 4,
    assignedTo: ["Team Lead"],
  },
  {
    id: "14",
    title: "Plan de despliegue",
    description: "Documentacion del plan completo de despliegue de la infraestructura en OCI.",
    status: "done",
    priority: "high",
    startDate: "2026-03-05",
    endDate: "2026-03-09",
    estimatedTime: 8,
    realTime: 5,
    assignedTo: ["DevOps Engineer"],
  },
  {
    id: "15",
    title: "Servicios de Kubernetes y PODS",
    description: "Configuracion de los servicios, deployments y pods en el cluster de Kubernetes en OCI.",
    status: "done",
    priority: "high",
    startDate: "2026-03-10",
    endDate: "2026-03-12",
    estimatedTime: 4,
    realTime: 2,
    assignedTo: ["Team Lead"],
  },
  {
    id: "16",
    title: "Despliegue de la base de datos en OCI",
    description: "Creacion y configuracion de la instancia ATP (Autonomous Transaction Processing) en OCI. Ref: https://github.com/JRV-XVI/oci-chatbot/issues/1",
    status: "done",
    priority: "high",
    startDate: "2026-03-09",
    endDate: "2026-03-10",
    estimatedTime: 2,
    realTime: 2,
    assignedTo: ["Team Lead"],
  },
  {
    id: "17",
    title: "Analisis del codigo de Oracle",
    description: "Revision y analisis del codigo base y ejemplos provistos por Oracle para la integracion.",
    status: "done",
    priority: "medium",
    startDate: "2026-03-09",
    endDate: "2026-03-10",
    estimatedTime: 6,
    realTime: 0,
    assignedTo: ["Team Lead"],
  },
  {
    id: "18",
    title: "M2 Delivery (Mara)",
    description: "Entrega del modulo 2 ante la asesora Mara.",
    status: "done",
    priority: "medium",
    startDate: "2026-03-07",
    endDate: "2026-03-11",
    estimatedTime: 1.5,
    realTime: 2,
    assignedTo: ["Team Lead"],
  },
  {
    id: "19",
    title: "Linux Foundations Chapter 4",
    description: "Estudio y completado del capitulo 4 del curso Linux Foundations.",
    status: "done",
    priority: "low",
    startDate: "2026-03-08",
    endDate: "2026-03-10",
    estimatedTime: 3,
    realTime: 1,
    assignedTo: ["System Administrator"],
  },
];

interface ColumnProps {
  title: string;
  status: Task["status"];
  tasks: Task[];
  icon: React.ReactNode;
  expectedTasks: number;
  onDrop: (task: Task, newStatus: Task["status"]) => void;
  onDeleteTask: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onExpectedChange: (status: Task["status"], value: number) => void;
}

function Column({
  title,
  status,
  tasks,
  icon,
  expectedTasks,
  onDrop,
  onDeleteTask,
  onTaskClick,
  onExpectedChange,
}: ColumnProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "TASK",
    drop: (item: Task) => onDrop(item, status),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const [isEditingExpected, setIsEditingExpected] = useState(false);
  const [expectedValue, setExpectedValue] = useState(expectedTasks.toString());

  const handleExpectedSave = () => {
    const value = parseInt(expectedValue) || 0;
    onExpectedChange(status, value);
    setIsEditingExpected(false);
  };

  const isDone = status === "done";

  return (
    <div className="flex-1 min-w-[300px] flex flex-col max-h-full">
      <div className="bg-muted/50 rounded-lg p-4 border border-border flex flex-col h-full">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <h2 className="font-semibold text-foreground">{title}</h2>
        </div>

        <div className="mb-4 flex items-center gap-2">
          {isDone ? (
            <span className="text-sm text-muted-foreground">Tasks: {tasks.length}</span>
          ) : (
            <>
              {isEditingExpected ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={expectedValue}
                    onChange={(e) => setExpectedValue(e.target.value)}
                    className="w-16 h-7 text-sm"
                    onBlur={handleExpectedSave}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleExpectedSave();
                      if (e.key === "Escape") {
                        setExpectedValue(expectedTasks.toString());
                        setIsEditingExpected(false);
                      }
                    }}
                    autoFocus
                  />
                  <span className="text-sm text-muted-foreground">tasks</span>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingExpected(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
                >
                  <span>{tasks.length}/{expectedTasks}</span>
                  <Settings className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </>
          )}
        </div>

        <div
          ref={drop}
          className={`space-y-3 flex-1 overflow-y-auto rounded-lg transition-colors p-1 ${
            isOver ? "bg-accent/20 border-2 border-accent border-dashed" : ""
          }`}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onDelete={onDeleteTask} onClick={onTaskClick} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProjectBoard() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [expectedTasks, setExpectedTasks] = useState({
    backlog: 5,
    ready: 3,
    "in-progress": 4,
    review: 2,
    done: 10,
  });

  const handleDrop = (task: Task, newStatus: Task["status"]) => {
    if (task.status === newStatus) return;

    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)),
    );
  };

  const handleAddTask = (newTask: Omit<Task, "id">) => {
    const task: Task = {
      ...newTask,
      id: Date.now().toString(),
    };
    setTasks((prevTasks) => [...prevTasks, task]);
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailsDialogOpen(true);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
    );
  };

  const handleExpectedChange = (status: Task["status"], value: number) => {
    setExpectedTasks((prev) => ({ ...prev, [status]: value }));
  };

  const handleGenerateReport = () => {
    const totalTasks = tasks.length;
    const completedTasks = doneTasks.length;
    const inProgressCount = inProgressTasks.length;
    const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0);
    const totalRealHours = tasks.reduce((sum, task) => sum + (task.realTime || 0), 0);

    const report = `Project Board Report\nGenerated: ${new Date().toLocaleString()}\n\n=== Summary ===\nTotal Tasks: ${totalTasks}\nCompleted: ${completedTasks}\nIn Progress: ${inProgressCount}\nBacklog: ${backlogTasks.length}\nReady: ${readyTasks.length}\nReview: ${reviewTasks.length}\n\n=== Time Tracking ===\nTotal Estimated Hours: ${totalEstimatedHours}\nTotal Real Hours: ${totalRealHours}\nVariance: ${totalRealHours - totalEstimatedHours} hours\n\n=== Tasks by Status ===\n${tasks
      .map(
        (task) => `- [${task.status.toUpperCase()}] ${task.title} (Priority: ${task.priority || 'none'})`,
      )
      .join("\n")}
`;

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project-report-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const backlogTasks = tasks.filter((task) => task.status === "backlog");
  const readyTasks = tasks.filter((task) => task.status === "ready");
  const inProgressTasks = tasks.filter((task) => task.status === "in-progress");
  const reviewTasks = tasks.filter((task) => task.status === "review");
  const doneTasks = tasks.filter((task) => task.status === "done");

  return (
    <div className="h-full flex flex-col">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Project Board</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your tasks and track progress
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleGenerateReport} variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
            <AddTaskDialog onAddTask={handleAddTask} />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto p-6 bg-background">
        <div className="flex gap-6 h-full">
          <Column
            title="Backlog"
            status="backlog"
            tasks={backlogTasks}
            icon={<Circle className="w-5 h-5 text-muted-foreground" />}
            onDrop={handleDrop}
            onDeleteTask={handleDeleteTask}
            onTaskClick={handleTaskClick}
            onExpectedChange={handleExpectedChange}
            expectedTasks={expectedTasks.backlog}
          />
          <Column
            title="Ready"
            status="ready"
            tasks={readyTasks}
            icon={<Layers className="w-5 h-5 text-secondary" />}
            onDrop={handleDrop}
            onDeleteTask={handleDeleteTask}
            onTaskClick={handleTaskClick}
            onExpectedChange={handleExpectedChange}
            expectedTasks={expectedTasks.ready}
          />
          <Column
            title="In Progress"
            status="in-progress"
            tasks={inProgressTasks}
            icon={<CircleDot className="w-5 h-5 text-blue-400" />}
            onDrop={handleDrop}
            onDeleteTask={handleDeleteTask}
            onTaskClick={handleTaskClick}
            onExpectedChange={handleExpectedChange}
            expectedTasks={expectedTasks["in-progress"]}
          />
          <Column
            title="Review"
            status="review"
            tasks={reviewTasks}
            icon={<Eye className="w-5 h-5 text-accent" />}
            onDrop={handleDrop}
            onDeleteTask={handleDeleteTask}
            onTaskClick={handleTaskClick}
            onExpectedChange={handleExpectedChange}
            expectedTasks={expectedTasks.review}
          />
          <Column
            title="Done"
            status="done"
            tasks={doneTasks}
            icon={<CheckCircle2 className="w-5 h-5 text-green-400" />}
            onDrop={handleDrop}
            onDeleteTask={handleDeleteTask}
            onTaskClick={handleTaskClick}
            onExpectedChange={handleExpectedChange}
            expectedTasks={expectedTasks.done}
          />
        </div>
      </div>

      <TaskDetailsDialog
        task={selectedTask}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onUpdateTask={handleUpdateTask}
      />
    </div>
  );
}
