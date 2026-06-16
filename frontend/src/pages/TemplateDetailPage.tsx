import type { FormEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createTemplateExercise,
  createTemplateSet,
  deleteTemplateExercise,
  deleteTemplateSet,
  getWorkoutTemplateById,
  listTemplateExercises,
  listTemplateSets,
  type WorkoutTemplate,
  type WorkoutTemplateExercise,
  type WorkoutTemplateSet,
} from '../lib/workoutTemplates'

type TemplateSetFormState = {
  targetWeightKg: string
  targetReps: string
  isWarmup: boolean
  notes: string
}

type TemplateSetsByExerciseId = Record<string, WorkoutTemplateSet[]>
type TemplateSetFormsByExerciseId = Record<string, TemplateSetFormState>

function createEmptySetForm(): TemplateSetFormState {
  return {
    targetWeightKg: '',
    targetReps: '',
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

function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null)
  const [exercises, setExercises] = useState<WorkoutTemplateExercise[]>([])
  const [setsByExerciseId, setSetsByExerciseId] = useState<TemplateSetsByExerciseId>({})
  const [setFormsByExerciseId, setSetFormsByExerciseId] = useState<TemplateSetFormsByExerciseId>({})
  const [exerciseName, setExerciseName] = useState('')
  const [exerciseNotes, setExerciseNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const loadTemplateDetails = useCallback(async () => {
    if (!templateId) {
      setErrorMessage('缺少模板 ID')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      const [nextTemplate, nextExercises] = await Promise.all([
        getWorkoutTemplateById(templateId),
        listTemplateExercises(templateId),
      ])

      const nextSetEntries = await Promise.all(
        nextExercises.map(async (exercise) => {
          const sets = await listTemplateSets(exercise.id)
          return [exercise.id, sets] as const
        }),
      )

      setTemplate(nextTemplate)
      setExercises(nextExercises)
      setSetsByExerciseId(Object.fromEntries(nextSetEntries))
      setSetFormsByExerciseId((currentForms) => {
        const nextForms: TemplateSetFormsByExerciseId = {}
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
  }, [templateId])

  useEffect(() => {
    loadTemplateDetails()
  }, [loadTemplateDetails])

  async function handleCreateExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!templateId) {
      setErrorMessage('缺少模板 ID')
      return
    }

    if (!exerciseName.trim()) {
      setErrorMessage('请输入动作名称')
      return
    }

    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await createTemplateExercise(templateId, {
        exercise_name_snapshot: exerciseName,
        notes: exerciseNotes,
      })
      setExerciseName('')
      setExerciseNotes('')
      setMessage('模板动作已添加')
      await loadTemplateDetails()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteExercise(templateExerciseId: string) {
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await deleteTemplateExercise(templateExerciseId)
      setMessage('模板动作已删除')
      await loadTemplateDetails()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  function updateSetForm(templateExerciseId: string, nextValue: Partial<TemplateSetFormState>) {
    setSetFormsByExerciseId((currentForms) => ({
      ...currentForms,
      [templateExerciseId]: {
        ...(currentForms[templateExerciseId] ?? createEmptySetForm()),
        ...nextValue,
      },
    }))
  }

  async function handleCreateSet(event: FormEvent<HTMLFormElement>, templateExerciseId: string) {
    event.preventDefault()

    const formState = setFormsByExerciseId[templateExerciseId] ?? createEmptySetForm()
    const parsedWeight =
      formState.targetWeightKg.trim() === '' ? null : Number(formState.targetWeightKg)
    const parsedReps = formState.targetReps.trim() === '' ? null : Number(formState.targetReps)

    if (parsedWeight !== null && (!Number.isFinite(parsedWeight) || parsedWeight < 0)) {
      setErrorMessage('目标重量必须大于等于 0')
      return
    }

    if (parsedReps !== null && (!Number.isInteger(parsedReps) || parsedReps <= 0)) {
      setErrorMessage('目标次数必须是大于 0 的整数')
      return
    }

    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await createTemplateSet(templateExerciseId, {
        target_weight_kg: parsedWeight,
        target_reps: parsedReps,
        is_warmup: formState.isWarmup,
        notes: formState.notes,
      })
      updateSetForm(templateExerciseId, createEmptySetForm())
      setMessage('目标组已添加')
      await loadTemplateDetails()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteSet(templateSetId: string) {
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await deleteTemplateSet(templateSetId)
      setMessage('目标组已删除')
      await loadTemplateDetails()
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
            {template ? template.name : '模板详情'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            描述：{template ? getOptionalText(template.description, '无') : '加载中...'}
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          to="/templates"
        >
          返回模板列表
        </Link>
      </div>

      {message ? <p className="mb-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      {errorMessage ? <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">添加模板动作</h2>
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
            添加模板动作
          </button>
        </form>
      </section>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">模板动作列表</h2>
        {isLoading ? <p className="mt-4 text-sm text-slate-600">加载中...</p> : null}
        {!isLoading && exercises.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">当前模板还没有动作。</p>
        ) : null}

        <div className="mt-4 grid gap-4">
          {exercises.map((exercise) => {
            const sets = setsByExerciseId[exercise.id] ?? []
            const setForm = setFormsByExerciseId[exercise.id] ?? createEmptySetForm()

            return (
              <article className="rounded-md border border-slate-200 p-4" key={exercise.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold">{exercise.exercise_name_snapshot}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      备注：{getOptionalText(exercise.notes, '无')}
                    </p>
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
                  <h4 className="text-sm font-semibold text-slate-700">目标组列表</h4>
                  {sets.length === 0 ? <p className="mt-2 text-sm text-slate-600">还没有目标组。</p> : null}
                  <ul className="mt-2 grid gap-2">
                    {sets.map((set) => (
                      <li
                        className="flex flex-col gap-2 rounded-md bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                        key={set.id}
                      >
                        <span className="text-sm text-slate-700">
                          第 {set.set_number} 组：目标 {set.target_weight_kg ?? '-'} kg x{' '}
                          {set.target_reps ?? '-'} 次
                          {set.is_warmup ? '（热身）' : ''}
                          {set.notes ? `，备注：${set.notes}` : ''}
                        </span>
                        <button
                          className="self-start rounded-md border border-red-200 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300 sm:self-auto"
                          disabled={isSubmitting}
                          onClick={() => handleDeleteSet(set.id)}
                          type="button"
                        >
                          删除目标组
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <form
                  className="mt-4 grid gap-3 sm:grid-cols-4"
                  onSubmit={(event) => handleCreateSet(event, exercise.id)}
                >
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-slate-700">目标重量 kg</span>
                    <input
                      className="rounded-md border border-slate-300 px-3 py-2"
                      min="0"
                      onChange={(event) =>
                        updateSetForm(exercise.id, { targetWeightKg: event.target.value })
                      }
                      step="0.5"
                      type="number"
                      value={setForm.targetWeightKg}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium text-slate-700">目标次数</span>
                    <input
                      className="rounded-md border border-slate-300 px-3 py-2"
                      min="1"
                      onChange={(event) =>
                        updateSetForm(exercise.id, { targetReps: event.target.value })
                      }
                      step="1"
                      type="number"
                      value={setForm.targetReps}
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
                    添加目标组
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

export default TemplateDetailPage
