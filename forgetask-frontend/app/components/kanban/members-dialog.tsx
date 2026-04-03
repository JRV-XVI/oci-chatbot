import { Task } from './task-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Users, TrendingUp } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface MembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
}

interface MemberStats {
  key: string;
  name: string;
  username?: string;
  role?: string;
  productivity: number;
  completedTasks: number;
  totalEstimated: number;
  totalReal: number;
}

// Dialog that shows team members and their productivity metrics based on completed tasks.
export function MembersDialog({ open, onOpenChange, tasks }: MembersDialogProps) {
  const memberStatsMap = new Map<string, MemberStats>();

  tasks.forEach((task) => {
    if (task.status === 'done' && task.assignedTo && task.assignedTo.length > 0) {
      const memberName = task.assignedTo[0];
      const memberKey = task.assignedUsername || memberName;

      if (!memberStatsMap.has(memberKey)) {
        memberStatsMap.set(memberKey, {
          key: memberKey,
          name: memberName,
          username: task.assignedUsername,
          role: task.assignedRole,
          productivity: 0,
          completedTasks: 0,
          totalEstimated: 0,
          totalReal: 0,
        });
      }

      const stats = memberStatsMap.get(memberKey)!;
      stats.completedTasks += 1;
      stats.totalEstimated += task.estimatedTime || 0;
      stats.totalReal += task.realTime || 0;

      if (!stats.username && task.assignedUsername) {
        stats.username = task.assignedUsername;
      }
      if (!stats.role && task.assignedRole) {
        stats.role = task.assignedRole;
      }
    }
  });

  // Compute productivity for each member from done tasks.
  const membersStats = Array.from(memberStatsMap.values()).map((stats) => {
    const productivity =
      stats.totalReal > 0
        ? Math.round((stats.totalEstimated / stats.totalReal) * 100)
        : 100;

    return {
      ...stats,
      productivity,
    };
  });

  membersStats.sort((a, b) => b.productivity - a.productivity);

  const getProductivityColor = (productivity: number) => {
    if (productivity >= 100) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (productivity >= 80) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const getProductivityLabel = (productivity: number) => {
    if (productivity >= 120) return 'Excellent';
    if (productivity >= 100) return 'Great';
    if (productivity >= 80) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Members
              </DialogTitle>
              <DialogDescription>
                View team members and their productivity metrics
              </DialogDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="cursor-pointer">
              Close
            </Button>
          </div>
        </DialogHeader>

        {membersStats.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No completed tasks yet to calculate productivity
          </div>
        ) : (
          <div className="space-y-4">
            {membersStats.map((member) => (
              <div
                key={member.key}
                className="bg-card border border-border rounded-lg p-4 hover:border-accent transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">
                      {member.name}
                    </h3>
                    {(member.username || member.role) && (
                      <p className="text-xs text-muted-foreground">
                        {member.username ? `@${member.username}` : 'No username'}
                        {member.role ? ` • ${member.role}` : ''}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {member.completedTasks} completed{' '}
                      {member.completedTasks === 1 ? 'task' : 'tasks'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-accent" />
                      <span className="text-2xl font-bold text-foreground">
                        {member.productivity}%
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={getProductivityColor(member.productivity)}
                    >
                      {getProductivityLabel(member.productivity)}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Estimated Time:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {member.totalEstimated}h
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Real Time:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {member.totalReal}h
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {member.productivity >= 100
                      ? `Completed work ${member.productivity - 100}% faster than estimated`
                      : `Took ${100 - member.productivity}% longer than estimated`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
