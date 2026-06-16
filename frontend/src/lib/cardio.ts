import type { CardioRecord } from '../types/database'
import { getCurrentUser } from './profile'
import { supabase } from './supabase'

export type CreateCardioRecordInput = {
  cardio_date: string
  activity_type: string
  duration_minutes: number
  distance_km?: number | null
  calories_burned?: number | null
  intensity?: string | null
  notes?: string | null
}

export async function listMyCardioRecords(): Promise<CardioRecord[]> {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('cardio_records')
    .select('*')
    .eq('user_id', user.id)
    .order('cardio_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as CardioRecord[]
}

export async function createCardioRecord(input: CreateCardioRecordInput): Promise<CardioRecord> {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('cardio_records')
    .insert({
      user_id: user.id,
      cardio_date: input.cardio_date,
      activity_type: input.activity_type,
      duration_minutes: input.duration_minutes,
      distance_km: input.distance_km ?? null,
      calories_burned: input.calories_burned ?? null,
      intensity: input.intensity ?? null,
      notes: input.notes ?? null,
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
