export type DateString = string
export type TimestampString = string
export type UuidString = string

export type WeightUnit = 'kg' | 'lb'
export type DistanceUnit = 'km' | 'mile'
export type WeekStartDay = 'monday' | 'sunday'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type Profile = {
  id: UuidString
  nickname: string | null
  height_cm: number | null
  current_weight_kg: number | null
  target_weight_kg: number | null
  gender: string | null
  birth_date: DateString | null
  created_at: TimestampString
  updated_at: TimestampString
}

export type UserPreference = {
  id: UuidString
  user_id: UuidString
  weight_unit: WeightUnit
  distance_unit: DistanceUnit
  week_start_day: WeekStartDay
  created_at: TimestampString
  updated_at: TimestampString
}

export type StrengthExercise = {
  id: UuidString
  user_id: UuidString
  name: string
  body_part: string | null
  equipment: string | null
  is_active: boolean
  created_at: TimestampString
  updated_at: TimestampString
}

export type StrengthWorkoutSession = {
  id: UuidString
  user_id: UuidString
  workout_date: DateString
  title: string | null
  started_at: TimestampString | null
  ended_at: TimestampString | null
  notes: string | null
  created_at: TimestampString
  updated_at: TimestampString
}

export type StrengthWorkoutExercise = {
  id: UuidString
  user_id: UuidString
  session_id: UuidString
  exercise_id: UuidString | null
  exercise_name_snapshot: string
  sort_order: number
  notes: string | null
  created_at: TimestampString
  updated_at: TimestampString
}

export type StrengthWorkoutSet = {
  id: UuidString
  user_id: UuidString
  workout_exercise_id: UuidString
  set_number: number
  weight_kg: number
  reps: number
  is_warmup: boolean
  rpe: number | null
  notes: string | null
  created_at: TimestampString
  updated_at: TimestampString
}

export type CardioRecord = {
  id: UuidString
  user_id: UuidString
  cardio_date: DateString
  activity_type: string
  duration_minutes: number
  distance_km: number | null
  calories_burned: number | null
  intensity: string | null
  notes: string | null
  created_at: TimestampString
  updated_at: TimestampString
}

export type Food = {
  id: UuidString
  user_id: UuidString
  name: string
  calories_per_100g: number | null
  protein_per_100g: number | null
  carbs_per_100g: number | null
  fat_per_100g: number | null
  is_active: boolean
  created_at: TimestampString
  updated_at: TimestampString
}

export type MealRecord = {
  id: UuidString
  user_id: UuidString
  meal_date: DateString
  meal_type: MealType
  notes: string | null
  created_at: TimestampString
  updated_at: TimestampString
}

export type MealItem = {
  id: UuidString
  user_id: UuidString
  meal_record_id: UuidString
  food_id: UuidString | null
  food_name_snapshot: string
  amount_g: number
  calories_snapshot: number | null
  protein_g_snapshot: number | null
  carbs_g_snapshot: number | null
  fat_g_snapshot: number | null
  notes: string | null
  created_at: TimestampString
  updated_at: TimestampString
}
