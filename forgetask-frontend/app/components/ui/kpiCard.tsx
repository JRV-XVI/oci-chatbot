// src/components/kpis/KpiCard.tsx
import { Card } from './Card';
import { NumberTicker } from './NumberTicker';
import { DonutChart, type AvailableChartColorsKeys } from './DonutChart';
import { ProgressBar } from './ProgressBar';

interface KpiCardProps {
  title?: string;
  value?: number;
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

  bottomContent?: React.ReactNode;

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
  bottomContent,
  icon,
}: KpiCardProps) {

  const badgeColor =
    badgeType === 'up'   ? 'text-primary' :
    badgeType === 'down' ? 'text-destructive' :
                           'text-muted-foreground';

  const badgeArrow = badgeType === 'up' ? '↑' : badgeType === 'down' ? '↓' : '→';
  const hasTitle = typeof title === 'string' && title.trim().length > 0;
  const hasValue = typeof value === 'number';

  return (
    <Card className="h-[130px] overflow-hidden px-3 py-2 flex flex-col gap-1 justify-between">
      {/* ── Header ── */}
      {(hasTitle || icon) && (
      <div className="flex items-center justify-between">
        {hasTitle ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </span>
        ) : (
          <span />
        )}
        {icon && <span className="text-muted-foreground opacity-60">{icon}</span>}
      </div>
      )}

      {/* ── Body: Número + (Dona O Barra) ── */}
      <div className={progressData ? "flex flex-col gap-1" : "flex items-center gap-1.5"}>
        {hasValue && (
          <div className="flex flex-col min-w-0">
            <div className="flex items-baseline gap-1">
              <NumberTicker
                value={value}
                className="text-xl font-bold text-foreground tabular-nums"
              />
              {suffix && (
                <span className="text-xs font-medium text-muted-foreground">{suffix}</span>
              )}
            </div>
            {badge && !progressData && (
              <p className={`text-[11px] font-medium mt-0 ${badgeColor}`}>
                {badgeArrow} {badge}
              </p>
            )}
          </div>
        )}

        {/* Renderiza la Dona si se pasan datos de Dona */}
        {donutData && (
          <DonutChart
            data={donutData}
            category="name"
            value="value"
            colors={donutColors}
            className="w-[56px] h-[56px] shrink-0 ml-auto"
            showLabel={false}
            showTooltip={true}
          />
        )}

        {/* Renderiza la Barra de Progreso si se pasan datos de Progreso */}
        {progressData && (
          <div className="w-full mt-0">
            <div className="flex justify-between text-[11px] text-muted-foreground mb-0.5">
              <span>{progressData.label || 'Progreso'}</span>
              <span>{Math.round((progressData.value / progressData.target) * 100)}%</span>
            </div>
            <ProgressBar
              value={progressData.value}
              max={progressData.target}
              color={progressData.color || "orange"}
              className="h-1.5"
            />
          </div>
        )}

        {/* Renderiza la Barra de categoria si se pasan los datos */}
        {bottomContent && <div className="w-full">{bottomContent}</div>}
      </div>
    </Card>
  );
}
