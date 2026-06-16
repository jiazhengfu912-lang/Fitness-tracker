import { listMyBodyMetrics } from './bodyMetrics'
import { listMealItems, listMyMealRecords } from './meal'
import { getCurrentUser } from './profile'
import { getBasicStats } from './stats'
import { supabase } from './supabase'

export type FitnessGoalType =
  | 'target_weight_kg'
  | 'weekly_strength_sessions'
  | 'weekly_cardio_minutes'
  | 'daily_calories'
  | 'daily_protein_g'
  | 'daily_carbs_g'
  | 'daily_fat_g'

export type FitnessGoalPeriod = 'daily' | 'weekly' | 'monthly' | 'date_range' | 'current'

export type FitnessGoalStatus = 'active' | 'paused' | 'completed' | 'archived'

export type FitnessGoal = {
  id: string
  user_id: string
  goal_type: FitnessGoalType
  target_value: number
  unit: string
  period: FitnessGoalPeriod
  start_date: string
  end_date: string | null
  status: FitnessGoalStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type FitnessGoalProgress = {
  currentValue: number | null
  targetValue: number
  unit: string
  text: string
  ratio: number | null
}

export type CreateFitnessGoalInput = {
  goal_type: FitnessGoalType
  target_value: number
  unit: string
  period: FitnessGoalPeriod
  start_date: string
  end_date?: string | null
  status?: FitnessGoalStatus
  notes?: string | null
}

export type UpdateFitnessGoalInput = {
  target_value: number
  unit: string
  period: FitnessGoalPeriod
  start_date: string
  end_date?: string | null
  status: FitnessGoalStatus
  notes?: string | null
}

type DailyMealTotals = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export const fitnessGoalTypes: FitnessGoalType[] = [
  'target_weight_kg',
  'weekly_strength_sessions',
  'weekly_cardio_minutes',
  'daily_calories',
  'daily_protein_g',
  'daily_carbs_g',
  'daily_fat_g',
]

export const fitnessGoalPeriods: FitnessGoalPeriod[] = [
  'daily',
  'weekly',
  'monthly',
  'date_range',
  'current',
]

export const fitnessGoalStatuses: FitnessGoalStatus[] = [
  'active',
  'paused',
  'completed',
  'archived',
]

function getTodayDateString() {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function normalizeOptionalText(value?: string | null) {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : null
}

function normalizeUnit(goalType: FitnessGoalType, unit: string) {
  const trimmedUnit = unit.trim()
  return trimmedUnit || getGoalUnitLabel(goalType)
}

function assertDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('日期格式必须是 YYYY-MM-DD')
  }
}

function validateDateRange(startDate: string, endDate?: string | null) {
  assertDateString(startDate)

  if (!endDate) {
    return
  }

  assertDateString(endDate)

  if (endDate < startDate) {
    throw new Error('结束日期不能早于开始日期')
  }
}

function validateTargetValue(targetValue: number) {
  if (!Number.isFinite(targetValue) || targetValue <= 0) {
    throw new Error('目标值必须大于 0')
  }
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

function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits,
  }).format(value)
}

async function getTodayMealTotals(): Promise<DailyMealTotals> {
  const today = getTodayDateString()
  const mealRecords = await listMyMealRecords(today)

  if (mealRecords.length === 0) {
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    }
  }

  const mealItemsEntries = await Promise.all(mealRecords.map((record) => listMealItems(record.id)))
  const mealItems = mealItemsEntries.flat()

  return {
    calories: mealItems.reduce((sum, item) => sum + toNumber(item.calories_snapshot), 0),
    protein: mealItems.reduce((sum, item) => sum + toNumber(item.protein_g_snapshot), 0),
    carbs: mealItems.reduce((sum, item) => sum + toNumber(item.carbs_g_snapshot), 0),
    fat: mealItems.reduce((sum, item) => sum + toNumber(item.fat_g_snapshot), 0),
  }
}

export function getGoalTypeLabel(goalType: FitnessGoalType) {
  switch (goalType) {
    case 'target_weight_kg':
      return '目标体重'
    case 'weekly_strength_sessions':
      return '每周力量训练次数'
    case 'weekly_cardio_minutes':
      return '每周有氧时长'
    case 'daily_calories':
      return '每日热量目标'
    case 'daily_protein_g':
      return '每日蛋白质目标'
    case 'daily_carbs_g':
      return '每日碳水目标'
    case 'daily_fat_g':
      return '每日脂肪目标'
    default:
      return goalType
  }
}

export function getGoalUnitLabel(goalType: FitnessGoalType) {
  switch (goalType) {
    case 'target_weight_kg':
      return 'kg'
    case 'weekly_strength_sessions':
      return '次'
    case 'weekly_cardio_minutes':
      return '分钟'
    case 'daily_calories':
      return 'kcal'
    case 'daily_protein_g':
    case 'daily_carbs_g':
    case 'daily_fat_g':
      return 'g'
    default:
      return ''
  }
}

export function getDefaultPeriod(goalType: FitnessGoalType): FitnessGoalPeriod {
  switch (goalType) {
    case 'target_weight_kg':
      return 'current'
    case 'weekly_strength_sessions':
    case 'weekly_cardio_minutes':
      return 'weekly'
    case 'daily_calories':
    case 'daily_protein_g':
    case 'daily_carbs_g':
    case 'daily_fat_g':
      return 'daily'
    default:
      return 'current'
  }
}

export async function listFitnessGoals(): Promise<FitnessGoal[]> {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('fitness_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as FitnessGoal[]
}

export async function listActiveFitnessGoals(): Promise<FitnessGoal[]> {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('fitness_goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as FitnessGoal[]
}

export async function createFitnessGoal(input: CreateFitnessGoalInput): Promise<FitnessGoal> {
  validateTargetValue(input.target_value)
  validateDateRange(input.start_date, input.end_date)

  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('fitness_goals')
    .insert({
      user_id: user.id,
      goal_type: input.goal_type,
      target_value: input.target_value,
      unit: normalizeUnit(input.goal_type, input.unit),
      period: input.period,
      start_date: input.start_date,
      end_date: input.end_date ?? null,
      status: input.status ?? 'active',
      notes: normalizeOptionalText(input.notes),
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as FitnessGoal
}

export async function updateFitnessGoal(
  goalId: string,
  input: UpdateFitnessGoalInput,
): Promise<FitnessGoal> {
  const user = await getCurrentUser()
  validateTargetValue(input.target_value)
  validateDateRange(input.start_date, input.end_date)

  const { data: existingGoal, error: fetchError } = await supabase
    .from('fitness_goals')
    .select('goal_type')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  if (!existingGoal) {
    throw new Error('健身目标不存在或无权访问')
  }

  const { data, error } = await supabase
    .from('fitness_goals')
    .update({
      target_value: input.target_value,
      unit: normalizeUnit(existingGoal.goal_type as FitnessGoalType, input.unit),
      period: input.period,
      start_date: input.start_date,
      end_date: input.end_date ?? null,
      status: input.status,
      notes: normalizeOptionalText(input.notes),
    })
    .eq('id', goalId)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as FitnessGoal
}

export async function deleteFitnessGoal(goalId: string): Promise<void> {
  const user = await getCurrentUser()
  const { error } = await supabase
    .from('fitness_goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function getGoalProgress(goal: FitnessGoal): Promise<FitnessGoalProgress> {
  switch (goal.goal_type) {
    case 'target_weight_kg': {
      const bodyMetrics = await listMyBodyMetrics()

      if (bodyMetrics.length === 0) {
        return {
          currentValue: null,
          targetValue: goal.target_value,
          unit: goal.unit,
          text: '暂无体重数据',
          ratio: null,
        }
      }

      const currentWeight = bodyMetrics[0].weight_kg
      return {
        currentValue: currentWeight,
        targetValue: goal.target_value,
        unit: goal.unit,
        text: `${formatNumber(currentWeight, 1)} / ${formatNumber(goal.target_value, 1)} ${goal.unit}`,
        ratio: goal.target_value > 0 ? currentWeight / goal.target_value : null,
      }
    }
    case 'weekly_strength_sessions': {
      const stats = await getBasicStats(7)
      return {
        currentValue: stats.strengthSessionCount,
        targetValue: goal.target_value,
        unit: goal.unit,
        text: `${formatNumber(stats.strengthSessionCount, 0)} / ${formatNumber(goal.target_value, 0)} ${goal.unit}`,
        ratio: goal.target_value > 0 ? stats.strengthSessionCount / goal.target_value : null,
      }
    }
    case 'weekly_cardio_minutes': {
      const stats = await getBasicStats(7)
      return {
        currentValue: stats.cardioTotalMinutes,
        targetValue: goal.target_value,
        unit: goal.unit,
        text: `${formatNumber(stats.cardioTotalMinutes, 1)} / ${formatNumber(goal.target_value, 1)} ${goal.unit}`,
        ratio: goal.target_value > 0 ? stats.cardioTotalMinutes / goal.target_value : null,
      }
    }
    case 'daily_calories': {
      const totals = await getTodayMealTotals()
      return {
        currentValue: totals.calories,
        targetValue: goal.target_value,
        unit: goal.unit,
        text: `${formatNumber(totals.calories, 1)} / ${formatNumber(goal.target_value, 1)} ${goal.unit}`,
        ratio: goal.target_value > 0 ? totals.calories / goal.target_value : null,
      }
    }
    case 'daily_protein_g': {
      const totals = await getTodayMealTotals()
      return {
        currentValue: totals.protein,
        targetValue: goal.target_value,
        unit: goal.unit,
        text: `${formatNumber(totals.protein, 1)} / ${formatNumber(goal.target_value, 1)} ${goal.unit}`,
        ratio: goal.target_value > 0 ? totals.protein / goal.target_value : null,
      }
    }
    case 'daily_carbs_g': {
      const totals = await getTodayMealTotals()
      return {
        currentValue: totals.carbs,
        targetValue: goal.target_value,
        unit: goal.unit,
        text: `${formatNumber(totals.carbs, 1)} / ${formatNumber(goal.target_value, 1)} ${goal.unit}`,
        ratio: goal.target_value > 0 ? totals.carbs / goal.target_value : null,
      }
    }
    case 'daily_fat_g': {
      const totals = await getTodayMealTotals()
      return {
        currentValue: totals.fat,
        targetValue: goal.target_value,
        unit: goal.unit,
        text: `${formatNumber(totals.fat, 1)} / ${formatNumber(goal.target_value, 1)} ${goal.unit}`,
        ratio: goal.target_value > 0 ? totals.fat / goal.target_value : null,
      }
    }
    default:
      return {
        currentValue: null,
        targetValue: goal.target_value,
        unit: goal.unit,
        text: '暂不支持该目标类型',
        ratio: null,
      }
  }
}
