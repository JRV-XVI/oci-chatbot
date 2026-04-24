import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import type { Task } from './task-card';

interface AddTaskDialogProps {
  onAddTask: (task: Omit<Task, 'id'>) => void;
}

export function AddTaskDialog({ onAddTask }: AddTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>('backlog');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [realTime, setRealTime] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

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
    });

    // Reset form
    setTitle('');
    setDescription('');
    setStatus('backlog');
    setPriority('medium');
    setStartDate('');
    setEndDate('');
    setEstimatedTime('');
    setRealTime('');
    setAssignedTo('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task to your project board. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
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
                <Select value={status} onValueChange={(value) => setStatus(value as Task['status'])}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as Task['priority'])}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
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
            
            {/* Time tracking fields */}
            <div className="border-t pt-4 mt-2">
              <h3 className="font-medium text-gray-900 mb-3">Time Tracking (hours)</h3>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}