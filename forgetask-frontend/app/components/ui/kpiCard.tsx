import { ReactNode } from "react";

interface KpiCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function KpiCard({ title, icon, children, className }: KpiCardProps) {
  return (
    <div className={`bg-white border border-gray-100 rounded-xl shadow-sm p-6 flex flex-col gap-4 ${className}`}>
      <div className="flex items-center justify-between text-gray-400">
        <span className="text-xs uppercase tracking-wider font-medium">{title}</span>
        {icon && <span className="text-gray-300">{icon}</span>}
      </div>
      {children}
    </div>
  );
}