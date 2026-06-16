import type { CardioRecord } from '../types/database'
import { getCurrentUser } from './profile'
import { supabase } from './supabase'

export type CardioIntensity = 'low' | 'medium' | 'high'

export type CreateCardioRecordInput = {
  cardio_date: string
  activity_type: string
  duration_minutes: number
  distance_km?: number | null
  calories_burned?: number | null
  intensity?: CardioIntensity | null
  notes?: string | null
}

export async function listMyCardioRecords(cardioDate?: string): Promise<CardioRecord[]> {
  const user = await getCurrentUser()
  let query = supabase
    .from('cardio_records')
    .select('*')
    .eq('user_id', user.id)

  if (cardioDate) {
    query = query.eq('cardio_date', cardioDate)
  }

  const { data, error } = await query
    .order('cardio_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as CardioRecord[]
}

export async function createCardioRecord(input: CreateCardioRecordInput): Promise<CardioRecord> {
  const user = await getCurrentUser()
  const activityType = input.activity_type.trim()

  if (!activityType) {
    throw new Error('有氧类型不能为空')
  }

  if (input.duration_minutes <= 0) {
    throw new Error('有氧时长必须大于 0')
  }

  if (input.distance_km !== null && input.distance_km !== undefined && input.distance_km < 0) {
    throw new Error('距离不能小于 0')
  }

  if (input.calories_burned !== null && input.calories_burned !== undefined && input.calories_burned < 0) {
    throw new Error('消耗热量不能小于 0')
  }

  const { data, error } = await supabase
    .from('cardio_records')
    .insert({
      user_id: user.id,
      cardio_date: input.cardio_date,
      activity_type: activityType,
      duration_minutes: input.duration_minutes,
      distance_km: input.distance_km ?? null,
      calories_burned: input.calories_burned ?? null,
      intensity: input.intensity ?? null,
      notes: input.notes?.trim() || null,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as CardioRecord
}

export async function deleteCardioRecord(cardioRecordId: string): Promise<void> {
  const user = await getCurrentUser()
  const { error } = await supabase
    .from('cardio_records')
    .delete()
    .eq('id', cardioRecordId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }
}
