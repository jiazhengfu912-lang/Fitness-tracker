import type {
  CardioRecord,
  MealItem,
  MealRecord,
  StrengthWorkoutExercise,
  StrengthWorkoutSession,
  StrengthWorkoutSet,
} from '../types/database'
import { getCurrentUser } from './profile'
import { supabase } from './supabase'

export type HistoryByDate = {
  strengthSessions: StrengthWorkoutSession[]
  strengthExercises: StrengthWorkoutExercise[]
  strengthSets: StrengthWorkoutSet[]
  cardioRecords: CardioRecord[]
  mealRecords: MealRecord[]
  mealItems: MealItem[]
}

function assertDateString(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('日期格式必须是 YYYY-MM-DD')
  }
}

export function getTodayDateString() {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

export async function getHistoryByDate(date: string): Promise<HistoryByDate> {
  assertDateString(date)

  const user = await getCurrentUser()

  const [sessionsResult, cardioResult, mealRecordsResult] = await Promise.all([
    supabase
      .from('strength_workout_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('workout_date', date)
      .order('created_at', { ascending: true }),
    supabase
      .from('cardio_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('cardio_date', date)
      .order('created_at', { ascending: true }),
    supabase
      .from('meal_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('meal_date', date)
      .order('created_at', { ascending: true }),
  ])

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message)
  }

  if (cardioResult.error) {
    throw new Error(cardioResult.error.message)
  }

  if (mealRecordsResult.error) {
    throw new Error(mealRecordsResult.error.message)
  }

  const strengthSessions = (sessionsResult.data ?? []) as StrengthWorkoutSession[]
  const cardioRecords = (cardioResult.data ?? []) as CardioRecord[]
  const mealRecords = (mealRecordsResult.data ?? []) as MealRecord[]

  const sessionIds = strengthSessions.map((session) => session.id)
  let strengthExercises: StrengthWorkoutExercise[] = []

  if (sessionIds.length > 0) {
    const { data, error } = await supabase
      .from('strength_workout_exercises')
      .select('*')
      .eq('user_id', user.id)
      .in('session_id', sessionIds)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    strengthExercises = (data ?? []) as StrengthWorkoutExercise[]
  }

  const workoutExerciseIds = strengthExercises.map((exercise) => exercise.id)
  let strengthSets: StrengthWorkoutSet[] = []

  if (workoutExerciseIds.length > 0) {
    const { data, error } = await supabase
      .from('strength_workout_sets')
      .select('*')
      .eq('user_id', user.id)
      .in('workout_exercise_id', workoutExerciseIds)
      .order('set_number', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    strengthSets = (data ?? []) as StrengthWorkoutSet[]
  }

  const mealRecordIds = mealRecords.map((mealRecord) => mealRecord.id)
  let mealItems: MealItem[] = []

  if (mealRecordIds.length > 0) {
    const { data, error } = await supabase
      .from('meal_items')
      .select('*')
      .eq('user_id', user.id)
      .in('meal_record_id', mealRecordIds)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    mealItems = (data ?? []) as MealItem[]
  }

  return {
    strengthSessions,
    strengthExercises,
    strengthSets,
    cardioRecords,
    mealRecords,
    mealItems,
  }
}
