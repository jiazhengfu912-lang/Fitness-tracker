import type { MealItem, MealRecord, MealType } from '../types/database'
import { getCurrentUser } from './profile'
import { supabase } from './supabase'

export type CreateMealRecordInput = {
  meal_date: string
  meal_type: MealType
  notes?: string | null
}

export type CreateMealItemInput = {
  food_name_snapshot: string
  amount_g: number
  calories_snapshot?: number | null
  protein_g_snapshot?: number | null
  carbs_g_snapshot?: number | null
  fat_g_snapshot?: number | null
  notes?: string | null
}

export async function listMyMealRecords(mealDate?: string): Promise<MealRecord[]> {
  const user = await getCurrentUser()
  let query = supabase
    .from('meal_records')
    .select('*')
    .eq('user_id', user.id)

  if (mealDate) {
    query = query.eq('meal_date', mealDate)
  }

  const { data, error } = await query
    .order('meal_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as MealRecord[]
}

export async function getMealRecordById(mealRecordId: string): Promise<MealRecord> {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('meal_records')
    .select('*')
    .eq('id', mealRecordId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('餐次记录不存在或无权访问')
  }

  return data as MealRecord
}

export async function createMealRecord(input: CreateMealRecordInput): Promise<MealRecord> {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('meal_records')
    .insert({
      user_id: user.id,
      meal_date: input.meal_date,
      meal_type: input.meal_type,
      notes: input.notes ?? null,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as MealRecord
}

export async function listMealItems(mealRecordId: string): Promise<MealItem[]> {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('meal_items')
    .select('*')
    .eq('meal_record_id', mealRecordId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as MealItem[]
}

export async function createMealItem(
  mealRecordId: string,
  input: CreateMealItemInput,
): Promise<MealItem> {
  const user = await getCurrentUser()
  const foodName = input.food_name_snapshot.trim()

  if (!foodName) {
    throw new Error('食物名称不能为空')
  }

  if (input.amount_g <= 0) {
    throw new Error('摄入重量必须大于 0')
  }

  await getMealRecordById(mealRecordId)

  const { data, error } = await supabase
    .from('meal_items')
    .insert({
      user_id: user.id,
      meal_record_id: mealRecordId,
      food_id: null,
      food_name_snapshot: foodName,
      amount_g: input.amount_g,
      calories_snapshot: input.calories_snapshot ?? null,
      protein_g_snapshot: input.protein_g_snapshot ?? null,
      carbs_g_snapshot: input.carbs_g_snapshot ?? null,
      fat_g_snapshot: input.fat_g_snapshot ?? null,
      notes: input.notes?.trim() || null,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as MealItem
}

export async function deleteMealItem(mealItemId: string): Promise<void> {
  const user = await getCurrentUser()
  const { error } = await supabase
    .from('meal_items')
    .delete()
    .eq('id', mealItemId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteMealRecord(mealRecordId: string): Promise<void> {
  const user = await getCurrentUser()
  const { error } = await supabase
    .from('meal_records')
    .delete()
    .eq('id', mealRecordId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }
}
