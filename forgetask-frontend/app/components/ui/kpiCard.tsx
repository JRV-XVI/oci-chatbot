import React from "react";
import { Card } from "./Card";
import { NumberTicker } from "./NumberTicker";
import { DonutChart, type AvailableChartColorsKeys } from "./DonutChart";
import { ProgressBar } from "./ProgressBar";

interface KpiCardProps {
  title?: string;
  value?: number;
  prefix?: string;
  suffix?: string;
  badge?: string;
  badgeType?: "up" | "down" | "neutral";

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
  badgeType = "up",
  donutData,
  donutColors,
  progressData,
  bottomContent,
  icon,
}: KpiCardProps) {
  const badgeColor =
    badgeType === "up"
      ? "text-emerald-500 bg-emerald-500/10"
      : badgeType === "down"
      ? "text-rose-500 bg-rose-500/10"
      : "text-muted-foreground bg-muted";

  const badgeArrow =
    badgeType === "up" ? "↑" : badgeType === "down" ? "↓" : "→";

  const hasTitle = typeof title === "string" && title.trim().length > 0;
  const hasValue = typeof value === "number";

  return (
    // ✅ CAMBIO: padding aumentado de p-4 → p-6, gap de gap-2 → gap-5
    <Card className="p-6 flex flex-col gap-5">

      {/* ── Header ── */}
      {(hasTitle || icon) && (
        // ✅ CAMBIO: items-start para alinear mejor el ícono con el título
        <div className="flex items-start justify-between gap-3">
          {hasTitle ? (
            // ✅ CAMBIO: text-xs → text-sm, agregado font-medium y tracking-wide
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider leading-tight">
              {title}
            </p>
          ) : (
            <span />
          )}
          {/* ✅ CAMBIO: ícono agrandado de w-4 h-4 → w-5 h-5, con fondo sutil */}
          {icon && (
            <span className="shrink-0 p-2 rounded-lg bg-muted text-muted-foreground [&>svg]:w-5 [&>svg]:h-5">
              {icon}
            </span>
          )}
        </div>
      )}

      {/* ── Body: Número + Sufijo + Badge ── */}
      <div className="flex flex-col gap-4">
        {hasValue && (
          <div className="flex flex-col gap-1">
            <div className="flex items-end gap-2 flex-wrap">
              {/* ✅ CAMBIO: text-2xl → text-5xl, tracking-tight para legibilidad */}
              <NumberTicker
                value={value}
                className="text-5xl font-bold tracking-tight tabular-nums leading-none"
              />
              {/* ✅ CAMBIO: text-xs → text-xl, color muted y alineado al baseline */}
              {suffix && (
                <span className="text-xl text-muted-foreground font-medium mb-1 leading-none">
                  {suffix}
                </span>
              )}
            </div>

            {/* ✅ CAMBIO: badge más grande, separado del número, con fondo de color */}
            {badge && !progressData && (
              <span
                className={`inline-flex items-center gap-1 self-start text-sm font-semibold px-2.5 py-1 rounded-full mt-1 ${badgeColor}`}
              >
                <span>{badgeArrow}</span>
                <span>{badge}</span>
              </span>
            )}
          </div>
        )}

        {/* ✅ CAMBIO: Donut más alto h-28 → h-52 */}
        {donutData && (
          <DonutChart
            data={donutData}
            category="value"
            index="name"
            colors={donutColors}
            className="h-52 mt-1"
          />
        )}

        {/* ── ProgressBar section ── */}
        {progressData && (
          <div className="flex flex-col gap-3 mt-1">
            <div className="flex items-center justify-between">
              {/* ✅ CAMBIO: text-xs → text-sm */}
              <span className="text-sm font-medium text-muted-foreground">
                {progressData.label || "Progreso"}
              </span>
              {/* ✅ CAMBIO: porcentaje más grande y con color del badge */}
              <span className={`text-base font-bold ${badgeColor.split(" ")[0]}`}>
                {Math.round((progressData.value / progressData.target) * 100)}%
              </span>
            </div>
            {/* ✅ CAMBIO: altura de la barra aumentada con className personalizado */}
            <ProgressBar
              value={progressData.value}
              max={progressData.target}
              color={progressData.color}
              className="h-4 rounded-full"
            />
            {badge && (
              <span
                className={`inline-flex items-center gap-1 self-start text-sm font-semibold px-2.5 py-1 rounded-full ${badgeColor}`}
              >
                {badgeArrow} {badge}
              </span>
            )}
          </div>
        )}

        {/* ── Custom bottom content ── */}
        {/* ✅ CAMBIO: mt-1 → mt-2 para más respiro */}
        {bottomContent && <div className="mt-2">{bottomContent}</div>}
      </div>
    </Card>
  );
}
