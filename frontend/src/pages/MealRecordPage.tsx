import type { FormEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createMealItem,
  deleteMealItem,
  getMealRecordById,
  listMealItems,
} from '../lib/meal'
import type { MealItem, MealRecord } from '../types/database'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败'
}

function getOptionalText(value: string | null | undefined, fallback: string) {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : fallback
}

function parseOptionalNonNegativeNumber(value: string, fieldLabel: string) {
  if (!value.trim()) {
    return null
  }

  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error(`${fieldLabel}不能小于 0`)
  }

  return parsedValue
}

function MealRecordPage() {
  const { mealRecordId } = useParams<{ mealRecordId: string }>()
  const [mealRecord, setMealRecord] = useState<MealRecord | null>(null)
  const [mealItems, setMealItems] = useState<MealItem[]>([])
  const [foodName, setFoodName] = useState('')
  const [amountG, setAmountG] = useState('')
  const [calories, setCalories] = useState('')
  const [proteinG, setProteinG] = useState('')
  const [carbsG, setCarbsG] = useState('')
  const [fatG, setFatG] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const loadMealDetails = useCallback(async () => {
    if (!mealRecordId) {
      setErrorMessage('缺少餐次记录 ID')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      const [nextMealRecord, nextMealItems] = await Promise.all([
        getMealRecordById(mealRecordId),
        listMealItems(mealRecordId),
      ])

      setMealRecord(nextMealRecord)
      setMealItems(nextMealItems)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [mealRecordId])

  useEffect(() => {
    loadMealDetails()
  }, [loadMealDetails])

  async function handleCreateMealItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!mealRecordId) {
      setErrorMessage('缺少餐次记录 ID')
      return
    }

    if (!foodName.trim()) {
      setErrorMessage('请填写食物名称')
      return
    }

    const parsedAmount = Number(amountG)
    if (!amountG.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('摄入重量必须大于 0')
      return
    }

    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await createMealItem(mealRecordId, {
        food_name_snapshot: foodName,
        amount_g: parsedAmount,
        calories_snapshot: parseOptionalNonNegativeNumber(calories, '热量'),
        protein_g_snapshot: parseOptionalNonNegativeNumber(proteinG, '蛋白质'),
        carbs_g_snapshot: parseOptionalNonNegativeNumber(carbsG, '碳水'),
        fat_g_snapshot: parseOptionalNonNegativeNumber(fatG, '脂肪'),
        notes,
      })

      setFoodName('')
      setAmountG('')
      setCalories('')
      setProteinG('')
      setCarbsG('')
      setFatG('')
      setNotes('')
      setMessage('食物明细已添加')
      await loadMealDetails()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteMealItem(mealItemId: string) {
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await deleteMealItem(mealItemId)
      setMessage('食物明细已删除')
      await loadMealDetails()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Fitness Tracker MVP</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {mealRecord ? mealRecord.meal_type : '餐次详情'}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              备注：{mealRecord ? getOptionalText(mealRecord.notes, '无') : '加载中'}
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
          <h2 className="text-lg font-semibold">添加食物</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleCreateMealItem}>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">食物名称</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                onChange={(event) => setFoodName(event.target.value)}
                placeholder="例如 鸡胸肉"
                type="text"
                value={foodName}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">摄入重量 g</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                min="0"
                onChange={(event) => setAmountG(event.target.value)}
                step="0.1"
                type="number"
                value={amountG}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">热量 kcal</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                min="0"
                onChange={(event) => setCalories(event.target.value)}
                step="0.1"
                type="number"
                value={calories}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">蛋白质 g</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                min="0"
                onChange={(event) => setProteinG(event.target.value)}
                step="0.1"
                type="number"
                value={proteinG}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">碳水 g</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                min="0"
                onChange={(event) => setCarbsG(event.target.value)}
                step="0.1"
                type="number"
                value={carbsG}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">脂肪 g</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                min="0"
                onChange={(event) => setFatG(event.target.value)}
                step="0.1"
                type="number"
                value={fatG}
              />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">备注</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="可选"
                type="text"
                value={notes}
              />
            </label>
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:col-span-2"
              disabled={isSubmitting}
              type="submit"
            >
              添加食物
            </button>
          </form>
        </section>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">食物明细列表</h2>
          {isLoading ? <p className="mt-4 text-sm text-slate-600">加载中...</p> : null}
          {!isLoading && mealItems.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">当前餐次还没有食物明细。</p>
          ) : null}

          <ul className="mt-4 grid gap-3">
            {mealItems.map((item) => (
              <li className="flex flex-col gap-3 rounded-md border border-slate-200 p-3 sm:flex-row sm:items-start sm:justify-between" key={item.id}>
                <div>
                  <p className="font-medium">{item.food_name_snapshot}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.amount_g} g
                    {item.calories_snapshot !== null ? `，${item.calories_snapshot} kcal` : ''}
                    {item.protein_g_snapshot !== null ? `，蛋白质 ${item.protein_g_snapshot} g` : ''}
                    {item.carbs_g_snapshot !== null ? `，碳水 ${item.carbs_g_snapshot} g` : ''}
                    {item.fat_g_snapshot !== null ? `，脂肪 ${item.fat_g_snapshot} g` : ''}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">备注：{getOptionalText(item.notes, '无')}</p>
                </div>
                <button
                  className="self-start rounded-md border border-red-200 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300 sm:self-auto"
                  disabled={isSubmitting}
                  onClick={() => handleDeleteMealItem(item.id)}
                  type="button"
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}

export default MealRecordPage
