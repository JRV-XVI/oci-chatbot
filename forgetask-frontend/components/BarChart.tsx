"use client";

import { memo, useMemo } from "react";
import styles from "./BarChart.module.css";

export interface BarChartValueChange {
  index: string;
  category: string;
  value: number;
}

interface BarChartProps {
  data: Array<Record<string, string | number>>;
  className?: string;
  index: string;
  colors?: string[];
  categories: string[];
  valueFormatter?: (value: number) => string;
  onValueChange?: (value: BarChartValueChange | null) => void;
  yAxisWidth?: number;
  orientation?: "horizontal" | "vertical";
}

const COLOR_CLASS_MAP: Record<string, string> = {
  blue: styles.blue,
  emerald: styles.emerald,
  violet: styles.violet,
  cyan: styles.cyan,
  fuchsia: styles.fuchsia,
  pink: styles.pink,
  amber: styles.amber,
  orange: styles.orange,
  red: styles.red,
  orangeSoft: styles.orangeSoft,
  orangeDeep: styles.orangeDeep,
  slate: styles.slate,
  slateLight: styles.slateLight,
  slateDim: styles.slateDim,
};

function formatDefault(value: number): string {
  return Intl.NumberFormat("en-US").format(value);
}

function resolveColorClass(colorName?: string): string {
  if (!colorName) {
    return styles.blue;
  }

  return COLOR_CLASS_MAP[colorName] ?? styles.blue;
}

function resolveLabelWidthClass(yAxisWidth: number): string {
  if (yAxisWidth <= 48) {
    return styles.labelW48;
  }

  if (yAxisWidth <= 64) {
    return styles.labelW64;
  }

  if (yAxisWidth <= 80) {
    return styles.labelW80;
  }

  if (yAxisWidth <= 96) {
    return styles.labelW96;
  }

  if (yAxisWidth <= 120) {
    return styles.labelW120;
  }

  return styles.labelW140;
}

function BarChartComponent({
  data,
  className,
  index,
  colors = ["blue"],
  categories,
  valueFormatter = formatDefault,
  onValueChange,
  yAxisWidth = 120,
  orientation = "horizontal",
}: BarChartProps) {
  const labelWidthClass = useMemo(() => resolveLabelWidthClass(yAxisWidth), [yAxisWidth]);

  const maxValue = useMemo(() => {
    const flat = data.flatMap((row) =>
      categories.map((category) => Number(row[category] ?? 0))
    );
    const max = flat.reduce((acc, value) => (value > acc ? value : acc), 0);
    return max > 0 ? max : 1;
  }, [categories, data]);

  if (data.length === 0 || categories.length === 0) {
    return <p className={styles.empty}>No hay datos para esta grafica.</p>;
  }

  return (
    <div className={`${styles.chart} ${className ?? ""}`.trim()}>
      <div className={styles.legend}>
        {categories.map((category, idx) => {
          const colorClass = resolveColorClass(colors[idx % colors.length]);
          return (
            <span key={category} className={styles.legendItem}>
              <span className={`${styles.legendDot} ${colorClass}`} />
              {category}
            </span>
          );
        })}
      </div>

      {orientation === "vertical" ? (
        <div className={styles.verticalRows}>
          {data.map((row, rowIndex) => {
            const indexValue = String(row[index] ?? `Row ${rowIndex + 1}`);

            return (
              <div key={`${indexValue}-${rowIndex}`} className={styles.verticalRow}>
                <span className={styles.verticalIndex} title={indexValue}>
                  {indexValue}
                </span>

                <div className={styles.verticalBars}>
                  {categories.map((category, idx) => {
                    const value = Number(row[category] ?? 0);
                    const safeValue = Number.isFinite(value) && value > 0 ? value : 0;
                    const colorClass = resolveColorClass(colors[idx % colors.length]);
                    const normalizedHeight = Math.max(0, (safeValue / maxValue) * 100);
                    const yOffset = 100 - normalizedHeight;
                    const label = `${indexValue} - ${category}: ${valueFormatter(safeValue)}`;

                    return (
                      <div key={`${indexValue}-${category}`} className={styles.verticalBarItem}>
                        <span className={styles.verticalValue}>{valueFormatter(safeValue)}</span>
                        <button
                          type="button"
                          className={`${styles.verticalBarButton} ${colorClass}`}
                          title={label}
                          aria-label={label}
                          onClick={() => onValueChange?.({ index: indexValue, category, value: safeValue })}
                          onMouseEnter={() => onValueChange?.({ index: indexValue, category, value: safeValue })}
                          onMouseLeave={() => onValueChange?.(null)}
                          onFocus={() => onValueChange?.({ index: indexValue, category, value: safeValue })}
                          onBlur={() => onValueChange?.(null)}
                        >
                          <svg
                            className={styles.verticalSvg}
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                          >
                            <rect
                              className={styles.verticalRect}
                              x="0"
                              y={yOffset}
                              width="100"
                              height={normalizedHeight}
                              rx="8"
                              ry="8"
                            />
                          </svg>
                          <span className={styles.srOnly}>{label}</span>
                        </button>
                        <span className={styles.verticalCategory} title={category}>{category}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {orientation === "horizontal"
        ? data.map((row, rowIndex) => {
            const indexValue = String(row[index] ?? `Row ${rowIndex + 1}`);
            return (
              <div
                key={`${indexValue}-${rowIndex}`}
                className={`${styles.row} ${labelWidthClass}`}
              >
                <span className={styles.index} title={indexValue}>
                  {indexValue}
                </span>

                <div className={styles.bars}>
                  {categories.map((category, idx) => {
                    const value = Number(row[category] ?? 0);
                    const safeValue = Number.isFinite(value) && value > 0 ? value : 0;
                    const colorClass = resolveColorClass(colors[idx % colors.length]);
                    const label = `${indexValue} - ${category}: ${valueFormatter(safeValue)}`;

                    return (
                      <div key={`${indexValue}-${category}`}>
                        <div className={styles.barHeader}>
                          <span className={styles.barCategory} title={category}>{category}</span>
                          <span className={styles.barValue}>{valueFormatter(safeValue)}</span>
                        </div>
                        <button
                          type="button"
                          className={styles.barButton}
                          title={label}
                          aria-label={label}
                          onClick={() => onValueChange?.({ index: indexValue, category, value: safeValue })}
                          onMouseEnter={() => onValueChange?.({ index: indexValue, category, value: safeValue })}
                          onMouseLeave={() => onValueChange?.(null)}
                          onFocus={() => onValueChange?.({ index: indexValue, category, value: safeValue })}
                          onBlur={() => onValueChange?.(null)}
                        >
                          <progress
                            className={`${styles.progress} ${colorClass}`}
                            value={safeValue}
                            max={maxValue}
                          />
                          <span className={styles.srOnly}>{label}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        : null}
    </div>
  );
}

export const BarChart = memo(BarChartComponent);
