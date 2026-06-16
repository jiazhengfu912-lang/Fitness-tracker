import type { Food } from '../types/database'
import { getCurrentUser } from './profile'
import { supabase } from './supabase'

export type FoodInput = {
  name: string
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  is_active?: boolean
}

export type CalculatedNutrition = {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function normalizeNonNegativeNumber(value: number, fieldLabel: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldLabel}必须大于等于 0`)
  }

  return value
}

function normalizeFoodInput(input: FoodInput) {
  const name = input.name.trim()
  if (!name) {
    throw new Error('食物名称不能为空')
  }

  return {
    name,
    calories_per_100g: normalizeNonNegativeNumber(input.calories_per_100g, '每 100g 热量'),
    protein_per_100g: normalizeNonNegativeNumber(input.protein_per_100g, '每 100g 蛋白质'),
    carbs_per_100g: normalizeNonNegativeNumber(input.carbs_per_100g, '每 100g 碳水'),
    fat_per_100g: normalizeNonNegativeNumber(input.fat_per_100g, '每 100g 脂肪'),
    is_active: input.is_active ?? true,
  }
}

export async function listFoods(): Promise<Food[]> {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Food[]
}

export async function searchFoods(keyword: string): Promise<Food[]> {
  const trimmedKeyword = keyword.trim()
  if (!trimmedKeyword) {
    return listFoods()
  }

  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('user_id', user.id)
    .ilike('name', `%${trimmedKeyword}%`)
    .order('name', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Food[]
}

export async function createFood(input: FoodInput): Promise<Food> {
  const user = await getCurrentUser()
  const normalizedInput = normalizeFoodInput(input)

  const { data, error } = await supabase
    .from('foods')
    .insert({
      user_id: user.id,
      ...normalizedInput,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Food
}

export async function updateFood(foodId: string, input: FoodInput): Promise<Food> {
  const user = await getCurrentUser()
  const normalizedInput = normalizeFoodInput(input)

  const { data, error } = await supabase
    .from('foods')
    .update(normalizedInput)
    .eq('id', foodId)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Food
}

export async function deleteFood(foodId: string): Promise<void> {
  const user = await getCurrentUser()
  const { error } = await supabase
    .from('foods')
    .delete()
    .eq('id', foodId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }
}

export function calculateNutritionByAmount(food: Food, amountG: number): CalculatedNutrition {
  if (!Number.isFinite(amountG) || amountG <= 0) {
    throw new Error('摄入克数必须大于 0')
  }

  const factor = amountG / 100

  return {
    calories: roundTo((food.calories_per_100g ?? 0) * factor, 0),
    proteinG: roundTo((food.protein_per_100g ?? 0) * factor, 1),
    carbsG: roundTo((food.carbs_per_100g ?? 0) * factor, 1),
    fatG: roundTo((food.fat_per_100g ?? 0) * factor, 1),
  }
}
