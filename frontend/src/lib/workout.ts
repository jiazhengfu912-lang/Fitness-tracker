import type {
  StrengthWorkoutExercise,
  StrengthWorkoutSession,
  StrengthWorkoutSet,
} from '../types/database'
import { getCurrentUser } from './profile'
import { supabase } from './supabase'

export type CreateWorkoutSessionInput = {
  workout_date: string
  title?: string | null
  started_at?: string | null
  ended_at?: string | null
  notes?: string | null
}

export type CreateWorkoutExerciseInput = {
  exercise_name_snapshot: string
  notes?: string | null
}

export type CreateWorkoutSetInput = {
  weight_kg: number
  reps: number
  is_warmup?: boolean
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

export async function getWorkoutSessionById(sessionId: string): Promise<StrengthWorkoutSession> {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('strength_workout_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('训练会话不存在或无权访问')
  }

  return data as StrengthWorkoutSession
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

export async function listWorkoutExercises(sessionId: string): Promise<StrengthWorkoutExercise[]> {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('strength_workout_exercises')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as StrengthWorkoutExercise[]
}

export async function createWorkoutExercise(
  sessionId: string,
  input: CreateWorkoutExerciseInput,
): Promise<StrengthWorkoutExercise> {
  const user = await getCurrentUser()
  const exerciseName = input.exercise_name_snapshot.trim()

  if (!exerciseName) {
    throw new Error('动作名称不能为空')
  }

  await getWorkoutSessionById(sessionId)

  const existingExercises = await listWorkoutExercises(sessionId)
  const nextSortOrder = existingExercises.length + 1

  const { data, error } = await supabase
    .from('strength_workout_exercises')
    .insert({
      user_id: user.id,
      session_id: sessionId,
      exercise_id: null,
      exercise_name_snapshot: exerciseName,
      sort_order: nextSortOrder,
      notes: input.notes?.trim() || null,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as StrengthWorkoutExercise
}

export async function deleteWorkoutExercise(workoutExerciseId: string): Promise<void> {
  const user = await getCurrentUser()
  const { error } = await supabase
    .from('strength_workout_exercises')
    .delete()
    .eq('id', workoutExerciseId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function listWorkoutSets(workoutExerciseId: string): Promise<StrengthWorkoutSet[]> {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('strength_workout_sets')
    .select('*')
    .eq('workout_exercise_id', workoutExerciseId)
    .eq('user_id', user.id)
    .order('set_number', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as StrengthWorkoutSet[]
}

export async function createWorkoutSet(
  workoutExerciseId: string,
  input: CreateWorkoutSetInput,
): Promise<StrengthWorkoutSet> {
  const user = await getCurrentUser()

  if (input.weight_kg < 0) {
    throw new Error('重量必须大于等于 0')
  }

  if (input.reps <= 0) {
    throw new Error('次数必须大于 0')
  }

  const { data: workoutExercise, error: exerciseError } = await supabase
    .from('strength_workout_exercises')
    .select('id')
    .eq('id', workoutExerciseId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (exerciseError) {
    throw new Error(exerciseError.message)
  }

  if (!workoutExercise) {
    throw new Error('训练动作不存在或无权访问')
  }

  const existingSets = await listWorkoutSets(workoutExerciseId)
  const nextSetNumber = existingSets.length + 1

  const { data, error } = await supabase
    .from('strength_workout_sets')
    .insert({
      user_id: user.id,
      workout_exercise_id: workoutExerciseId,
      set_number: nextSetNumber,
      weight_kg: input.weight_kg,
      reps: input.reps,
      is_warmup: input.is_warmup ?? false,
      notes: input.notes?.trim() || null,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as StrengthWorkoutSet
}

export async function deleteWorkoutSet(setId: string): Promise<void> {
  const user = await getCurrentUser()
  const { error } = await supabase
    .from('strength_workout_sets')
    .delete()
    .eq('id', setId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }
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
