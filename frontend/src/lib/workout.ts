import type { StrengthWorkoutSession } from '../types/database'
import { getCurrentUser } from './profile'
import { supabase } from './supabase'

export type CreateWorkoutSessionInput = {
  workout_date: string
  title?: string | null
  started_at?: string | null
  ended_at?: string | null
  notes?: string | null
}

export async function listMyWorkoutSessions(workoutDate?: string): Promise<StrengthWorkoutSession[]> {
  const user = await getCurrentUser()
  let query = supabase
    .from('strength_workout_sessions')
    .select('*')
    .eq('user_id', user.id)

  if (workoutDate) {
    query = query.eq('workout_date', workoutDate)
  }

  const { data, error } = await query
    .order('workout_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as StrengthWorkoutSession[]
}

export async function createWorkoutSession(
  input: CreateWorkoutSessionInput,
): Promise<StrengthWorkoutSession> {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('strength_workout_sessions')
    .insert({
      user_id: user.id,
      workout_date: input.workout_date,
      title: input.title ?? null,
      started_at: input.started_at ?? null,
      ended_at: input.ended_at ?? null,
      notes: input.notes ?? null,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as StrengthWorkoutSession
}

export async function deleteWorkoutSession(sessionId: string): Promise<void> {
  const user = await getCurrentUser()
  const { error } = await supabase
    .from('strength_workout_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }
}
