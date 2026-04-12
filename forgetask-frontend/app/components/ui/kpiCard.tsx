// src/components/kpis/KpiCard.tsx
import { Card } from './Card';
import { NumberTicker } from './NumberTicker';
import { DonutChart, type AvailableChartColorsKeys } from './DonutChart';
import { ProgressBar } from './ProgressBar';

interface KpiCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  badge?: string;
  badgeType?: 'up' | 'down' | 'neutral';

  donutData?: { name: string; value: number }[];
  donutColors?: AvailableChartColorsKeys[];

  progressData?: {
    value: number;
    target: number;
    label?: string;
    color?: AvailableChartColorsKeys;
  };

  icon?: React.ReactNode;
}

export default function KpiCard({
  title,
  value,
  suffix,
  badge,
  badgeType = 'up',
  donutData,
  donutColors,
  progressData,
  icon,
}: KpiCardProps) {

  const badgeColor =
    badgeType === 'up'   ? 'text-primary' :
    badgeType === 'down' ? 'text-destructive' :
                           'text-muted-foreground';

  const badgeArrow = badgeType === 'up' ? '↑' : badgeType === 'down' ? '↓' : '→';

  return (
    <Card className="px-5 py-4 flex flex-col gap-2 justify-between">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        {icon && <span className="text-muted-foreground opacity-60">{icon}</span>}
      </div>

      {/* ── Body: Número + (Dona O Barra) ── */}
      <div className={progressData ? "flex flex-col gap-3" : "flex items-center gap-3"}>
        
        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline gap-1">
            <NumberTicker
              value={value}
              className="text-4xl font-bold text-foreground tabular-nums"
            />
            {suffix && (
              <span className="text-sm font-medium text-muted-foreground">{suffix}</span>
            )}
          </div>
          {badge && !progressData && (
            <p className={`text-xs font-medium mt-0.5 ${badgeColor}`}>
              {badgeArrow} {badge}
            </p>
          )}
        </div>

        {/* Renderiza la Dona si se pasan datos de Dona */}
        {donutData && (
          <DonutChart
            data={donutData}
            category="name"
            value="value"
            colors={donutColors}
            className="w-[72px] h-[72px] shrink-0 ml-auto"
            showLabel={false}
            showTooltip={true}
          />
        )}

        {/* Renderiza la Barra de Progreso si se pasan datos de Progreso */}
        {progressData && (
          <div className="w-full mt-1">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>{progressData.label || 'Progreso'}</span>
              <span>{Math.round((progressData.value / progressData.target) * 100)}%</span>
            </div>
            <ProgressBar
              value={progressData.value}
              max={progressData.target}
              color={progressData.color || "emerald"}
              className="h-2"
            />
          </div>
        )}
      </div>
    </Card>
  );
}
