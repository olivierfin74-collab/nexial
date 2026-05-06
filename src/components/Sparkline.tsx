'use client'

import { useId } from 'react'

interface SparklineProps {
  data: number[]
  trend?: 'up' | 'down' | 'flat'
  width?: number
  height?: number
  className?: string
}

export function Sparkline({
  data,
  trend,
  width = 200,
  height = 40,
  className,
}: SparklineProps) {
  const gradientId = useId()

  // Placeholder when no usable data.
  if (data.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={className}
        aria-hidden="true"
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="var(--border-subtle)"
          strokeWidth={1}
        />
      </svg>
    )
  }

  const first = data[0]
  const last = data[data.length - 1]
  const resolvedTrend: 'up' | 'down' | 'flat' =
    trend ?? (last > first ? 'up' : last < first ? 'down' : 'flat')

  const strokeColor =
    resolvedTrend === 'down' ? 'var(--burgundy)' : 'var(--forest-green)'

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min

  const padding = 2
  const innerWidth = width - padding * 2
  const innerHeight = height - padding * 2

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * innerWidth
    const y =
      range === 0
        ? padding + innerHeight / 2
        : padding + innerHeight - ((value - min) / range) * innerHeight
    return { x, y }
  })

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ')

  const baselineY = (height - padding).toFixed(2)
  const firstX = points[0].x.toFixed(2)
  const lastX = points[points.length - 1].x.toFixed(2)
  const fillPath = `${linePath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`

  const lastPoint = points[points.length - 1]

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ color: strokeColor }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="80%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradientId})`} stroke="none" />
      <path
        d={linePath}
        stroke="currentColor"
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastPoint.x} cy={lastPoint.y} r={2.5} fill="currentColor" />
    </svg>
  )
}
