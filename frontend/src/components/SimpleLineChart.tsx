export type SimpleLineChartDatum = Record<string, string | number | null>

type SimpleLineChartProps = {
  title: string
  data: SimpleLineChartDatum[]
  xKey: string
  yKey: string
  unit: string
  emptyText: string
  precision?: number
}

type ChartPoint = {
  x: number
  y: number
  value: number
  label: string
}

function toMaybeNumber(value: string | number | null | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : null
  }

  return null
}

function formatValue(value: number | null, precision: number) {
  if (value === null) {
    return '--'
  }

  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  }).format(value)
}

function buildLineSegments(points: Array<ChartPoint | null>) {
  const segments: ChartPoint[][] = []
  let currentSegment: ChartPoint[] = []

  points.forEach((point) => {
    if (point) {
      currentSegment.push(point)
      return
    }

    if (currentSegment.length > 0) {
      segments.push(currentSegment)
      currentSegment = []
    }
  })

  if (currentSegment.length > 0) {
    segments.push(currentSegment)
  }

  return segments
}

function SimpleLineChart({
  title,
  data,
  xKey,
  yKey,
  unit,
  emptyText,
  precision = 1,
}: SimpleLineChartProps) {
  const width = 720
  const height = 260
  const paddingTop = 20
  const paddingRight = 20
  const paddingBottom = 36
  const paddingLeft = 28
  const innerWidth = width - paddingLeft - paddingRight
  const innerHeight = height - paddingTop - paddingBottom

  const normalizedRows = data.map((row) => ({
    label: String(row[xKey] ?? ''),
    value: toMaybeNumber(row[yKey]),
  }))
  const validRows = normalizedRows.filter(
    (row): row is { label: string; value: number } => row.value !== null,
  )
  const hasValues = validRows.length > 0

  const latestValue = validRows.length > 0 ? validRows[validRows.length - 1].value : null
  const maxValue = hasValues ? Math.max(...validRows.map((row) => row.value)) : null
  const minValue = hasValues ? Math.min(...validRows.map((row) => row.value)) : null

  const chartPoints = hasValues
    ? normalizedRows.map((row, index) => {
        if (row.value === null) {
          return null
        }

        const x =
          normalizedRows.length <= 1
            ? paddingLeft + innerWidth / 2
            : paddingLeft + (index / (normalizedRows.length - 1)) * innerWidth

        let y = paddingTop + innerHeight / 2

        if (maxValue !== null && minValue !== null && maxValue !== minValue) {
          const ratio = (row.value - minValue) / (maxValue - minValue)
          y = paddingTop + innerHeight - ratio * innerHeight
        }

        return {
          x,
          y,
          value: row.value,
          label: row.label,
        } satisfies ChartPoint
      })
    : []

  const lineSegments = buildLineSegments(chartPoints)
  const latestChartPoint = [...chartPoints].reverse().find(
    (point): point is ChartPoint => point !== null,
  )

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">单位：{unit}</p>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-md bg-slate-50 px-3 py-2">
            <dt className="text-slate-500">最大值</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {formatValue(maxValue, precision)}
            </dd>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2">
            <dt className="text-slate-500">最小值</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {formatValue(minValue, precision)}
            </dd>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2">
            <dt className="text-slate-500">最近值</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {formatValue(latestValue, precision)}
            </dd>
          </div>
        </dl>
      </div>

      {!hasValues ? (
        <div className="mt-5 rounded-md bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          {emptyText}
        </div>
      ) : (
        <div className="mt-5 overflow-hidden">
          <svg
            aria-label={title}
            className="h-64 w-full"
            role="img"
            viewBox={`0 0 ${width} ${height}`}
          >
            <line
              stroke="#cbd5e1"
              strokeWidth="1"
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={paddingTop + innerHeight}
              y2={paddingTop + innerHeight}
            />
            <line
              stroke="#e2e8f0"
              strokeDasharray="4 4"
              strokeWidth="1"
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={paddingTop + innerHeight / 2}
              y2={paddingTop + innerHeight / 2}
            />

            {lineSegments.map((segment, index) => (
              <polyline
                fill="none"
                key={index}
                points={segment.map((point) => `${point.x},${point.y}`).join(' ')}
                stroke="#0f766e"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
            ))}

            {chartPoints.map((point, index) =>
              point ? (
                <circle
                  cx={point.x}
                  cy={point.y}
                  fill="#0f766e"
                  key={index}
                  r="3.5"
                />
              ) : null,
            )}

            {latestChartPoint ? (
              <circle
                cx={latestChartPoint.x}
                cy={latestChartPoint.y}
                fill="#ffffff"
                r="6"
                stroke="#0f766e"
                strokeWidth="3"
              />
            ) : null}

            <text
              fill="#64748b"
              fontSize="12"
              textAnchor="start"
              x={paddingLeft}
              y={height - 10}
            >
              {normalizedRows[0]?.label ?? ''}
            </text>
            <text
              fill="#64748b"
              fontSize="12"
              textAnchor="end"
              x={width - paddingRight}
              y={height - 10}
            >
              {normalizedRows[normalizedRows.length - 1]?.label ?? ''}
            </text>
          </svg>
        </div>
      )}
    </section>
  )
}

export default SimpleLineChart
