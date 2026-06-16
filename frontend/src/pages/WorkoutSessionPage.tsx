import type { FormEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createWorkoutExercise,
  createWorkoutSet,
  deleteWorkoutExercise,
  deleteWorkoutSet,
  getWorkoutSessionById,
  listWorkoutExercises,
  listWorkoutSets,
} from '../lib/workout'
import type {
  StrengthWorkoutExercise,
  StrengthWorkoutSession,
  StrengthWorkoutSet,
} from '../types/database'

type SetFormState = {
  weightKg: string
  reps: string
  isWarmup: boolean
  notes: string
}

type SetsByExerciseId = Record<string, StrengthWorkoutSet[]>
type SetFormsByExerciseId = Record<string, SetFormState>

function createEmptySetForm(): SetFormState {
  return {
    weightKg: '',
    reps: '',
    isWarmup: false,
    notes: '',
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败'
}

function getOptionalText(value: string | null | undefined, fallback: string) {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : fallback
}

function WorkoutSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [session, setSession] = useState<StrengthWorkoutSession | null>(null)
  const [exercises, setExercises] = useState<StrengthWorkoutExercise[]>([])
  const [setsByExerciseId, setSetsByExerciseId] = useState<SetsByExerciseId>({})
  const [setFormsByExerciseId, setSetFormsByExerciseId] = useState<SetFormsByExerciseId>({})
  const [exerciseName, setExerciseName] = useState('')
  const [exerciseNotes, setExerciseNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const loadWorkoutDetails = useCallback(async () => {
    if (!sessionId) {
      setErrorMessage('缺少训练会话 ID')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      const [nextSession, nextExercises] = await Promise.all([
        getWorkoutSessionById(sessionId),
        listWorkoutExercises(sessionId),
      ])

      const nextSetEntries = await Promise.all(
        nextExercises.map(async (exercise) => {
          const sets = await listWorkoutSets(exercise.id)
          return [exercise.id, sets] as const
        }),
      )

      setSession(nextSession)
      setExercises(nextExercises)
      setSetsByExerciseId(Object.fromEntries(nextSetEntries))
      setSetFormsByExerciseId((currentForms) => {
        const nextForms: SetFormsByExerciseId = {}
        nextExercises.forEach((exercise) => {
          nextForms[exercise.id] = currentForms[exercise.id] ?? createEmptySetForm()
        })
        return nextForms
      })
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    loadWorkoutDetails()
  }, [loadWorkoutDetails])

  async function handleCreateExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!sessionId) {
      setErrorMessage('缺少训练会话 ID')
      return
    }

    if (!exerciseName.trim()) {
      setErrorMessage('请填写动作名称')
      return
    }

    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await createWorkoutExercise(sessionId, {
        exercise_name_snapshot: exerciseName,
        notes: exerciseNotes,
      })
      setExerciseName('')
      setExerciseNotes('')
      setMessage('动作已添加')
      await loadWorkoutDetails()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteExercise(workoutExerciseId: string) {
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await deleteWorkoutExercise(workoutExerciseId)
      setMessage('动作已删除')
      await loadWorkoutDetails()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  function updateSetForm(workoutExerciseId: string, nextValue: Partial<SetFormState>) {
    setSetFormsByExerciseId((currentForms) => ({
      ...currentForms,
      [workoutExerciseId]: {
        ...(currentForms[workoutExerciseId] ?? createEmptySetForm()),
        ...nextValue,
      },
    }))
  }

  async function handleCreateSet(event: FormEvent<HTMLFormElement>, workoutExerciseId: string) {
    event.preventDefault()

    const formState = setFormsByExerciseId[workoutExerciseId] ?? createEmptySetForm()
    const parsedWeight = Number(formState.weightKg)
    const parsedReps = Number(formState.reps)

    if (!formState.weightKg.trim() || !Number.isFinite(parsedWeight) || parsedWeight < 0) {
      setErrorMessage('重量必须大于等于 0')
      return
    }

    if (!formState.reps.trim() || !Number.isInteger(parsedReps) || parsedReps <= 0) {
      setErrorMessage('次数必须是大于 0 的整数')
      return
    }

    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await createWorkoutSet(workoutExerciseId, {
        weight_kg: parsedWeight,
        reps: parsedReps,
        is_warmup: formState.isWarmup,
        notes: formState.notes,
      })
      updateSetForm(workoutExerciseId, createEmptySetForm())
      setMessage('训练组已添加')
      await loadWorkoutDetails()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteSet(setId: string) {
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await deleteWorkoutSet(setId)
      setMessage('训练组已删除')
      await loadWorkoutDetails()
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
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {session ? getOptionalText(session.title, '未命名训练') : '训练详情'}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              备注：{session ? getOptionalText(session.notes, '无') : '加载中'}
            </p>
          </div>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            to="/today"
          >
            返回今日记录
          </Link>
        </div>

        {message ? <p className="mb-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
        {errorMessage ? <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">添加动作</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleCreateExercise}>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">动作名称</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                onChange={(event) => setExerciseName(event.target.value)}
                placeholder="例如 卧推"
                type="text"
                value={exerciseName}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">动作备注</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                onChange={(event) => setExerciseNotes(event.target.value)}
                placeholder="可选"
                type="text"
                value={exerciseNotes}
              />
            </label>
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:col-span-2"
              disabled={isSubmitting}
              type="submit"
            >
              添加动作
            </button>
          </form>
        </section>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">动作列表</h2>
          {isLoading ? <p className="mt-4 text-sm text-slate-600">加载中...</p> : null}
          {!isLoading && exercises.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">当前训练会话还没有动作。</p>
          ) : null}

          <div className="mt-4 grid gap-4">
            {exercises.map((exercise) => {
              const setForm = setFormsByExerciseId[exercise.id] ?? createEmptySetForm()
              const sets = setsByExerciseId[exercise.id] ?? []

              return (
                <article className="rounded-md border border-slate-200 p-4" key={exercise.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold">{exercise.exercise_name_snapshot}</h3>
                      <p className="mt-1 text-sm text-slate-600">备注：{getOptionalText(exercise.notes, '无')}</p>
                    </div>
                    <button
                      className="rounded-md border border-red-200 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                      disabled={isSubmitting}
                      onClick={() => handleDeleteExercise(exercise.id)}
                      type="button"
                    >
                      删除动作
                    </button>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-slate-700">训练组</h4>
                    {sets.length === 0 ? <p className="mt-2 text-sm text-slate-600">还没有训练组。</p> : null}
                    <ul className="mt-2 grid gap-2">
                      {sets.map((set) => (
                        <li
                          className="flex flex-col gap-2 rounded-md bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                          key={set.id}
                        >
                          <span className="text-sm text-slate-700">
                            第 {set.set_number} 组：{set.weight_kg} kg × {set.reps} 次
                            {set.is_warmup ? '（热身）' : ''}
                            {set.notes ? `，备注：${set.notes}` : ''}
                          </span>
                          <button
                            className="self-start rounded-md border border-red-200 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300 sm:self-auto"
                            disabled={isSubmitting}
                            onClick={() => handleDeleteSet(set.id)}
                            type="button"
                          >
                            删除组
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <form className="mt-4 grid gap-3 sm:grid-cols-4" onSubmit={(event) => handleCreateSet(event, exercise.id)}>
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-slate-700">重量 kg</span>
                      <input
                        className="rounded-md border border-slate-300 px-3 py-2"
                        min="0"
                        onChange={(event) => updateSetForm(exercise.id, { weightKg: event.target.value })}
                        step="0.5"
                        type="number"
                        value={setForm.weightKg}
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-slate-700">次数</span>
                      <input
                        className="rounded-md border border-slate-300 px-3 py-2"
                        min="1"
                        onChange={(event) => updateSetForm(exercise.id, { reps: event.target.value })}
                        step="1"
                        type="number"
                        value={setForm.reps}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm sm:pt-6">
                      <input
                        checked={setForm.isWarmup}
                        className="h-4 w-4 rounded border-slate-300"
                        onChange={(event) => updateSetForm(exercise.id, { isWarmup: event.target.checked })}
                        type="checkbox"
                      />
                      <span className="font-medium text-slate-700">热身组</span>
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-slate-700">备注</span>
                      <input
                        className="rounded-md border border-slate-300 px-3 py-2"
                        onChange={(event) => updateSetForm(exercise.id, { notes: event.target.value })}
                        placeholder="可选"
                        type="text"
                        value={setForm.notes}
                      />
                    </label>
                    <button
                      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:col-span-4"
                      disabled={isSubmitting}
                      type="submit"
                    >
                      添加训练组
                    </button>
                  </form>
                </article>
              )
            })}
          </div>
        </section>
    </>
  )
}

export default WorkoutSessionPage
