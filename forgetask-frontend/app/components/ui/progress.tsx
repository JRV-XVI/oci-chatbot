import * as React from 'react';
import { cn } from './utils';

interface ProgressProps {
  value: number;
  className?: string;
}

export function Progress({ value, className }: ProgressProps) {
  const progressValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('relative h-2 overflow-hidden rounded-full bg-muted', className)}>
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${progressValue}%` }}
      />
    </div>
  );
}
