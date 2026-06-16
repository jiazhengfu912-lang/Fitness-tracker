import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SimpleLineChart from '../components/SimpleLineChart'
import { getTrendData, getTrendDateRange, type DailyTrendPoint, type TrendDays } from '../lib/trends'

const rangeOptions: TrendDays[] = [7, 30, 90]

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '趋势数据加载失败'
}

function TrendsPage() {
  const [days, setDays] = useState<TrendDays>(30)
  const [trendData, setTrendData] = useState<DailyTrendPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const dateRange = useMemo(() => getTrendDateRange(days), [days])

  useEffect(() => {
    let isMounted = true

    async function loadTrendData() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const nextTrendData = await getTrendData(days)

        if (isMounted) {
          setTrendData(nextTrendData)
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getErrorMessage(error))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadTrendData()

    return () => {
      isMounted = false
    }
  }, [days])

  const hasAnyData = trendData.some(
    (point) =>
      point.weightKg !== null ||
      point.strengthVolume > 0 ||
      point.cardioMinutes > 0 ||
      point.mealCalories > 0 ||
      point.mealProteinG > 0,
  )

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Fitness Tracker MVP</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">趋势图表</h1>
          <p className="mt-2 text-sm text-slate-600">
            统计范围：{dateRange.startDate} 至 {dateRange.endDate}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            to="/"
          >
            返回仪表盘
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            to="/stats"
          >
            返回统计页
          </Link>
        </div>
      </div>

      <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-700">时间范围选择</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {rangeOptions.map((option) => (
            <button
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                days === option
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              key={option}
              onClick={() => setDays(option)}
              type="button"
            >
              最近 {option} 天
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <p className="mb-4 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">
          趋势数据加载中...
        </p>
      ) : null}
      {errorMessage ? (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
      {!isLoading && !errorMessage && !hasAnyData ? (
        <p className="mb-4 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">
          当前时间范围内还没有可展示的趋势数据。
        </p>
      ) : null}

      <div className="grid gap-5">
        <SimpleLineChart
          data={trendData}
          emptyText="当前时间范围内暂无体重数据"
          precision={1}
          title="体重趋势"
          unit="kg"
          xKey="date"
          yKey="weightKg"
        />
        <SimpleLineChart
          data={trendData}
          emptyText="当前时间范围内暂无力量训练容量数据"
          precision={1}
          title="力量训练容量趋势"
          unit="kg"
          xKey="date"
          yKey="strengthVolume"
        />
        <SimpleLineChart
          data={trendData}
          emptyText="当前时间范围内暂无有氧时长数据"
          precision={0}
          title="有氧时长趋势"
          unit="min"
          xKey="date"
          yKey="cardioMinutes"
        />
        <SimpleLineChart
          data={trendData}
          emptyText="当前时间范围内暂无热量摄入数据"
          precision={0}
          title="热量摄入趋势"
          unit="kcal"
          xKey="date"
          yKey="mealCalories"
        />
        <SimpleLineChart
          data={trendData}
          emptyText="当前时间范围内暂无蛋白质摄入数据"
          precision={1}
          title="蛋白质摄入趋势"
          unit="g"
          xKey="date"
          yKey="mealProteinG"
        />
      </div>
    </>
  )
}

export default TrendsPage
