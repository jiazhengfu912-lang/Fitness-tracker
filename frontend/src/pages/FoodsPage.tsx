import type { FormEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createFood,
  deleteFood,
  listFoods,
  searchFoods,
  updateFood,
  type FoodInput,
} from '../lib/foods'
import type { Food } from '../types/database'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败'
}

function parseRequiredNonNegativeNumber(value: string, fieldLabel: string) {
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    throw new Error(`${fieldLabel}不能为空`)
  }

  const parsedValue = Number(trimmedValue)
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error(`${fieldLabel}必须大于等于 0`)
  }

  return parsedValue
}

function getFoodFormInput(formState: {
  name: string
  caloriesPer100g: string
  proteinPer100g: string
  carbsPer100g: string
  fatPer100g: string
}): FoodInput {
  return {
    name: formState.name,
    calories_per_100g: parseRequiredNonNegativeNumber(formState.caloriesPer100g, '每 100g 热量'),
    protein_per_100g: parseRequiredNonNegativeNumber(formState.proteinPer100g, '每 100g 蛋白质'),
    carbs_per_100g: parseRequiredNonNegativeNumber(formState.carbsPer100g, '每 100g 碳水'),
    fat_per_100g: parseRequiredNonNegativeNumber(formState.fatPer100g, '每 100g 脂肪'),
  }
}

function formatNullableNumber(value: number | null, digits = 1) {
  if (value === null) {
    return '0'
  }

  return value.toFixed(digits).replace(/\.0$/, '')
}

function FoodsPage() {
  const [foods, setFoods] = useState<Food[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [caloriesPer100g, setCaloriesPer100g] = useState('')
  const [proteinPer100g, setProteinPer100g] = useState('')
  const [carbsPer100g, setCarbsPer100g] = useState('')
  const [fatPer100g, setFatPer100g] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const loadFoodsData = useCallback(async (keyword?: string) => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const nextFoods = keyword?.trim() ? await searchFoods(keyword) : await listFoods()
      setFoods(nextFoods)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFoodsData()
  }, [loadFoodsData])

  function resetForm() {
    setEditingFoodId(null)
    setName('')
    setCaloriesPer100g('')
    setProteinPer100g('')
    setCarbsPer100g('')
    setFatPer100g('')
  }

  function startEditing(food: Food) {
    setEditingFoodId(food.id)
    setName(food.name)
    setCaloriesPer100g(food.calories_per_100g?.toString() ?? '')
    setProteinPer100g(food.protein_per_100g?.toString() ?? '')
    setCarbsPer100g(food.carbs_per_100g?.toString() ?? '')
    setFatPer100g(food.fat_per_100g?.toString() ?? '')
    setMessage('')
    setErrorMessage('')
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    await loadFoodsData(searchKeyword)
  }

  async function handleResetSearch() {
    setSearchKeyword('')
    setMessage('')
    await loadFoodsData()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      const input = getFoodFormInput({
        name,
        caloriesPer100g,
        proteinPer100g,
        carbsPer100g,
        fatPer100g,
      })

      if (editingFoodId) {
        await updateFood(editingFoodId, input)
        setMessage('食物库记录已更新')
      } else {
        await createFood(input)
        setMessage('食物已加入食物库')
      }

      resetForm()
      await loadFoodsData(searchKeyword)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(foodId: string) {
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      await deleteFood(foodId)
      if (editingFoodId === foodId) {
        resetForm()
      }
      setMessage('食物库记录已删除')
      await loadFoodsData(searchKeyword)
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
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">食物库</h1>
          <p className="mt-2 text-sm text-slate-600">
            复用常吃食物的每 100g 营养数据，后续可直接带入餐次明细。
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          to="/"
        >
          返回仪表盘
        </Link>
      </div>

      {message ? (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">{editingFoodId ? '编辑食物' : '创建食物'}</h2>
          {editingFoodId ? (
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={resetForm}
              type="button"
            >
              取消编辑
            </button>
          ) : null}
        </div>

        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">食物名称</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              onChange={(event) => setName(event.target.value)}
              placeholder="例如 鸡胸肉"
              type="text"
              value={name}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">每 100g 热量 kcal</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              min="0"
              onChange={(event) => setCaloriesPer100g(event.target.value)}
              step="0.1"
              type="number"
              value={caloriesPer100g}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">每 100g 蛋白质 g</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              min="0"
              onChange={(event) => setProteinPer100g(event.target.value)}
              step="0.1"
              type="number"
              value={proteinPer100g}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">每 100g 碳水 g</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              min="0"
              onChange={(event) => setCarbsPer100g(event.target.value)}
              step="0.1"
              type="number"
              value={carbsPer100g}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">每 100g 脂肪 g</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              min="0"
              onChange={(event) => setFatPer100g(event.target.value)}
              step="0.1"
              type="number"
              value={fatPer100g}
            />
          </label>

          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:col-span-2"
            disabled={isSubmitting}
            type="submit"
          >
            {editingFoodId ? '保存修改' : '加入食物库'}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">食物库列表</h2>

          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleSearch}>
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="搜索食物名称"
              type="text"
              value={searchKeyword}
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
                onClick={handleResetSearch}
                type="button"
              >
                重置
              </button>
            </div>
          </form>
        </div>

        {isLoading ? <p className="mt-4 text-sm text-slate-600">加载中...</p> : null}
        {!isLoading && foods.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">当前还没有食物库数据。</p>
        ) : null}

        <ul className="mt-4 grid gap-3">
          {foods.map((food) => (
            <li
              className="flex flex-col gap-3 rounded-md border border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between"
              key={food.id}
            >
              <div className="space-y-1">
                <p className="font-medium text-slate-900">{food.name}</p>
                <p className="text-sm text-slate-600">
                  每 100g：{formatNullableNumber(food.calories_per_100g, 0)} kcal，蛋白质{' '}
                  {formatNullableNumber(food.protein_per_100g)} g，碳水{' '}
                  {formatNullableNumber(food.carbs_per_100g)} g，脂肪{' '}
                  {formatNullableNumber(food.fat_per_100g)} g
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => startEditing(food)}
                  type="button"
                >
                  编辑
                </button>
                <button
                  className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  disabled={isSubmitting}
                  onClick={() => handleDelete(food.id)}
                  type="button"
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}

export default FoodsPage
