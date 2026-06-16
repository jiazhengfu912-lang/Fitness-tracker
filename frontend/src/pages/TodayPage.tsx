import type { FormEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createCardioRecord,
  deleteCardioRecord,
  listMyCardioRecords,
} from '../lib/cardio'
import type { CardioIntensity } from '../lib/cardio'
import {
  createMealRecord,
  deleteMealRecord,
  listMyMealRecords,
} from '../lib/meal'
import {
  createWorkoutSession,
  deleteWorkoutSession,
  listMyWorkoutSessions,
} from '../lib/workout'
import type { CardioRecord, MealRecord, MealType, StrengthWorkoutSession } from '../types/database'

const mealTypeOptions: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

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

function TodayPage() {
  const [today] = useState(getTodayDateString)
  const [workoutSessions, setWorkoutSessions] = useState<StrengthWorkoutSession[]>([])
  const [cardioRecords, setCardioRecords] = useState<CardioRecord[]>([])
  const [mealRecords, setMealRecords] = useState<MealRecord[]>([])
  const [workoutTitle, setWorkoutTitle] = useState('')
  const [workoutNotes, setWorkoutNotes] = useState('')
  const [activityType, setActivityType] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [distanceKm, setDistanceKm] = useState('')
  const [caloriesBurned, setCaloriesBurned] = useState('')
  const [intensity, setIntensity] = useState<CardioIntensity | ''>('')
  const [cardioNotes, setCardioNotes] = useState('')
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [mealNotes, setMealNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const loadTodayRecords = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const [nextWorkoutSessions, nextCardioRecords, nextMealRecords] = await Promise.all([
        listMyWorkoutSessions(today),
        listMyCardioRecords(today),
        listMyMealRecords(today),
      ])

      setWorkoutSessions(nextWorkoutSessions)
      setCardioRecords(nextCardioRecords)
      setMealRecords(nextMealRecords)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [today])

  useEffect(() => {
    loadTodayRecords()
  }, [loadTodayRecords])

  async function handleCreateWorkoutSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await createWorkoutSession({
        workout_date: today,
        title: workoutTitle.trim() || null,
        notes: workoutNotes.trim() || null,
      })
      setWorkoutTitle('')
      setWorkoutNotes('')
      setMessage('今日训练会话已创建')
      await loadTodayRecords()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCreateCardioRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    const parsedDuration = Number(durationMinutes)
    const parsedDistance = distanceKm.trim() ? Number(distanceKm) : null
    const parsedCalories = caloriesBurned.trim() ? Number(caloriesBurned) : null

    if (!activityType.trim()) {
      setErrorMessage('请填写有氧类型')
      setIsSubmitting(false)
      return
    }

    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      setErrorMessage('有氧时长必须大于 0')
      setIsSubmitting(false)
      return
    }

    if (parsedDistance !== null && (!Number.isFinite(parsedDistance) || parsedDistance < 0)) {
      setErrorMessage('距离不能小于 0')
      setIsSubmitting(false)
      return
    }

    if (parsedCalories !== null && (!Number.isFinite(parsedCalories) || parsedCalories < 0)) {
      setErrorMessage('消耗热量不能小于 0')
      setIsSubmitting(false)
      return
    }

    try {
      await createCardioRecord({
        cardio_date: today,
        activity_type: activityType.trim(),
        duration_minutes: parsedDuration,
        distance_km: parsedDistance,
        calories_burned: parsedCalories,
        intensity: intensity || null,
        notes: cardioNotes.trim() || null,
      })
      setActivityType('')
      setDurationMinutes('')
      setDistanceKm('')
      setCaloriesBurned('')
      setIntensity('')
      setCardioNotes('')
      setMessage('今日有氧记录已创建')
      await loadTodayRecords()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCreateMealRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await createMealRecord({
        meal_date: today,
        meal_type: mealType,
        notes: mealNotes.trim() || null,
      })
      setMealType('breakfast')
      setMealNotes('')
      setMessage('今日餐次记录已创建')
      await loadTodayRecords()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteWorkoutSession(sessionId: string) {
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await deleteWorkoutSession(sessionId)
      setMessage('训练会话已删除')
      await loadTodayRecords()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteCardioRecord(cardioRecordId: string) {
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await deleteCardioRecord(cardioRecordId)
      setMessage('有氧记录已删除')
      await loadTodayRecords()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteMealRecord(mealRecordId: string) {
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await deleteMealRecord(mealRecordId)
      setMessage('餐次记录已删除')
      await loadTodayRecords()
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
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">今日记录</h1>
            <p className="mt-2 text-sm text-slate-600">当前日期：{today}</p>
          </div>
        </div>

        {message ? <p className="mb-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
        {errorMessage ? <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}

        <div className="grid gap-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">力量训练</h2>
            <p className="mt-1 text-sm text-slate-600">当前只验证训练会话，不录入动作和组。</p>

            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleCreateWorkoutSession}>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">训练标题</span>
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  onChange={(event) => setWorkoutTitle(event.target.value)}
                  placeholder="例如 Push Day"
                  type="text"
                  value={workoutTitle}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">备注</span>
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  onChange={(event) => setWorkoutNotes(event.target.value)}
                  placeholder="今天状态、训练感受"
                  type="text"
                  value={workoutNotes}
                />
              </label>
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:col-span-2"
                disabled={isSubmitting}
                type="submit"
              >
                创建今日训练会话
              </button>
            </form>

            <div className="mt-5">
              {isLoading ? <p className="text-sm text-slate-600">加载中...</p> : null}
              {!isLoading && workoutSessions.length === 0 ? <p className="text-sm text-slate-600">今天还没有训练会话。</p> : null}
              <ul className="grid gap-3">
                {workoutSessions.map((session) => (
                  <li className="flex items-start justify-between gap-4 rounded-md border border-slate-200 p-3" key={session.id}>
                    <div>
                      <p className="font-medium">{getOptionalText(session.title, '未命名训练')}</p>
                      <p className="mt-1 text-sm text-slate-600">备注：{getOptionalText(session.notes, '无')}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        className="rounded-md border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        to={`/workouts/${session.id}`}
                      >
                        进入训练详情
                      </Link>
                      <button
                        className="rounded-md border border-red-200 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                        disabled={isSubmitting}
                        onClick={() => handleDeleteWorkoutSession(session.id)}
                        type="button"
                      >
                        删除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">有氧记录</h2>

            <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={handleCreateCardioRecord}>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">有氧类型</span>
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  onChange={(event) => setActivityType(event.target.value)}
                  placeholder="跑步、骑行"
                  type="text"
                  value={activityType}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">时长（分钟）</span>
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  min="0"
                  onChange={(event) => setDurationMinutes(event.target.value)}
                  step="1"
                  type="number"
                  value={durationMinutes}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">距离（km，可选）</span>
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  min="0"
                  onChange={(event) => setDistanceKm(event.target.value)}
                  step="0.01"
                  type="number"
                  value={distanceKm}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">消耗热量（可选）</span>
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  min="0"
                  onChange={(event) => setCaloriesBurned(event.target.value)}
                  step="0.1"
                  type="number"
                  value={caloriesBurned}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">强度（可选）</span>
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  onChange={(event) => setIntensity(event.target.value as CardioIntensity | '')}
                  value={intensity}
                >
                  <option value="">未选择</option>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">备注（可选）</span>
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  onChange={(event) => setCardioNotes(event.target.value)}
                  placeholder="例如 Zone 2"
                  type="text"
                  value={cardioNotes}
                />
              </label>
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:col-span-3"
                disabled={isSubmitting}
                type="submit"
              >
                创建有氧记录
              </button>
            </form>

            <div className="mt-5">
              {!isLoading && cardioRecords.length === 0 ? <p className="text-sm text-slate-600">今天还没有有氧记录。</p> : null}
              <ul className="grid gap-3">
                {cardioRecords.map((record) => (
                  <li className="flex items-start justify-between gap-4 rounded-md border border-slate-200 p-3" key={record.id}>
                    <div>
                      <p className="font-medium">{record.activity_type}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {record.duration_minutes} 分钟
                        {record.distance_km !== null ? `，${record.distance_km} km` : ''}
                        {record.calories_burned !== null ? `，${record.calories_burned} kcal` : ''}
                        {record.intensity ? `，强度 ${record.intensity}` : ''}
                      </p>
                      {record.notes ? <p className="mt-1 text-sm text-slate-600">备注：{record.notes}</p> : null}
                    </div>
                    <button
                      className="rounded-md border border-red-200 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                      disabled={isSubmitting}
                      onClick={() => handleDeleteCardioRecord(record.id)}
                      type="button"
                    >
                      删除
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">饮食记录</h2>
            <p className="mt-1 text-sm text-slate-600">当前只验证餐次记录，不录入食物明细。</p>

            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleCreateMealRecord}>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">餐次</span>
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  onChange={(event) => setMealType(event.target.value as MealType)}
                  value={mealType}
                >
                  {mealTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">备注</span>
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  onChange={(event) => setMealNotes(event.target.value)}
                  placeholder="例如 早餐正常"
                  type="text"
                  value={mealNotes}
                />
              </label>
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:col-span-2"
                disabled={isSubmitting}
                type="submit"
              >
                创建餐次记录
              </button>
            </form>

            <div className="mt-5">
              {!isLoading && mealRecords.length === 0 ? <p className="text-sm text-slate-600">今天还没有餐次记录。</p> : null}
              <ul className="grid gap-3">
                {mealRecords.map((record) => (
                  <li className="flex items-start justify-between gap-4 rounded-md border border-slate-200 p-3" key={record.id}>
                    <div>
                      <p className="font-medium">{record.meal_type}</p>
                      <p className="mt-1 text-sm text-slate-600">备注：{getOptionalText(record.notes, '无')}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        className="rounded-md border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        to={`/meals/${record.id}`}
                      >
                        进入食物明细
                      </Link>
                      <button
                        className="rounded-md border border-red-200 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                        disabled={isSubmitting}
                        onClick={() => handleDeleteMealRecord(record.id)}
                        type="button"
                      >
                        删除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
    </>
  )
}

export default TodayPage
