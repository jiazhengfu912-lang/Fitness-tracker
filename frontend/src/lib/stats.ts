import { getCurrentUser } from './profile'
import { supabase } from './supabase'

export type StatsDays = 7 | 30

export type DateRange = {
  startDate: string
  endDate: string
}

export type BasicStats = DateRange & {
  days: StatsDays
  strengthTrainingDays: number
  strengthSessionCount: number
  strengthExerciseCount: number
  strengthSetCount: number
  strengthTotalVolume: number
  cardioRecordCount: number
  cardioTotalMinutes: number
  cardioTotalDistanceKm: number
  cardioTotalCalories: number
  mealRecordCount: number
  mealItemCount: number
  mealTotalAmountG: number
  mealTotalCalories: number
  mealTotalProteinG: number
  mealTotalCarbsG: number
  mealTotalFatG: number
}

type StrengthSessionStatsRow = {
  id: string
  workout_date: string
}

type StrengthExerciseStatsRow = {
  id: string
  session_id: string
}

type StrengthSetStatsRow = {
  workout_exercise_id: string
  weight_kg: number | string | null
  reps: number | string | null
}

type CardioStatsRow = {
  duration_minutes: number | string
  distance_km: number | string | null
  calories_burned: number | string | null
}

type MealRecordStatsRow = {
  id: string
  meal_date: string
}

type MealItemStatsRow = {
  meal_record_id: string
  amount_g: number | string
  calories_snapshot: number | string | null
  protein_g_snapshot: number | string | null
  carbs_g_snapshot: number | string | null
  fat_g_snapshot: number | string | null
}

function formatLocalDate(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : 0
  }

  return 0
}

export function getDateRange(days: StatsDays): DateRange {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - days + 1)

  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
  }
}

export async function getBasicStats(days: StatsDays): Promise<BasicStats> {
  const user = await getCurrentUser()
  const { startDate, endDate } = getDateRange(days)

  const [sessionsResult, cardioResult, mealRecordsResult] = await Promise.all([
    supabase
      .from('strength_workout_sessions')
      .select('id, workout_date')
      .eq('user_id', user.id)
      .gte('workout_date', startDate)
      .lte('workout_date', endDate),
    supabase
      .from('cardio_records')
      .select('duration_minutes, distance_km, calories_burned')
      .eq('user_id', user.id)
      .gte('cardio_date', startDate)
      .lte('cardio_date', endDate),
    supabase
      .from('meal_records')
      .select('id, meal_date')
      .eq('user_id', user.id)
      .gte('meal_date', startDate)
      .lte('meal_date', endDate),
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

  const sessions = (sessionsResult.data ?? []) as StrengthSessionStatsRow[]
  const cardioRecords = (cardioResult.data ?? []) as CardioStatsRow[]
  const mealRecords = (mealRecordsResult.data ?? []) as MealRecordStatsRow[]
  const sessionIds = sessions.map((session) => session.id)
  const mealRecordIds = mealRecords.map((mealRecord) => mealRecord.id)

  let exercises: StrengthExerciseStatsRow[] = []
  if (sessionIds.length > 0) {
    const { data, error } = await supabase
      .from('strength_workout_exercises')
      .select('id, session_id')
      .eq('user_id', user.id)
      .in('session_id', sessionIds)

    if (error) {
      throw new Error(error.message)
    }

    exercises = (data ?? []) as StrengthExerciseStatsRow[]
  }

  const workoutExerciseIds = exercises.map((exercise) => exercise.id)
  let sets: StrengthSetStatsRow[] = []
  if (workoutExerciseIds.length > 0) {
    const { data, error } = await supabase
      .from('strength_workout_sets')
      .select('workout_exercise_id, weight_kg, reps')
      .eq('user_id', user.id)
      .in('workout_exercise_id', workoutExerciseIds)

    if (error) {
      throw new Error(error.message)
    }

    sets = (data ?? []) as StrengthSetStatsRow[]
  }

  let mealItems: MealItemStatsRow[] = []
  if (mealRecordIds.length > 0) {
    const { data, error } = await supabase
      .from('meal_items')
      .select('meal_record_id, amount_g, calories_snapshot, protein_g_snapshot, carbs_g_snapshot, fat_g_snapshot')
      .eq('user_id', user.id)
      .in('meal_record_id', mealRecordIds)

    if (error) {
      throw new Error(error.message)
    }

    mealItems = (data ?? []) as MealItemStatsRow[]
  }

  return {
    days,
    startDate,
    endDate,
    strengthTrainingDays: new Set(sessions.map((session) => session.workout_date)).size,
    strengthSessionCount: sessions.length,
    strengthExerciseCount: exercises.length,
    strengthSetCount: sets.length,
    strengthTotalVolume: sets.reduce(
      (sum, set) => sum + toNumber(set.weight_kg) * toNumber(set.reps),
      0,
    ),
    cardioRecordCount: cardioRecords.length,
    cardioTotalMinutes: cardioRecords.reduce(
      (sum, record) => sum + toNumber(record.duration_minutes),
      0,
    ),
    cardioTotalDistanceKm: cardioRecords.reduce(
      (sum, record) => sum + toNumber(record.distance_km),
      0,
    ),
    cardioTotalCalories: cardioRecords.reduce(
      (sum, record) => sum + toNumber(record.calories_burned),
      0,
    ),
    mealRecordCount: mealRecords.length,
    mealItemCount: mealItems.length,
    mealTotalAmountG: mealItems.reduce((sum, item) => sum + toNumber(item.amount_g), 0),
    mealTotalCalories: mealItems.reduce(
      (sum, item) => sum + toNumber(item.calories_snapshot),
      0,
    ),
    mealTotalProteinG: mealItems.reduce(
      (sum, item) => sum + toNumber(item.protein_g_snapshot),
      0,
    ),
    mealTotalCarbsG: mealItems.reduce(
      (sum, item) => sum + toNumber(item.carbs_g_snapshot),
      0,
    ),
    mealTotalFatG: mealItems.reduce(
      (sum, item) => sum + toNumber(item.fat_g_snapshot),
      0,
    ),
  }
}
