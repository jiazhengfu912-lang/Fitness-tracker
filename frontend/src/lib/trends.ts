import { getCurrentUser } from './profile'
import { supabase } from './supabase'

export type TrendDays = 7 | 30 | 90

export type TrendDateRange = {
  startDate: string
  endDate: string
}

export type DailyTrendPoint = {
  date: string
  weightKg: number | null
  strengthVolume: number
  strengthSetCount: number
  cardioMinutes: number
  cardioDistanceKm: number
  cardioCalories: number
  mealCalories: number
  mealProteinG: number
  mealCarbsG: number
  mealFatG: number
}

type BodyMetricTrendRow = {
  metric_date: string
  weight_kg: number | string
  created_at: string
}

type StrengthSessionTrendRow = {
  id: string
  workout_date: string
}

type StrengthExerciseTrendRow = {
  id: string
  session_id: string
}

type StrengthSetTrendRow = {
  workout_exercise_id: string
  weight_kg: number | string | null
  reps: number | string | null
}

type CardioTrendRow = {
  cardio_date: string
  duration_minutes: number | string
  distance_km: number | string | null
  calories_burned: number | string | null
}

type MealRecordTrendRow = {
  id: string
  meal_date: string
}

type MealItemTrendRow = {
  meal_record_id: string
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

function createEmptyTrendPoint(date: string): DailyTrendPoint {
  return {
    date,
    weightKg: null,
    strengthVolume: 0,
    strengthSetCount: 0,
    cardioMinutes: 0,
    cardioDistanceKm: 0,
    cardioCalories: 0,
    mealCalories: 0,
    mealProteinG: 0,
    mealCarbsG: 0,
    mealFatG: 0,
  }
}

export function getTrendDateRange(days: TrendDays): TrendDateRange {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - days + 1)

  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
  }
}

export function buildDateSeries(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const dates: string[] = []

  while (start <= end) {
    dates.push(formatLocalDate(start))
    start.setDate(start.getDate() + 1)
  }

  return dates
}

export async function getTrendData(days: TrendDays): Promise<DailyTrendPoint[]> {
  const user = await getCurrentUser()
  const { startDate, endDate } = getTrendDateRange(days)
  const dateSeries = buildDateSeries(startDate, endDate)
  const pointsByDate = Object.fromEntries(
    dateSeries.map((date) => [date, createEmptyTrendPoint(date)]),
  ) as Record<string, DailyTrendPoint>

  const [bodyMetricsResult, sessionsResult, cardioResult, mealRecordsResult] = await Promise.all([
    supabase
      .from('body_metrics')
      .select('metric_date, weight_kg, created_at')
      .eq('user_id', user.id)
      .gte('metric_date', startDate)
      .lte('metric_date', endDate)
      .order('metric_date', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('strength_workout_sessions')
      .select('id, workout_date')
      .eq('user_id', user.id)
      .gte('workout_date', startDate)
      .lte('workout_date', endDate),
    supabase
      .from('cardio_records')
      .select('cardio_date, duration_minutes, distance_km, calories_burned')
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

  if (bodyMetricsResult.error) {
    throw new Error(bodyMetricsResult.error.message)
  }

  if (sessionsResult.error) {
    throw new Error(sessionsResult.error.message)
  }

  if (cardioResult.error) {
    throw new Error(cardioResult.error.message)
  }

  if (mealRecordsResult.error) {
    throw new Error(mealRecordsResult.error.message)
  }

  const bodyMetrics = (bodyMetricsResult.data ?? []) as BodyMetricTrendRow[]
  const sessions = (sessionsResult.data ?? []) as StrengthSessionTrendRow[]
  const cardioRecords = (cardioResult.data ?? []) as CardioTrendRow[]
  const mealRecords = (mealRecordsResult.data ?? []) as MealRecordTrendRow[]

  bodyMetrics.forEach((row) => {
    const point = pointsByDate[row.metric_date]

    if (!point) {
      return
    }

    point.weightKg = toNumber(row.weight_kg)
  })

  cardioRecords.forEach((row) => {
    const point = pointsByDate[row.cardio_date]

    if (!point) {
      return
    }

    point.cardioMinutes += toNumber(row.duration_minutes)
    point.cardioDistanceKm += toNumber(row.distance_km)
    point.cardioCalories += toNumber(row.calories_burned)
  })

  const sessionIds = sessions.map((session) => session.id)
  const sessionIdToDate = Object.fromEntries(
    sessions.map((session) => [session.id, session.workout_date]),
  ) as Record<string, string>

  if (sessionIds.length > 0) {
    const { data: exercisesData, error: exercisesError } = await supabase
      .from('strength_workout_exercises')
      .select('id, session_id')
      .eq('user_id', user.id)
      .in('session_id', sessionIds)

    if (exercisesError) {
      throw new Error(exercisesError.message)
    }

    const exercises = (exercisesData ?? []) as StrengthExerciseTrendRow[]
    const exerciseIds = exercises.map((exercise) => exercise.id)
    const exerciseIdToDate = Object.fromEntries(
      exercises.map((exercise) => [exercise.id, sessionIdToDate[exercise.session_id]]),
    ) as Record<string, string>

    if (exerciseIds.length > 0) {
      const { data: setsData, error: setsError } = await supabase
        .from('strength_workout_sets')
        .select('workout_exercise_id, weight_kg, reps')
        .eq('user_id', user.id)
        .in('workout_exercise_id', exerciseIds)

      if (setsError) {
        throw new Error(setsError.message)
      }

      const sets = (setsData ?? []) as StrengthSetTrendRow[]

      sets.forEach((set) => {
        const workoutDate = exerciseIdToDate[set.workout_exercise_id]
        const point = workoutDate ? pointsByDate[workoutDate] : null

        if (!point) {
          return
        }

        point.strengthVolume += toNumber(set.weight_kg) * toNumber(set.reps)
        point.strengthSetCount += 1
      })
    }
  }

  const mealRecordIds = mealRecords.map((mealRecord) => mealRecord.id)
  const mealRecordIdToDate = Object.fromEntries(
    mealRecords.map((mealRecord) => [mealRecord.id, mealRecord.meal_date]),
  ) as Record<string, string>

  if (mealRecordIds.length > 0) {
    const { data: mealItemsData, error: mealItemsError } = await supabase
      .from('meal_items')
      .select('meal_record_id, calories_snapshot, protein_g_snapshot, carbs_g_snapshot, fat_g_snapshot')
      .eq('user_id', user.id)
      .in('meal_record_id', mealRecordIds)

    if (mealItemsError) {
      throw new Error(mealItemsError.message)
    }

    const mealItems = (mealItemsData ?? []) as MealItemTrendRow[]

    mealItems.forEach((item) => {
      const mealDate = mealRecordIdToDate[item.meal_record_id]
      const point = mealDate ? pointsByDate[mealDate] : null

      if (!point) {
        return
      }

      point.mealCalories += toNumber(item.calories_snapshot)
      point.mealProteinG += toNumber(item.protein_g_snapshot)
      point.mealCarbsG += toNumber(item.carbs_g_snapshot)
      point.mealFatG += toNumber(item.fat_g_snapshot)
    })
  }

  return dateSeries.map((date) => pointsByDate[date])
}
