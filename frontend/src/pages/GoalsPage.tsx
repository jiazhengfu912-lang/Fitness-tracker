import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createFitnessGoal,
  deleteFitnessGoal,
  fitnessGoalPeriods,
  fitnessGoalStatuses,
  fitnessGoalTypes,
  getDefaultPeriod,
  getGoalProgress,
  getGoalTypeLabel,
  getGoalUnitLabel,
  listFitnessGoals,
  updateFitnessGoal,
  type FitnessGoal,
  type FitnessGoalPeriod,
  type FitnessGoalProgress,
  type FitnessGoalStatus,
  type FitnessGoalType,
} from '../lib/fitnessGoals'

type GoalFilterStatus = 'all' | FitnessGoalStatus

type CreateGoalFormState = {
  goalType: FitnessGoalType
  targetValue: string
  unit: string
  period: FitnessGoalPeriod
  startDate: string
  endDate: string
  status: FitnessGoalStatus
  notes: string
}

type EditGoalFormState = {
  targetValue: string
  unit: string
  period: FitnessGoalPeriod
  startDate: string
  endDate: string
  status: FitnessGoalStatus
  notes: string
}

const filterOptions: GoalFilterStatus[] = ['all', 'active', 'paused', 'completed', 'archived']

function getTodayDateString() {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function createInitialCreateForm(goalType: FitnessGoalType = 'target_weight_kg'): CreateGoalFormState {
  return {
    goalType,
    targetValue: '',
    unit: getGoalUnitLabel(goalType),
    period: getDefaultPeriod(goalType),
    startDate: getTodayDateString(),
    endDate: '',
    status: 'active',
    notes: '',
  }
}

function buildEditForm(goal: FitnessGoal): EditGoalFormState {
  return {
    targetValue: String(goal.target_value),
    unit: goal.unit,
    period: goal.period,
    startDate: goal.start_date,
    endDate: goal.end_date ?? '',
    status: goal.status,
    notes: goal.notes ?? '',
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败'
}

function getOptionalText(value: string | null | undefined, fallback: string) {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : fallback
}

function getStatusLabel(status: FitnessGoalStatus) {
  switch (status) {
    case 'active':
      return '进行中'
    case 'paused':
      return '已暂停'
    case 'completed':
      return '已完成'
    case 'archived':
      return '已归档'
    default:
      return status
  }
}

function getFilterLabel(status: GoalFilterStatus) {
  if (status === 'all') {
    return '全部'
  }

  return getStatusLabel(status)
}

function getPeriodLabel(period: FitnessGoalPeriod) {
  switch (period) {
    case 'daily':
      return '每日'
    case 'weekly':
      return '每周'
    case 'monthly':
      return '每月'
    case 'date_range':
      return '日期区间'
    case 'current':
      return '当前'
    default:
      return period
  }
}

function GoalsPage() {
  const [goals, setGoals] = useState<FitnessGoal[]>([])
  const [progressByGoalId, setProgressByGoalId] = useState<Record<string, FitnessGoalProgress>>({})
  const [createForm, setCreateForm] = useState<CreateGoalFormState>(createInitialCreateForm)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditGoalFormState | null>(null)
  const [filterStatus, setFilterStatus] = useState<GoalFilterStatus>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const loadGoals = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const nextGoals = await listFitnessGoals()
      const progressResults = await Promise.allSettled(
        nextGoals.map(async (goal) => {
          const progress = await getGoalProgress(goal)
          return [goal.id, progress] as const
        }),
      )

      const nextProgressByGoalId: Record<string, FitnessGoalProgress> = {}
      progressResults.forEach((result, index) => {
        const goalId = nextGoals[index]?.id

        if (!goalId) {
          return
        }

        if (result.status === 'fulfilled') {
          nextProgressByGoalId[goalId] = result.value[1]
        }
      })

      setGoals(nextGoals)
      setProgressByGoalId(nextProgressByGoalId)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGoals()
  }, [loadGoals])

  const filteredGoals = useMemo(() => {
    if (filterStatus === 'all') {
      return goals
    }

    return goals.filter((goal) => goal.status === filterStatus)
  }, [filterStatus, goals])

  function updateCreateGoalType(goalType: FitnessGoalType) {
    setCreateForm((currentForm) => ({
      ...currentForm,
      goalType,
      unit: getGoalUnitLabel(goalType),
      period: getDefaultPeriod(goalType),
    }))
  }

  async function handleCreateGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    const parsedTargetValue = Number(createForm.targetValue)

    if (!Number.isFinite(parsedTargetValue) || parsedTargetValue <= 0) {
      setErrorMessage('目标值必须大于 0')
      setIsSubmitting(false)
      return
    }

    try {
      await createFitnessGoal({
        goal_type: createForm.goalType,
        target_value: parsedTargetValue,
        unit: createForm.unit,
        period: createForm.period,
        start_date: createForm.startDate,
        end_date: createForm.endDate.trim() || null,
        status: createForm.status,
        notes: createForm.notes,
      })
      setCreateForm(createInitialCreateForm())
      setMessage('健身目标已创建')
      await loadGoals()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleStartEditing(goal: FitnessGoal) {
    setEditingGoalId(goal.id)
    setEditForm(buildEditForm(goal))
    setMessage('')
    setErrorMessage('')
  }

  function handleCancelEditing() {
    setEditingGoalId(null)
    setEditForm(null)
  }

  async function handleSaveGoal(goal: FitnessGoal, event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editForm) {
      return
    }

    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    const parsedTargetValue = Number(editForm.targetValue)

    if (!Number.isFinite(parsedTargetValue) || parsedTargetValue <= 0) {
      setErrorMessage('目标值必须大于 0')
      setIsSubmitting(false)
      return
    }

    try {
      await updateFitnessGoal(goal.id, {
        target_value: parsedTargetValue,
        unit: editForm.unit,
        period: editForm.period,
        start_date: editForm.startDate,
        end_date: editForm.endDate.trim() || null,
        status: editForm.status,
        notes: editForm.notes,
      })
      setEditingGoalId(null)
      setEditForm(null)
      setMessage('健身目标已更新')
      await loadGoals()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteGoal(goalId: string) {
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await deleteFitnessGoal(goalId)
      if (editingGoalId === goalId) {
        setEditingGoalId(null)
        setEditForm(null)
      }
      setMessage('健身目标已删除')
      await loadGoals()
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
          <h1 className="mobile-page-title mt-2">目标管理</h1>
          <p className="mt-2 text-sm text-slate-600">创建、查看和维护基础健身目标，并展示当前进度。</p>
        </div>
        <Link className="mobile-action-link border border-slate-300 text-slate-700 hover:bg-white" to="/">
          返回仪表盘
        </Link>
      </div>

      {message ? <p className="mb-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      {errorMessage ? <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">创建健身目标</h2>
        <form className="mobile-form-grid-two mt-4" onSubmit={handleCreateGoal}>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">目标类型</span>
            <select
              className="rounded-md border border-slate-300 px-3 py-2"
              onChange={(event) => updateCreateGoalType(event.target.value as FitnessGoalType)}
              value={createForm.goalType}
            >
              {fitnessGoalTypes.map((goalType) => (
                <option key={goalType} value={goalType}>
                  {getGoalTypeLabel(goalType)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">目标值</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              min="0"
              onChange={(event) =>
                setCreateForm((currentForm) => ({ ...currentForm, targetValue: event.target.value }))
              }
              step="0.1"
              type="number"
              value={createForm.targetValue}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">单位</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              onChange={(event) =>
                setCreateForm((currentForm) => ({ ...currentForm, unit: event.target.value }))
              }
              type="text"
              value={createForm.unit}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">周期</span>
            <select
              className="rounded-md border border-slate-300 px-3 py-2"
              onChange={(event) =>
                setCreateForm((currentForm) => ({
                  ...currentForm,
                  period: event.target.value as FitnessGoalPeriod,
                }))
              }
              value={createForm.period}
            >
              {fitnessGoalPeriods.map((period) => (
                <option key={period} value={period}>
                  {getPeriodLabel(period)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">开始日期</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              onChange={(event) =>
                setCreateForm((currentForm) => ({ ...currentForm, startDate: event.target.value }))
              }
              type="date"
              value={createForm.startDate}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">结束日期</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              onChange={(event) =>
                setCreateForm((currentForm) => ({ ...currentForm, endDate: event.target.value }))
              }
              type="date"
              value={createForm.endDate}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">状态</span>
            <select
              className="rounded-md border border-slate-300 px-3 py-2"
              onChange={(event) =>
                setCreateForm((currentForm) => ({
                  ...currentForm,
                  status: event.target.value as FitnessGoalStatus,
                }))
              }
              value={createForm.status}
            >
              {fitnessGoalStatuses.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">备注</span>
            <textarea
              className="min-h-24 rounded-md border border-slate-300 px-3 py-2"
              onChange={(event) =>
                setCreateForm((currentForm) => ({ ...currentForm, notes: event.target.value }))
              }
              value={createForm.notes}
            />
          </label>

          <button
            className="mobile-action-button rounded-md bg-slate-900 text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:col-span-2"
            disabled={isSubmitting}
            type="submit"
          >
            保存目标
          </button>
        </form>
      </section>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">目标列表</h2>
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((status) => {
              const isActive = filterStatus === status
              return (
                <button
                  className={`min-h-11 rounded-md px-3 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  type="button"
                >
                  {getFilterLabel(status)}
                </button>
              )
            })}
          </div>
        </div>

        {isLoading ? <p className="mt-4 text-sm text-slate-600">加载中...</p> : null}
        {!isLoading && filteredGoals.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">当前筛选条件下还没有健身目标。</p>
        ) : null}

        <div className="mt-4 grid gap-4">
          {filteredGoals.map((goal) => {
            const progress = progressByGoalId[goal.id]
            const isEditing = editingGoalId === goal.id && editForm !== null

            if (isEditing) {
              return (
                <article className="rounded-md border border-slate-200 p-4" key={goal.id}>
                  <div className="mb-3">
                    <p className="text-sm font-medium text-emerald-700">
                      {getGoalTypeLabel(goal.goal_type)}
                    </p>
                  </div>

                  <form
                    className="mobile-form-grid-two"
                    onSubmit={(event) => handleSaveGoal(goal, event)}
                  >
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-slate-700">目标值</span>
                      <input
                        className="rounded-md border border-slate-300 px-3 py-2"
                        min="0"
                        onChange={(event) =>
                          setEditForm((currentForm) =>
                            currentForm ? { ...currentForm, targetValue: event.target.value } : currentForm,
                          )
                        }
                        step="0.1"
                        type="number"
                        value={editForm.targetValue}
                      />
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-slate-700">单位</span>
                      <input
                        className="rounded-md border border-slate-300 px-3 py-2"
                        onChange={(event) =>
                          setEditForm((currentForm) =>
                            currentForm ? { ...currentForm, unit: event.target.value } : currentForm,
                          )
                        }
                        type="text"
                        value={editForm.unit}
                      />
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-slate-700">周期</span>
                      <select
                        className="rounded-md border border-slate-300 px-3 py-2"
                        onChange={(event) =>
                          setEditForm((currentForm) =>
                            currentForm
                              ? { ...currentForm, period: event.target.value as FitnessGoalPeriod }
                              : currentForm,
                          )
                        }
                        value={editForm.period}
                      >
                        {fitnessGoalPeriods.map((period) => (
                          <option key={period} value={period}>
                            {getPeriodLabel(period)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-slate-700">开始日期</span>
                      <input
                        className="rounded-md border border-slate-300 px-3 py-2"
                        onChange={(event) =>
                          setEditForm((currentForm) =>
                            currentForm ? { ...currentForm, startDate: event.target.value } : currentForm,
                          )
                        }
                        type="date"
                        value={editForm.startDate}
                      />
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-slate-700">结束日期</span>
                      <input
                        className="rounded-md border border-slate-300 px-3 py-2"
                        onChange={(event) =>
                          setEditForm((currentForm) =>
                            currentForm ? { ...currentForm, endDate: event.target.value } : currentForm,
                          )
                        }
                        type="date"
                        value={editForm.endDate}
                      />
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-slate-700">状态</span>
                      <select
                        className="rounded-md border border-slate-300 px-3 py-2"
                        onChange={(event) =>
                          setEditForm((currentForm) =>
                            currentForm
                              ? { ...currentForm, status: event.target.value as FitnessGoalStatus }
                              : currentForm,
                          )
                        }
                        value={editForm.status}
                      >
                        {fitnessGoalStatuses.map((status) => (
                          <option key={status} value={status}>
                            {getStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-sm sm:col-span-2">
                      <span className="font-medium text-slate-700">备注</span>
                      <textarea
                        className="min-h-24 rounded-md border border-slate-300 px-3 py-2"
                        onChange={(event) =>
                          setEditForm((currentForm) =>
                            currentForm ? { ...currentForm, notes: event.target.value } : currentForm,
                          )
                        }
                        value={editForm.notes}
                      />
                    </label>

                    <div className="mobile-action-stack sm:col-span-2">
                      <button
                        className="mobile-action-button rounded-md bg-slate-900 text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                        disabled={isSubmitting}
                        type="submit"
                      >
                        保存修改
                      </button>
                      <button
                        className="mobile-action-button border border-slate-300 text-slate-700 hover:bg-slate-50"
                        onClick={handleCancelEditing}
                        type="button"
                      >
                        取消
                      </button>
                    </div>
                  </form>
                </article>
              )
            }

            return (
              <article className="rounded-md border border-slate-200 p-4" key={goal.id}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-slate-900">
                      {getGoalTypeLabel(goal.goal_type)}
                    </p>
                    <p className="text-sm text-slate-600">
                      目标值：{goal.target_value} {goal.unit}
                    </p>
                    <p className="text-sm text-slate-600">周期：{getPeriodLabel(goal.period)}</p>
                    <p className="text-sm text-slate-600">开始日期：{goal.start_date}</p>
                    <p className="text-sm text-slate-600">结束日期：{goal.end_date ?? '无'}</p>
                    <p className="text-sm text-slate-600">状态：{getStatusLabel(goal.status)}</p>
                    <p className="text-sm text-slate-600">
                      备注：{getOptionalText(goal.notes, '无')}
                    </p>
                    <p className="text-sm font-medium text-emerald-700">
                      当前进度：{progress ? progress.text : '进度加载失败'}
                    </p>
                  </div>

                  <div className="mobile-action-stack">
                    <button
                      className="mobile-action-link border border-slate-300 text-slate-700 hover:bg-slate-50"
                      onClick={() => handleStartEditing(goal)}
                      type="button"
                    >
                      编辑
                    </button>
                    <button
                      className="mobile-action-link border border-red-200 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                      disabled={isSubmitting}
                      onClick={() => handleDeleteGoal(goal.id)}
                      type="button"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}

export default GoalsPage
