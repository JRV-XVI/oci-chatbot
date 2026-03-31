"use client";

import type * as React from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import type { Task } from "./task-card";

interface TaskDetailsDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTask: (task: Task) => void;
}

export function TaskDetailsDialog({
  task,
  open,
  onOpenChange,
  onUpdateTask,
}: TaskDetailsDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Task["status"]>("backlog");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [realTime, setRealTime] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
      setPriority(task.priority || "medium");
      setStartDate(task.startDate || "");
      setEndDate(task.endDate || "");
      setEstimatedTime(task.estimatedTime?.toString() || "");
      setRealTime(task.realTime?.toString() || "");
      setAssignedTo(task.assignedTo?.join(", ") || "");
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !title.trim()) return;

    onUpdateTask({
      ...task,
      title,
      description: description || undefined,
      status,
      priority,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      estimatedTime: estimatedTime ? parseFloat(estimatedTime) : undefined,
      realTime: realTime ? parseFloat(realTime) : undefined,
      assignedTo: assignedTo ? assignedTo.split(",").map((name) => name.trim()) : undefined,
    });

    onOpenChange(false);
  };

  if (!task) return null;

  if (!task || !open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-[600px] max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Task Details</h2>
            <p className="text-sm text-muted-foreground mt-1">
              View and edit the details of this task.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Task["status"])}
                  className="border-input bg-input-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  <option value="backlog">Backlog</option>
                  <option value="ready">Ready</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <select
                  id="edit-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Task["priority"])}
                  className="border-input bg-input-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-startDate">Start Date</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-endDate">End Date</Label>
              <Input
                id="edit-endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="border-t pt-4 mt-2">
              <h3 className="font-medium text-gray-100 mb-3">Time Tracking (hours)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-estimatedTime">Estimated Time</Label>
                  <Input
                    id="edit-estimatedTime"
                    type="number"
                    step="0.5"
                    min="0"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-realTime">Real Time</Label>
                  <Input
                    id="edit-realTime"
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
              <Label htmlFor="edit-assignedTo">Assigned To</Label>
              <Input
                id="edit-assignedTo"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Enter names separated by commas"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
