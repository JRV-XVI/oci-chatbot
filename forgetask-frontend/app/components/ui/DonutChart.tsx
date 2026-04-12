// Tremor DonutChart [v1.0.0]
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client"

import React from "react"
import { clsx, type ClassValue } from "clsx"
import {
  Pie,
  PieChart as ReChartsDonutChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
} from "recharts"
import { twMerge } from "tailwind-merge"

const chartColorMap = {
  blue: { bg: "bg-blue-500", fill: "fill-blue-500" },
  emerald: { bg: "bg-emerald-500", fill: "fill-emerald-500" },
  amber: { bg: "bg-amber-500", fill: "fill-amber-500" },
  rose: { bg: "bg-rose-500", fill: "fill-rose-500" },
  indigo: { bg: "bg-indigo-500", fill: "fill-indigo-500" },
  cyan: { bg: "bg-cyan-500", fill: "fill-cyan-500" },
  violet: { bg: "bg-violet-500", fill: "fill-violet-500" },
} as const

type ColorClassType = "bg" | "fill"

type AvailableChartColorsKeys = keyof typeof chartColorMap

const AvailableChartColors = Object.keys(
  chartColorMap,
) as AvailableChartColorsKeys[]

const getColorClassName = (
  color: AvailableChartColorsKeys,
  colorClassType: ColorClassType,
): string => chartColorMap[color]?.[colorClassType] ?? chartColorMap.blue[colorClassType]

const constructCategoryColors = (
  categories: string[],
  colors: AvailableChartColorsKeys[],
): Map<string, AvailableChartColorsKeys> => {
  const categoryColors = new Map<string, AvailableChartColorsKeys>()
  const palette = colors.length > 0 ? colors : AvailableChartColors

  categories.forEach((currentCategory, index) => {
    categoryColors.set(currentCategory, palette[index % palette.length])
  })

  return categoryColors
}

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

const sumNumericArray = (arr: number[]): number =>
  arr.reduce((sum, num) => sum + num, 0)

const parseData = (
  data: Record<string, any>[],
  categoryColors: Map<string, AvailableChartColorsKeys>,
  category: string,
) =>
  data.map((dataPoint) => ({
    ...dataPoint,
    color: categoryColors.get(dataPoint[category]) || AvailableChartColors[0],
    className: getColorClassName(
      categoryColors.get(dataPoint[category]) || AvailableChartColors[0],
      "fill",
    ),
  }))

const calculateDefaultLabel = (data: any[], valueKey: string): number =>
  sumNumericArray(data.map((dataPoint) => dataPoint[valueKey]))

const parseLabelInput = (
  labelInput: string | undefined,
  valueFormatter: (value: number) => string,
  data: any[],
  valueKey: string,
): string => labelInput || valueFormatter(calculateDefaultLabel(data, valueKey))

//#region Tooltip

type TooltipProps = Pick<ChartTooltipProps, "active" | "payload">

type PayloadItem = {
  category: string
  value: number
  color: AvailableChartColorsKeys
}

interface ChartTooltipProps {
  active: boolean | undefined
  payload: PayloadItem[]
  valueFormatter: (value: number) => string
}

const ChartTooltip = ({
  active,
  payload,
  valueFormatter,
}: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div
        className={cn(
          // base
          "rounded-md border text-sm shadow-md",
          // border color
          "border-gray-200 dark:border-gray-800",
          // background color
          "bg-white dark:bg-gray-950",
        )}
      >
        <div className={cn("space-y-1 px-4 py-2")}>
          {payload.map(({ value, category, color }, index) => (
            <div
              key={`id-${index}`}
              className="flex items-center justify-between space-x-8"
            >
              <div className="flex items-center space-x-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    getColorClassName(color, "bg"),
                  )}
                />
                <p
                  className={cn(
                    // base
                    "text-right whitespace-nowrap",
                    // text color
                    "text-gray-700 dark:text-gray-300",
                  )}
                >
                  {category}
                </p>
              </div>
              <p
                className={cn(
                  // base
                  "text-right font-medium whitespace-nowrap tabular-nums",
                  // text color
                  "text-gray-900 dark:text-gray-50",
                )}
              >
                {valueFormatter(value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

const renderInactiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, className } =
    props

  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      startAngle={startAngle}
      endAngle={endAngle}
      className={className}
      fill=""
      opacity={0.3}
      style={{ outline: "none" }}
    />
  )
}

type DonutChartVariant = "donut" | "pie"

type BaseEventProps = {
  eventType: "sector"
  categoryClicked: string
  [key: string]: number | string
}

type DonutChartEventProps = BaseEventProps | null | undefined

interface DonutChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: Record<string, any>[]
  category: string
  value: string
  colors?: AvailableChartColorsKeys[]
  variant?: DonutChartVariant
  valueFormatter?: (value: number) => string
  label?: string
  showLabel?: boolean
  showTooltip?: boolean
  onValueChange?: (value: DonutChartEventProps) => void
  tooltipCallback?: (tooltipCallbackContent: TooltipProps) => void
  customTooltip?: React.ComponentType<TooltipProps>
}

const DonutChart = React.forwardRef<HTMLDivElement, DonutChartProps>(
  (
    {
      data = [],
      value,
      category,
      colors = AvailableChartColors,
      variant = "donut",
      valueFormatter = (value: number) => value.toString(),
      label,
      showLabel = false,
      showTooltip = true,
      onValueChange,
      tooltipCallback,
      customTooltip,
      className,
      ...other
    },
    forwardedRef,
  ) => {
    const CustomTooltip = customTooltip
    const [activeIndex, setActiveIndex] = React.useState<number | undefined>(
      undefined,
    )
    const isDonut = variant === "donut"
    const parsedLabelInput = parseLabelInput(label, valueFormatter, data, value)

    const categories = Array.from(new Set(data.map((item) => item[category])))
    const categoryColors = constructCategoryColors(categories, colors)

    const prevActiveRef = React.useRef<boolean | undefined>(undefined)
    const prevCategoryRef = React.useRef<string | undefined>(undefined)

    const handleShapeClick = (
      data: any,
      index: number,
      event: React.MouseEvent,
    ) => {
      event.stopPropagation()
      if (!onValueChange) return

      if (activeIndex === index) {
        setActiveIndex(undefined)
        onValueChange(null)
      } else {
        setActiveIndex(index)
        onValueChange({
          eventType: "sector",
          categoryClicked: data.payload[category],
          ...data.payload,
        })
      }
    }

    return (
      <div
        ref={forwardedRef}
        className={cn("h-40 w-40", className)}
        tremor-id="tremor-raw"
        {...other}
      >
        <ResponsiveContainer className="size-full">
          <ReChartsDonutChart
            onClick={
              onValueChange && activeIndex !== undefined
                ? () => {
                    setActiveIndex(undefined)
                    onValueChange(null)
                  }
                : undefined
            }
            margin={{ top: 0, left: 0, right: 0, bottom: 0 }}
          >
            {showLabel && isDonut && (
              <text
                className="fill-gray-700 dark:fill-gray-300"
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {parsedLabelInput}
              </text>
            )}
            <Pie
              className={cn(
                "stroke-white dark:stroke-gray-950 [&_.recharts-pie-sector]:outline-hidden",
                onValueChange ? "cursor-pointer" : "cursor-default",
              )}
              data={parseData(data, categoryColors, category)}
              cx="50%"
              cy="50%"
              startAngle={90}
              endAngle={-270}
              innerRadius={isDonut ? "75%" : "0%"}
              outerRadius="100%"
              stroke=""
              strokeLinejoin="round"
              dataKey={value}
              nameKey={category}
              isAnimationActive={false}
              onClick={handleShapeClick}
              inactiveShape={renderInactiveShape}
              style={{ outline: "none" }}
            />
            {showTooltip && (
              <Tooltip
                wrapperStyle={{ outline: "none" }}
                isAnimationActive={false}
                content={({ active, payload }) => {
                  const cleanPayload = payload
                    ? payload.map((item: any) => ({
                        category: item.payload[category],
                        value: item.value,
                        color: categoryColors.get(
                          item.payload[category],
                        ) as AvailableChartColorsKeys,
                      }))
                    : []

                  const payloadCategory: string = cleanPayload[0]?.category

                  if (
                    tooltipCallback &&
                    (active !== prevActiveRef.current ||
                      payloadCategory !== prevCategoryRef.current)
                  ) {
                    tooltipCallback({
                      active,
                      payload: cleanPayload,
                    })
                    prevActiveRef.current = active
                    prevCategoryRef.current = payloadCategory
                  }

                  return showTooltip && active ? (
                    CustomTooltip ? (
                      <CustomTooltip active={active} payload={cleanPayload} />
                    ) : (
                      <ChartTooltip
                        active={active}
                        payload={cleanPayload}
                        valueFormatter={valueFormatter}
                      />
                    )
                  ) : null
                }}
              />
            )}
          </ReChartsDonutChart>
        </ResponsiveContainer>
      </div>
    )
  },
)

DonutChart.displayName = "DonutChart"

export {
  AvailableChartColors,
  constructCategoryColors,
  DonutChart,
  getColorClassName,
  type AvailableChartColorsKeys,
  type DonutChartEventProps,
  type TooltipProps,
}