import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBasicStats, getDateRange } from '../lib/stats'
import type { BasicStats, StatsDays } from '../lib/stats'

type StatItem = {
  label: string
  value: string
}

type StatCardProps = {
  title: string
  items: StatItem[]
}

const rangeOptions: StatsDays[] = [7, 30]

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '统计加载失败'
}

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits,
  }).format(value)
}

function StatCard({ title, items }: StatCardProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div className="rounded-md bg-slate-50 px-3 py-3" key={item.label}>
            <dt className="text-sm text-slate-600">{item.label}</dt>
            <dd className="mt-1 text-2xl font-semibold text-slate-950">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function buildStrengthItems(stats: BasicStats | null): StatItem[] {
  return [
    { label: '训练天数', value: formatNumber(stats?.strengthTrainingDays ?? 0) },
    { label: '训练会话数', value: formatNumber(stats?.strengthSessionCount ?? 0) },
    { label: '动作记录数', value: formatNumber(stats?.strengthExerciseCount ?? 0) },
    { label: '训练组数', value: formatNumber(stats?.strengthSetCount ?? 0) },
    { label: '训练总容量', value: formatNumber(stats?.strengthTotalVolume ?? 0, 1) },
  ]
}

function buildCardioItems(stats: BasicStats | null): StatItem[] {
  return [
    { label: '有氧记录数', value: formatNumber(stats?.cardioRecordCount ?? 0) },
    { label: '有氧总时长（分钟）', value: formatNumber(stats?.cardioTotalMinutes ?? 0, 1) },
    { label: '有氧总距离（km）', value: formatNumber(stats?.cardioTotalDistanceKm ?? 0, 2) },
    { label: '有氧总消耗（kcal）', value: formatNumber(stats?.cardioTotalCalories ?? 0, 1) },
  ]
}

function buildMealItems(stats: BasicStats | null): StatItem[] {
  return [
    { label: '餐次记录数', value: formatNumber(stats?.mealRecordCount ?? 0) },
    { label: '食物明细数', value: formatNumber(stats?.mealItemCount ?? 0) },
    { label: '摄入总重量（g）', value: formatNumber(stats?.mealTotalAmountG ?? 0, 1) },
    { label: '总热量（kcal）', value: formatNumber(stats?.mealTotalCalories ?? 0, 1) },
    { label: '总蛋白质（g）', value: formatNumber(stats?.mealTotalProteinG ?? 0, 1) },
    { label: '总碳水（g）', value: formatNumber(stats?.mealTotalCarbsG ?? 0, 1) },
    { label: '总脂肪（g）', value: formatNumber(stats?.mealTotalFatG ?? 0, 1) },
  ]
}

function StatsPage() {
  const [days, setDays] = useState<StatsDays>(7)
  const [stats, setStats] = useState<BasicStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const dateRange = stats ?? getDateRange(days)

  useEffect(() => {
    let isMounted = true

    async function loadStats() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const nextStats = await getBasicStats(days)

        if (isMounted) {
          setStats(nextStats)
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

    loadStats()

    return () => {
      isMounted = false
    }
  }, [days])

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Fitness Tracker MVP</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">基础统计</h1>
            <p className="mt-2 text-sm text-slate-600">
              统计范围：{dateRange.startDate} 至 {dateRange.endDate}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              to="/"
            >
              返回仪表盘
            </Link>
            <Link
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              to="/today"
            >
              返回今日记录
            </Link>
            <Link
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              to="/history"
            >
              查看历史记录
            </Link>
          </div>
        </div>

        <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-700">统计范围选择</p>
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

        {isLoading ? <p className="mb-4 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">统计加载中...</p> : null}
        {errorMessage ? <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}

        <div className="grid gap-5">
          <StatCard items={buildStrengthItems(stats)} title="力量训练统计" />
          <StatCard items={buildCardioItems(stats)} title="有氧统计" />
          <StatCard items={buildMealItems(stats)} title="饮食统计" />
        </div>
      </div>
    </main>
  )
}

export default StatsPage
