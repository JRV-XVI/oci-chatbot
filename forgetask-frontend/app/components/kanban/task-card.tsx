"use client";

import { useDrag } from "react-dnd";
import { GripVertical, Trash2, Calendar, Clock, User } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

// Task shape used by the kanban board, dialogs and drag/drop logic.
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
}

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onClick?: (task: Task) => void;
}

// Draggable task card component.
// Supports clicking to open details and deleting the task.
export function TaskCard({ task, onDelete, onClick }: TaskCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "TASK",
    item: task,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const priorityColors = {
    low: "bg-green-500/20 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    high: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(task);
    }
  };

  return (
    <div
      ref={drag as any}
      className={`bg-card rounded-lg border border-border p-3 group hover:border-accent transition-all ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="cursor-move">
          <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        </div>
        <div
          className="flex-1 min-w-0 cursor-pointer space-y-2"
          onClick={handleCardClick}
        >
          <h3 className="font-medium text-foreground">{task.title}</h3>

          {task.priority && (
            <Badge variant="outline" className={priorityColors[task.priority]}>
              {task.priority}
            </Badge>
          )}

          {task.startDate && task.endDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              <div className="inline-block">
                {new Date(task.startDate).toLocaleDateString('en-US')} - {new Date(task.endDate).toLocaleDateString('en-US')}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {task.estimatedTime !== undefined && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>Est: {task.estimatedTime}h</span>
              </div>
            )}
            {task.realTime !== undefined && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>Real: {task.realTime}h</span>
              </div>
            )}
          </div>

          {task.assignedTo && task.assignedTo.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3 flex-shrink-0" />
              <span>{task.assignedTo.join(", ")}</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 flex-shrink-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
        >
          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </div>
  );
}
