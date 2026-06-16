import { useCallback, useEffect, useMemo, useState } from 'react'
import { getHistoryByDate, getTodayDateString } from '../lib/history'
import type { HistoryByDate } from '../lib/history'
import type {
  MealItem,
  StrengthWorkoutExercise,
  StrengthWorkoutSet,
} from '../types/database'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '历史记录加载失败'
}

function getOptionalText(value: string | null | undefined, fallback: string) {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : fallback
}

function formatNumber(value: number | string | null | undefined, maximumFractionDigits = 1) {
  const parsedValue = typeof value === 'number' ? value : Number(value ?? 0)

  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits,
  }).format(Number.isFinite(parsedValue) ? parsedValue : 0)
}

function HistoryPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString)
  const [history, setHistory] = useState<HistoryByDate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const loadHistory = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const nextHistory = await getHistoryByDate(selectedDate)
      setHistory(nextHistory)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const exercisesBySessionId = useMemo(() => {
    const nextMap = new Map<string, StrengthWorkoutExercise[]>()

    for (const exercise of history?.strengthExercises ?? []) {
      const currentExercises = nextMap.get(exercise.session_id) ?? []
      currentExercises.push(exercise)
      nextMap.set(exercise.session_id, currentExercises)
    }

    return nextMap
  }, [history])

  const setsByExerciseId = useMemo(() => {
    const nextMap = new Map<string, StrengthWorkoutSet[]>()

    for (const set of history?.strengthSets ?? []) {
      const currentSets = nextMap.get(set.workout_exercise_id) ?? []
      currentSets.push(set)
      nextMap.set(set.workout_exercise_id, currentSets)
    }

    return nextMap
  }, [history])

  const mealItemsByMealRecordId = useMemo(() => {
    const nextMap = new Map<string, MealItem[]>()

    for (const item of history?.mealItems ?? []) {
      const currentItems = nextMap.get(item.meal_record_id) ?? []
      currentItems.push(item)
      nextMap.set(item.meal_record_id, currentItems)
    }

    return nextMap
  }, [history])

  const hasNoData =
    !isLoading &&
    !errorMessage &&
    history !== null &&
    history.strengthSessions.length === 0 &&
    history.cardioRecords.length === 0 &&
    history.mealRecords.length === 0

  return (
    <>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Fitness Tracker MVP</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">历史记录</h1>
            <p className="mt-2 text-sm text-slate-600">当前选中日期：{selectedDate}</p>
          </div>
        </div>

        <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <label className="grid gap-2 text-sm sm:max-w-xs">
            <span className="font-medium text-slate-700">选择日期</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              onChange={(event) => setSelectedDate(event.target.value)}
              type="date"
              value={selectedDate}
            />
          </label>
        </section>

        {isLoading ? <p className="mb-4 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">历史记录加载中...</p> : null}
        {errorMessage ? <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}
        {hasNoData ? <p className="mb-4 rounded-md bg-white px-4 py-3 text-sm text-slate-600">该日期暂无训练、有氧或饮食记录。</p> : null}

        <div className="grid gap-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">力量训练历史</h2>
            {!isLoading && !errorMessage && history?.strengthSessions.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">该日期暂无力量训练记录。</p>
            ) : null}
            <div className="mt-4 grid gap-4">
              {history?.strengthSessions.map((session) => {
                const exercises = exercisesBySessionId.get(session.id) ?? []

                return (
                  <article className="rounded-md border border-slate-200 p-4" key={session.id}>
                    <h3 className="font-semibold">{getOptionalText(session.title, '未命名训练')}</h3>
                    <p className="mt-1 text-sm text-slate-600">备注：{getOptionalText(session.notes, '无')}</p>

                    {exercises.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-600">该训练会话暂无动作。</p>
                    ) : null}
                    <div className="mt-3 grid gap-3">
                      {exercises.map((exercise) => {
                        const sets = setsByExerciseId.get(exercise.id) ?? []

                        return (
                          <div className="rounded-md bg-slate-50 p-3" key={exercise.id}>
                            <p className="font-medium">{exercise.exercise_name_snapshot}</p>
                            <p className="mt-1 text-sm text-slate-600">备注：{getOptionalText(exercise.notes, '无')}</p>
                            {sets.length === 0 ? (
                              <p className="mt-2 text-sm text-slate-600">暂无训练组。</p>
                            ) : null}
                            <ul className="mt-2 grid gap-2">
                              {sets.map((set) => (
                                <li className="text-sm text-slate-700" key={set.id}>
                                  第 {set.set_number} 组：{formatNumber(set.weight_kg)} kg x {formatNumber(set.reps, 0)} 次
                                  {set.is_warmup ? '，热身组' : ''}
                                  {set.notes ? `，备注：${set.notes}` : ''}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      })}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">有氧历史</h2>
            {!isLoading && !errorMessage && history?.cardioRecords.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">该日期暂无有氧记录。</p>
            ) : null}
            <ul className="mt-4 grid gap-3">
              {history?.cardioRecords.map((record) => (
                <li className="rounded-md border border-slate-200 p-4" key={record.id}>
                  <p className="font-medium">{record.activity_type}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    时长：{formatNumber(record.duration_minutes, 1)} 分钟
                    {record.distance_km !== null ? `，距离：${formatNumber(record.distance_km, 2)} km` : ''}
                    {record.calories_burned !== null ? `，消耗：${formatNumber(record.calories_burned, 1)} kcal` : ''}
                    {record.intensity ? `，强度：${record.intensity}` : ''}
                  </p>
                  {record.notes ? <p className="mt-1 text-sm text-slate-600">备注：{record.notes}</p> : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">饮食历史</h2>
            {!isLoading && !errorMessage && history?.mealRecords.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">该日期暂无饮食记录。</p>
            ) : null}
            <div className="mt-4 grid gap-4">
              {history?.mealRecords.map((record) => {
                const mealItems = mealItemsByMealRecordId.get(record.id) ?? []

                return (
                  <article className="rounded-md border border-slate-200 p-4" key={record.id}>
                    <h3 className="font-semibold">{record.meal_type}</h3>
                    <p className="mt-1 text-sm text-slate-600">备注：{getOptionalText(record.notes, '无')}</p>
                    {mealItems.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-600">该餐次暂无食物明细。</p>
                    ) : null}
                    <ul className="mt-3 grid gap-2">
                      {mealItems.map((item) => (
                        <li className="rounded-md bg-slate-50 p-3 text-sm text-slate-700" key={item.id}>
                          <p className="font-medium text-slate-900">{item.food_name_snapshot}</p>
                          <p className="mt-1">
                            摄入：{formatNumber(item.amount_g, 1)} g
                            {item.calories_snapshot !== null ? `，热量：${formatNumber(item.calories_snapshot, 1)} kcal` : ''}
                            {item.protein_g_snapshot !== null ? `，蛋白质：${formatNumber(item.protein_g_snapshot, 1)} g` : ''}
                            {item.carbs_g_snapshot !== null ? `，碳水：${formatNumber(item.carbs_g_snapshot, 1)} g` : ''}
                            {item.fat_g_snapshot !== null ? `，脂肪：${formatNumber(item.fat_g_snapshot, 1)} g` : ''}
                          </p>
                          {item.notes ? <p className="mt-1">备注：{item.notes}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </article>
                )
              })}
            </div>
          </section>
        </div>
    </>
  )
}

export default HistoryPage
