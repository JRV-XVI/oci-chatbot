"use client"

import React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { clsx } from "clsx"

interface ProgressCircleProps {
  value: number // 0-100
  children?: React.ReactNode
  className?: string
  radius?: number
  color?: string
}

export const ProgressCircle: React.FC<ProgressCircleProps> = ({
  value,
  children,
  className,
  radius = 50,
  color = "#e76b36",
}) => {
  const normalizedValue = Math.min(Math.max(value, 0), 100)
  const chartSize = radius * 2 + 20
  const center = chartSize / 2
  
  const data = [
    { name: "completed", value: normalizedValue },
    { name: "remaining", value: 100 - normalizedValue },
  ]

  return (
    <div
      className={clsx("relative inline-flex items-center justify-center", className)}
      style={{ width: chartSize, height: chartSize }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx={center}
            cy={center}
            innerRadius={radius * 0.65}
            outerRadius={radius}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            <Cell fill={color} />
            <Cell fill="#2b3542" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center translate-x-[6px] translate-y-[2px]">
          {children}
        </div>
      )}
    </div>
  )
}
