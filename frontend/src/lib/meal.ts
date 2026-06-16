import type { MealRecord, MealType } from '../types/database'
import { getCurrentUser } from './profile'
import { supabase } from './supabase'

export type CreateMealRecordInput = {
  meal_date: string
  meal_type: MealType
  notes?: string | null
}

export async function listMyMealRecords(): Promise<MealRecord[]> {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('meal_records')
    .select('*')
    .eq('user_id', user.id)
    .order('meal_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as MealRecord[]
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
