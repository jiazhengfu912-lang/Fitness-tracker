import type { FormEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteBodyMetric,
  getBodyMetricByDate,
  listMyBodyMetrics,
  upsertBodyMetric,
} from '../lib/bodyMetrics'
import type { BodyMetric } from '../lib/bodyMetrics'

function getTodayDateString() {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败'
}

function getOptionalText(value: string | null | undefined, fallback: string) {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : fallback
}

function formatOptionalNumber(value: number | null) {
  return value === null ? '未填写' : String(value)
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return null
  }

  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue)) {
    throw new Error('请输入有效数字')
  }

  return parsedValue
}

function WeightPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString)
  const [metrics, setMetrics] = useState<BodyMetric[]>([])
  const [weightKg, setWeightKg] = useState('')
  const [bodyFatPercent, setBodyFatPercent] = useState('')
  const [waistCm, setWaistCm] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const fillForm = useCallback((metric: BodyMetric | null) => {
    setWeightKg(metric ? String(metric.weight_kg) : '')
    setBodyFatPercent(metric?.body_fat_percent !== null && metric?.body_fat_percent !== undefined ? String(metric.body_fat_percent) : '')
    setWaistCm(metric?.waist_cm !== null && metric?.waist_cm !== undefined ? String(metric.waist_cm) : '')
    setNotes(metric?.notes ?? '')
  }, [])

  const loadMetrics = useCallback(async () => {
    const nextMetrics = await listMyBodyMetrics()
    setMetrics(nextMetrics)
  }, [])

  const loadMetricForDate = useCallback(
    async (metricDate: string) => {
      const metric = await getBodyMetricByDate(metricDate)
      fillForm(metric)
    },
    [fillForm],
  )

  const loadPageData = useCallback(
    async (metricDate: string) => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        await Promise.all([loadMetrics(), loadMetricForDate(metricDate)])
      } catch (error) {
        setErrorMessage(getErrorMessage(error))
      } finally {
        setIsLoading(false)
      }
    },
    [loadMetricForDate, loadMetrics],
  )

  useEffect(() => {
    loadPageData(selectedDate)
  }, [loadPageData, selectedDate])

  async function handleSaveMetric(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    const parsedWeightKg = Number(weightKg)

    if (!weightKg.trim() || !Number.isFinite(parsedWeightKg) || parsedWeightKg <= 0) {
      setErrorMessage('体重必须大于 0')
      setIsSubmitting(false)
      return
    }

    try {
      const parsedBodyFatPercent = parseOptionalNumber(bodyFatPercent)
      const parsedWaistCm = parseOptionalNumber(waistCm)

      if (parsedBodyFatPercent !== null && (parsedBodyFatPercent < 0 || parsedBodyFatPercent > 100)) {
        throw new Error('体脂率必须在 0 到 100 之间')
      }

      if (parsedWaistCm !== null && parsedWaistCm <= 0) {
        throw new Error('腰围必须大于 0')
      }

      await upsertBodyMetric({
        metric_date: selectedDate,
        weight_kg: parsedWeightKg,
        body_fat_percent: parsedBodyFatPercent,
        waist_cm: parsedWaistCm,
        notes: notes.trim() || null,
      })

      setMessage('体重记录已保存')
      await loadPageData(selectedDate)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteMetric(id: string) {
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await deleteBodyMetric(id)
      setMessage('体重记录已删除')
      await loadPageData(selectedDate)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Fitness Tracker MVP</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">体重记录</h1>
          <p className="mt-2 text-sm text-slate-600">按日期保存体重、体脂率和腰围。</p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          to="/"
        >
          返回仪表盘
        </Link>
      </div>

      {message ? <p className="mb-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      {errorMessage ? <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">保存体重记录</h2>

          <form className="mt-4 grid gap-3" onSubmit={handleSaveMetric}>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">日期</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                onChange={(event) => setSelectedDate(event.target.value)}
                type="date"
                value={selectedDate}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">体重 kg</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                min="0"
                onChange={(event) => setWeightKg(event.target.value)}
                step="0.1"
                type="number"
                value={weightKg}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">体脂率 %（可选）</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                min="0"
                onChange={(event) => setBodyFatPercent(event.target.value)}
                step="0.1"
                type="number"
                value={bodyFatPercent}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">腰围 cm（可选）</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                min="0"
                onChange={(event) => setWaistCm(event.target.value)}
                step="0.1"
                type="number"
                value={waistCm}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">备注（可选）</span>
              <textarea
                className="min-h-24 rounded-md border border-slate-300 px-3 py-2"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="例如 早起空腹"
                value={notes}
              />
            </label>
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSubmitting}
              type="submit"
            >
              保存记录
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">最近体重记录</h2>
          {isLoading ? <p className="mt-4 text-sm text-slate-600">加载中...</p> : null}
          {!isLoading && metrics.length === 0 ? <p className="mt-4 text-sm text-slate-600">暂时还没有体重记录。</p> : null}

          <ul className="mt-4 grid gap-3">
            {metrics.map((metric) => (
              <li
                className="flex flex-col gap-3 rounded-md border border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between"
                key={metric.id}
              >
                <div>
                  <p className="font-medium">{metric.metric_date}</p>
                  <p className="mt-1 text-sm text-slate-600">体重：{metric.weight_kg} kg</p>
                  <p className="mt-1 text-sm text-slate-600">体脂率：{formatOptionalNumber(metric.body_fat_percent)}</p>
                  <p className="mt-1 text-sm text-slate-600">腰围：{formatOptionalNumber(metric.waist_cm)}</p>
                  <p className="mt-1 text-sm text-slate-600">备注：{getOptionalText(metric.notes, '无')}</p>
                </div>
                <button
                  className="self-start rounded-md border border-red-200 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300 sm:self-auto"
                  disabled={isSubmitting}
                  onClick={() => handleDeleteMetric(metric.id)}
                  type="button"
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}

export default WeightPage
