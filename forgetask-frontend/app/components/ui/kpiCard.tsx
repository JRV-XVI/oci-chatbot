// src/components/kpis/KpiCard.tsx
import { Card } from './Card';
import { NumberTicker } from './NumberTicker';
import { DonutChart, type AvailableChartColorsKeys } from './DonutChart';

interface KpiCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  badge?: string;
  badgeType?: 'up' | 'down' | 'neutral';
  // ✅ Cambio: color ahora usa los nombres válidos de Tremor, NO hex strings
  donutData?: { name: string; value: number }[];
  donutColors?: AvailableChartColorsKeys[];  // ← ["amber", "cyan", "indigo"]
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
  icon,
}: KpiCardProps) {

  const badgeColor =
    badgeType === 'up'   ? 'text-primary' :
    badgeType === 'down' ? 'text-destructive' :
                           'text-muted-foreground';

  const badgeArrow = badgeType === 'up' ? '↑' : badgeType === 'down' ? '↓' : '→';

  return (
    <Card className="px-5 py-4 flex flex-col gap-2">

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        {icon && (
          <span className="text-muted-foreground opacity-60">{icon}</span>
        )}
      </div>

      {/* Body */}
      <div className="flex items-center gap-3">
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
          {badge && (
            <p className={`text-xs font-medium mt-0.5 ${badgeColor}`}>
              {badgeArrow} {badge}
            </p>
          )}
        </div>

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
      </div>
    </Card>
  );
}
