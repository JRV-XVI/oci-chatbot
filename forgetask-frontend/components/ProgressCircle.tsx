"use client";

import styles from "./ProgressCircle.module.css";

type ProgressCircleVariant = "default" | "warning" | "success" | "error";

interface ProgressCircleProps {
  variant?: ProgressCircleVariant;
  value: number;
  radius?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function ProgressCircle({
  variant = "default",
  value,
  radius = 45,
}: ProgressCircleProps) {
  const safeValue = clamp(value, 0, 100);
  const strokeWidth = Math.max(6, Math.round(radius * 0.18));
  const normalizedRadius = Math.max(1, radius - strokeWidth / 2);
  const size = radius * 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const dashOffset = circumference * (1 - safeValue / 100);

  return (
    <div className={styles.root} role="img" aria-label={`Progreso ${safeValue.toFixed(0)}%`}>
      <svg
        className={styles.svg}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          className={styles.track}
          cx={size / 2}
          cy={size / 2}
          r={normalizedRadius}
          strokeWidth={strokeWidth}
        />
        <circle
          className={`${styles.indicator} ${styles[variant]}`}
          cx={size / 2}
          cy={size / 2}
          r={normalizedRadius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className={styles.value}>{safeValue.toFixed(0)}%</span>
    </div>
  );
}
