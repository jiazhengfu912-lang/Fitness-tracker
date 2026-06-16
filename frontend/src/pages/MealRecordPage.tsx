import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { calculateNutritionByAmount, listFoods, searchFoods } from '../lib/foods'
import {
  createMealItem,
  deleteMealItem,
  getMealRecordById,
  listMealItems,
} from '../lib/meal'
import type { Food, MealItem, MealRecord, MealType } from '../types/database'

const mealTypeLabelMap: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
}

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

function formatNullableNumber(value: number | null | undefined, digits: number) {
  if (value === null || value === undefined) {
    return '0'
  }

  return value.toFixed(digits).replace(/\.0$/, '')
}

function MealRecordPage() {
  const { mealRecordId } = useParams<{ mealRecordId: string }>()
  const [mealRecord, setMealRecord] = useState<MealRecord | null>(null)
  const [mealItems, setMealItems] = useState<MealItem[]>([])
  const [foods, setFoods] = useState<Food[]>([])
  const [foodSearchKeyword, setFoodSearchKeyword] = useState('')
  const [selectedFoodId, setSelectedFoodId] = useState('')
  const [libraryAmountG, setLibraryAmountG] = useState('')
  const [libraryNotes, setLibraryNotes] = useState('')
  const [manualFoodName, setManualFoodName] = useState('')
  const [manualAmountG, setManualAmountG] = useState('')
  const [manualCalories, setManualCalories] = useState('')
  const [manualProteinG, setManualProteinG] = useState('')
  const [manualCarbsG, setManualCarbsG] = useState('')
  const [manualFatG, setManualFatG] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isFoodsLoading, setIsFoodsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [foodLibraryErrorMessage, setFoodLibraryErrorMessage] = useState('')

  const selectedFood = useMemo(
    () => foods.find((food) => food.id === selectedFoodId) ?? null,
    [foods, selectedFoodId],
  )

  const calculatedNutrition = useMemo(() => {
    if (!selectedFood) {
      return null
    }

    const parsedAmount = Number(libraryAmountG)
    if (!libraryAmountG.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return null
    }

    try {
      return calculateNutritionByAmount(selectedFood, parsedAmount)
    } catch {
      return null
    }
  }, [libraryAmountG, selectedFood])

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

  const loadFoodsData = useCallback(async (keyword?: string) => {
    setIsFoodsLoading(true)
    setFoodLibraryErrorMessage('')

    try {
      const nextFoods = keyword?.trim() ? await searchFoods(keyword) : await listFoods()
      setFoods(nextFoods)

      if (selectedFoodId && !nextFoods.some((food) => food.id === selectedFoodId)) {
        setSelectedFoodId('')
      }
    } catch (error) {
      setFoodLibraryErrorMessage(getErrorMessage(error))
    } finally {
      setIsFoodsLoading(false)
    }
  }, [selectedFoodId])

  useEffect(() => {
    loadMealDetails()
  }, [loadMealDetails])

  useEffect(() => {
    loadFoodsData()
  }, [loadFoodsData])

  async function handleSearchFoods(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    await loadFoodsData(foodSearchKeyword)
  }

  async function handleResetFoodSearch() {
    setFoodSearchKeyword('')
    setMessage('')
    await loadFoodsData()
  }

  async function handleCreateFromLibrary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!mealRecordId) {
      setErrorMessage('缺少餐次记录 ID')
      return
    }

    if (!selectedFood) {
      setErrorMessage('请先选择食物库中的食物')
      return
    }

    const parsedAmount = Number(libraryAmountG)
    if (!libraryAmountG.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('摄入重量必须大于 0')
      return
    }

    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      const nutrition = calculateNutritionByAmount(selectedFood, parsedAmount)

      await createMealItem(mealRecordId, {
        food_id: selectedFood.id,
        food_name_snapshot: selectedFood.name,
        amount_g: parsedAmount,
        calories_snapshot: nutrition.calories,
        protein_g_snapshot: nutrition.proteinG,
        carbs_g_snapshot: nutrition.carbsG,
        fat_g_snapshot: nutrition.fatG,
        notes: libraryNotes,
      })

      setSelectedFoodId('')
      setLibraryAmountG('')
      setLibraryNotes('')
      setMessage('已从食物库添加食物明细')
      await loadMealDetails()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCreateManualItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!mealRecordId) {
      setErrorMessage('缺少餐次记录 ID')
      return
    }

    if (!manualFoodName.trim()) {
      setErrorMessage('请填写食物名称')
      return
    }

    const parsedAmount = Number(manualAmountG)
    if (!manualAmountG.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('摄入重量必须大于 0')
      return
    }

    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await createMealItem(mealRecordId, {
        food_name_snapshot: manualFoodName,
        amount_g: parsedAmount,
        calories_snapshot: parseOptionalNonNegativeNumber(manualCalories, '热量'),
        protein_g_snapshot: parseOptionalNonNegativeNumber(manualProteinG, '蛋白质'),
        carbs_g_snapshot: parseOptionalNonNegativeNumber(manualCarbsG, '碳水'),
        fat_g_snapshot: parseOptionalNonNegativeNumber(manualFatG, '脂肪'),
        notes: manualNotes,
      })

      setManualFoodName('')
      setManualAmountG('')
      setManualCalories('')
      setManualProteinG('')
      setManualCarbsG('')
      setManualFatG('')
      setManualNotes('')
      setMessage('手动食物明细已添加')
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
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Fitness Tracker MVP</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {mealRecord ? mealTypeLabelMap[mealRecord.meal_type] : '餐次详情'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            备注：{mealRecord ? getOptionalText(mealRecord.notes, '无') : '加载中'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            to="/foods"
          >
            管理食物库
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            to="/today"
          >
            返回今日记录
          </Link>
        </div>
      </div>

      {message ? (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">从食物库添加</h2>
            <p className="mt-1 text-sm text-slate-600">选择已保存的食物，自动带入营养快照。</p>
          </div>

          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleSearchFoods}>
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              onChange={(event) => setFoodSearchKeyword(event.target.value)}
              placeholder="搜索食物名称"
              type="text"
              value={foodSearchKeyword}
            />
            <div className="flex gap-2">
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                type="submit"
              >
                搜索
              </button>
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={handleResetFoodSearch}
                type="button"
              >
                重置
              </button>
            </div>
          </form>
        </div>

        {foodLibraryErrorMessage ? (
          <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            食物库加载失败：{foodLibraryErrorMessage}
          </p>
        ) : null}

        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleCreateFromLibrary}>
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">食物库选择</span>
            <select
              className="rounded-md border border-slate-300 px-3 py-2"
              onChange={(event) => setSelectedFoodId(event.target.value)}
              value={selectedFoodId}
            >
              <option value="">{isFoodsLoading ? '加载食物库中...' : '请选择食物'}</option>
              {foods.map((food) => (
                <option key={food.id} value={food.id}>
                  {food.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">摄入重量 g</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              min="0"
              onChange={(event) => setLibraryAmountG(event.target.value)}
              step="0.1"
              type="number"
              value={libraryAmountG}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">备注</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              onChange={(event) => setLibraryNotes(event.target.value)}
              placeholder="可选"
              type="text"
              value={libraryNotes}
            />
          </label>

          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:col-span-2">
            {selectedFood && calculatedNutrition ? (
              <p>
                自动计算：{calculatedNutrition.calories} kcal，蛋白质 {calculatedNutrition.proteinG} g，
                碳水 {calculatedNutrition.carbsG} g，脂肪 {calculatedNutrition.fatG} g
              </p>
            ) : (
              <p>选择食物并填写摄入重量后，会自动计算营养快照。</p>
            )}
          </div>

          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:col-span-2"
            disabled={isSubmitting || isFoodsLoading}
            type="submit"
          >
            从食物库添加
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">手动添加食物</h2>
        <p className="mt-1 text-sm text-slate-600">不依赖食物库时，仍可手动录入食物名称和营养数据。</p>

        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleCreateManualItem}>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">食物名称</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              onChange={(event) => setManualFoodName(event.target.value)}
              placeholder="例如 鸡胸肉"
              type="text"
              value={manualFoodName}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">摄入重量 g</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              min="0"
              onChange={(event) => setManualAmountG(event.target.value)}
              step="0.1"
              type="number"
              value={manualAmountG}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">热量 kcal</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              min="0"
              onChange={(event) => setManualCalories(event.target.value)}
              step="0.1"
              type="number"
              value={manualCalories}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">蛋白质 g</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              min="0"
              onChange={(event) => setManualProteinG(event.target.value)}
              step="0.1"
              type="number"
              value={manualProteinG}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">碳水 g</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              min="0"
              onChange={(event) => setManualCarbsG(event.target.value)}
              step="0.1"
              type="number"
              value={manualCarbsG}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">脂肪 g</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              min="0"
              onChange={(event) => setManualFatG(event.target.value)}
              step="0.1"
              type="number"
              value={manualFatG}
            />
          </label>

          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">备注</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              onChange={(event) => setManualNotes(event.target.value)}
              placeholder="可选"
              type="text"
              value={manualNotes}
            />
          </label>

          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:col-span-2"
            disabled={isSubmitting}
            type="submit"
          >
            手动添加食物
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">食物明细列表</h2>
        {isLoading ? <p className="mt-4 text-sm text-slate-600">加载中...</p> : null}
        {!isLoading && mealItems.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">当前餐次还没有食物明细。</p>
        ) : null}

        <ul className="mt-4 grid gap-3">
          {mealItems.map((item) => (
            <li
              className="flex flex-col gap-3 rounded-md border border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between"
              key={item.id}
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{item.food_name_snapshot}</p>
                  {item.food_id ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      来自食物库
                    </span>
                  ) : null}
                </div>

                <p className="text-sm text-slate-600">
                  {formatNullableNumber(item.amount_g, 1)} g
                  {item.calories_snapshot !== null ? `，${formatNullableNumber(item.calories_snapshot, 0)} kcal` : ''}
                  {item.protein_g_snapshot !== null ? `，蛋白质 ${formatNullableNumber(item.protein_g_snapshot, 1)} g` : ''}
                  {item.carbs_g_snapshot !== null ? `，碳水 ${formatNullableNumber(item.carbs_g_snapshot, 1)} g` : ''}
                  {item.fat_g_snapshot !== null ? `，脂肪 ${formatNullableNumber(item.fat_g_snapshot, 1)} g` : ''}
                </p>

                <p className="text-sm text-slate-600">备注：{getOptionalText(item.notes, '无')}</p>
              </div>

              <button
                className="self-start rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
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
    </section>
  )
}

export default MealRecordPage
