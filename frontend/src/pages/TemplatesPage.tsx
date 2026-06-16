import type { FormEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  applyTemplateToToday,
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  listWorkoutTemplates,
  type WorkoutTemplate,
} from '../lib/workoutTemplates'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败'
}

function getOptionalText(value: string | null | undefined, fallback: string) {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : fallback
}

function TemplatesPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const loadTemplates = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const nextTemplates = await listWorkoutTemplates()
      setTemplates(nextTemplates)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  async function handleCreateTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim()) {
      setErrorMessage('请输入模板名称')
      return
    }

    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await createWorkoutTemplate({
        name,
        description,
      })
      setName('')
      setDescription('')
      setMessage('训练模板已创建')
      await loadTemplates()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await deleteWorkoutTemplate(templateId)
      setMessage('训练模板已删除')
      await loadTemplates()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleApplyTemplate(templateId: string) {
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      const session = await applyTemplateToToday(templateId)
      navigate(`/workouts/${session.id}`)
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
          <h1 className="mobile-page-title mt-2">训练模板</h1>
          <p className="mt-2 text-sm text-slate-600">管理常用训练模板，并一键套用到今天的训练会话。</p>
        </div>
        <Link className="mobile-action-link border border-slate-300 text-slate-700 hover:bg-white" to="/today">
          返回今日记录
        </Link>
      </div>

      {message ? <p className="mb-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      {errorMessage ? <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">创建训练模板</h2>
        <form className="mobile-form-grid-two mt-4" onSubmit={handleCreateTemplate}>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">模板名称</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              onChange={(event) => setName(event.target.value)}
              placeholder="例如 Push Day 模板"
              type="text"
              value={name}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">模板描述</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="可选"
              type="text"
              value={description}
            />
          </label>
          <button
            className="mobile-action-button rounded-md bg-slate-900 text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:col-span-2"
            disabled={isSubmitting}
            type="submit"
          >
            创建模板
          </button>
        </form>
      </section>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">模板列表</h2>
        {isLoading ? <p className="mt-4 text-sm text-slate-600">加载中...</p> : null}
        {!isLoading && templates.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">当前还没有训练模板。</p>
        ) : null}

        <ul className="mt-4 grid gap-3">
          {templates.map((template) => (
            <li
              className="flex flex-col gap-4 rounded-md border border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between"
              key={template.id}
            >
              <div>
                <p className="font-semibold text-slate-900">{template.name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  描述：{getOptionalText(template.description, '无')}
                </p>
              </div>
              <div className="mobile-action-stack">
                <Link
                  className="mobile-action-link border border-slate-200 text-slate-700 hover:bg-slate-50"
                  to={`/templates/${template.id}`}
                >
                  进入模板详情
                </Link>
                <button
                  className="mobile-action-link bg-emerald-700 text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  disabled={isSubmitting}
                  onClick={() => handleApplyTemplate(template.id)}
                  type="button"
                >
                  套用到今日
                </button>
                <button
                  className="mobile-action-link border border-red-200 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                  disabled={isSubmitting}
                  onClick={() => handleDeleteTemplate(template.id)}
                  type="button"
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

export default TemplatesPage
