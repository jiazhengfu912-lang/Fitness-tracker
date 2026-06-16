import type {
  CardioRecord,
  MealItem,
  MealRecord,
  StrengthWorkoutExercise,
  StrengthWorkoutSession,
  StrengthWorkoutSet,
} from '../types/database'
import type { BodyMetric } from './bodyMetrics'
import { getCurrentUser } from './profile'
import { supabase } from './supabase'

export type ExportRangeKey = '7d' | '30d' | 'all'

export type ExportDateRange = {
  endDate: string | null
  key: ExportRangeKey
  label: string
  startDate: string | null
}

export type ExportData = {
  bodyMetrics: {
    records: BodyMetric[]
  }
  cardio: {
    records: CardioRecord[]
  }
  meals: {
    items: MealItem[]
    records: MealRecord[]
  }
  range: ExportDateRange
  strength: {
    exercises: StrengthWorkoutExercise[]
    sessions: StrengthWorkoutSession[]
    sets: StrengthWorkoutSet[]
  }
}

type CsvColumn<T> = {
  key: keyof T
  label: string
}

function formatLocalDate(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function escapeCsvCell(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  const text = String(value)
  const escapedText = text.replace(/"/g, '""')

  if (/[",\n\r]/.test(text)) {
    return `"${escapedText}"`
  }

  return escapedText
}

function buildCsvSection<T extends Record<string, unknown>>(
  title: string,
  columns: CsvColumn<T>[],
  rows: T[],
) {
  const lines = [`[${title}]`, columns.map((column) => column.label).join(',')]

  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsvCell(row[column.key])).join(','))
  }

  return lines.join('\n')
}

function createDateFilteredQuery<T extends string>(
  tableName: T,
  dateColumn: string,
  userId: string,
  range: ExportDateRange,
) {
  let query = supabase.from(tableName).select('*').eq('user_id', userId)

  if (range.startDate) {
    query = query.gte(dateColumn, range.startDate)
  }

  if (range.endDate) {
    query = query.lte(dateColumn, range.endDate)
  }

  return query
}

function getExportedFileDate() {
  return formatLocalDate(new Date())
}

export function getExportDateRange(range: ExportRangeKey): ExportDateRange {
  if (range === 'all') {
    return {
      key: range,
      label: '全部数据',
      startDate: null,
      endDate: null,
    }
  }

  const days = range === '7d' ? 7 : 30
  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - days + 1)

  return {
    key: range,
    label: `最近 ${days} 天`,
    startDate: formatLocalDate(startDate),
    endDate: formatLocalDate(endDate),
  }
}

export async function fetchExportData(rangeKey: ExportRangeKey): Promise<ExportData> {
  const user = await getCurrentUser()
  const range = getExportDateRange(rangeKey)

  const [sessionsResult, cardioResult, mealRecordsResult, bodyMetricsResult] = await Promise.all([
    createDateFilteredQuery('strength_workout_sessions', 'workout_date', user.id, range)
      .order('workout_date', { ascending: false })
      .order('created_at', { ascending: false }),
    createDateFilteredQuery('cardio_records', 'cardio_date', user.id, range)
      .order('cardio_date', { ascending: false })
      .order('created_at', { ascending: false }),
    createDateFilteredQuery('meal_records', 'meal_date', user.id, range)
      .order('meal_date', { ascending: false })
      .order('created_at', { ascending: false }),
    createDateFilteredQuery('body_metrics', 'metric_date', user.id, range)
      .order('metric_date', { ascending: false })
      .order('created_at', { ascending: false }),
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

  if (bodyMetricsResult.error) {
    throw new Error(bodyMetricsResult.error.message)
  }

  const strengthSessions = (sessionsResult.data ?? []) as StrengthWorkoutSession[]
  const cardioRecords = (cardioResult.data ?? []) as CardioRecord[]
  const mealRecords = (mealRecordsResult.data ?? []) as MealRecord[]
  const bodyMetricRecords = (bodyMetricsResult.data ?? []) as BodyMetric[]

  const sessionIds = strengthSessions.map((session) => session.id)
  const mealRecordIds = mealRecords.map((mealRecord) => mealRecord.id)

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
    range,
    strength: {
      sessions: strengthSessions,
      exercises: strengthExercises,
      sets: strengthSets,
    },
    cardio: {
      records: cardioRecords,
    },
    meals: {
      records: mealRecords,
      items: mealItems,
    },
    bodyMetrics: {
      records: bodyMetricRecords,
    },
  }
}

export function buildExportJson(data: ExportData) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      range: data.range,
      strength: data.strength,
      cardio: data.cardio,
      meals: data.meals,
      bodyMetrics: data.bodyMetrics,
    },
    null,
    2,
  )
}

export function buildExportCsv(data: ExportData) {
  const sections = [
    buildCsvSection<StrengthWorkoutSession>(
      'strength_workout_sessions',
      [
        { key: 'id', label: 'id' },
        { key: 'user_id', label: 'user_id' },
        { key: 'workout_date', label: 'workout_date' },
        { key: 'title', label: 'title' },
        { key: 'started_at', label: 'started_at' },
        { key: 'ended_at', label: 'ended_at' },
        { key: 'notes', label: 'notes' },
        { key: 'created_at', label: 'created_at' },
        { key: 'updated_at', label: 'updated_at' },
      ],
      data.strength.sessions,
    ),
    buildCsvSection<StrengthWorkoutExercise>(
      'strength_workout_exercises',
      [
        { key: 'id', label: 'id' },
        { key: 'user_id', label: 'user_id' },
        { key: 'session_id', label: 'session_id' },
        { key: 'exercise_id', label: 'exercise_id' },
        { key: 'exercise_name_snapshot', label: 'exercise_name_snapshot' },
        { key: 'sort_order', label: 'sort_order' },
        { key: 'notes', label: 'notes' },
        { key: 'created_at', label: 'created_at' },
        { key: 'updated_at', label: 'updated_at' },
      ],
      data.strength.exercises,
    ),
    buildCsvSection<StrengthWorkoutSet>(
      'strength_workout_sets',
      [
        { key: 'id', label: 'id' },
        { key: 'user_id', label: 'user_id' },
        { key: 'workout_exercise_id', label: 'workout_exercise_id' },
        { key: 'set_number', label: 'set_number' },
        { key: 'weight_kg', label: 'weight_kg' },
        { key: 'reps', label: 'reps' },
        { key: 'is_warmup', label: 'is_warmup' },
        { key: 'rpe', label: 'rpe' },
        { key: 'notes', label: 'notes' },
        { key: 'created_at', label: 'created_at' },
        { key: 'updated_at', label: 'updated_at' },
      ],
      data.strength.sets,
    ),
    buildCsvSection<CardioRecord>(
      'cardio_records',
      [
        { key: 'id', label: 'id' },
        { key: 'user_id', label: 'user_id' },
        { key: 'cardio_date', label: 'cardio_date' },
        { key: 'activity_type', label: 'activity_type' },
        { key: 'duration_minutes', label: 'duration_minutes' },
        { key: 'distance_km', label: 'distance_km' },
        { key: 'calories_burned', label: 'calories_burned' },
        { key: 'intensity', label: 'intensity' },
        { key: 'notes', label: 'notes' },
        { key: 'created_at', label: 'created_at' },
        { key: 'updated_at', label: 'updated_at' },
      ],
      data.cardio.records,
    ),
    buildCsvSection<MealRecord>(
      'meal_records',
      [
        { key: 'id', label: 'id' },
        { key: 'user_id', label: 'user_id' },
        { key: 'meal_date', label: 'meal_date' },
        { key: 'meal_type', label: 'meal_type' },
        { key: 'notes', label: 'notes' },
        { key: 'created_at', label: 'created_at' },
        { key: 'updated_at', label: 'updated_at' },
      ],
      data.meals.records,
    ),
    buildCsvSection<MealItem>(
      'meal_items',
      [
        { key: 'id', label: 'id' },
        { key: 'user_id', label: 'user_id' },
        { key: 'meal_record_id', label: 'meal_record_id' },
        { key: 'food_id', label: 'food_id' },
        { key: 'food_name_snapshot', label: 'food_name_snapshot' },
        { key: 'amount_g', label: 'amount_g' },
        { key: 'calories_snapshot', label: 'calories_snapshot' },
        { key: 'protein_g_snapshot', label: 'protein_g_snapshot' },
        { key: 'carbs_g_snapshot', label: 'carbs_g_snapshot' },
        { key: 'fat_g_snapshot', label: 'fat_g_snapshot' },
        { key: 'notes', label: 'notes' },
        { key: 'created_at', label: 'created_at' },
        { key: 'updated_at', label: 'updated_at' },
      ],
      data.meals.items,
    ),
    buildCsvSection<BodyMetric>(
      'body_metrics',
      [
        { key: 'id', label: 'id' },
        { key: 'user_id', label: 'user_id' },
        { key: 'metric_date', label: 'metric_date' },
        { key: 'weight_kg', label: 'weight_kg' },
        { key: 'body_fat_percent', label: 'body_fat_percent' },
        { key: 'waist_cm', label: 'waist_cm' },
        { key: 'notes', label: 'notes' },
        { key: 'created_at', label: 'created_at' },
        { key: 'updated_at', label: 'updated_at' },
      ],
      data.bodyMetrics.records,
    ),
  ]

  return sections.join('\n\n')
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
}

export function buildExportFilename(extension: 'csv' | 'json') {
  return `fitness-tracker-export-${getExportedFileDate()}.${extension}`
}
