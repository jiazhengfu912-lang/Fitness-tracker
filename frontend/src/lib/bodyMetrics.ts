import { getCurrentUser } from './profile'
import { supabase } from './supabase'

export type BodyMetric = {
  id: string
  user_id: string
  metric_date: string
  weight_kg: number
  body_fat_percent: number | null
  waist_cm: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type UpsertBodyMetricInput = {
  metric_date: string
  weight_kg: number
  body_fat_percent?: number | null
  waist_cm?: number | null
  notes?: string | null
}

type DatabaseError = {
  code?: string
  message?: string
}

function isDuplicateKeyError(error: DatabaseError) {
  return error.code === '23505' || error.message?.toLowerCase().includes('duplicate key')
}

function assertDateString(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('日期格式必须是 YYYY-MM-DD')
  }
}

function normalizeOptionalNumber(value: number | null | undefined) {
  return value ?? null
}

function normalizeNotes(notes: string | null | undefined) {
  const trimmedNotes = notes?.trim()
  return trimmedNotes ? trimmedNotes : null
}

function validateInput(input: UpsertBodyMetricInput) {
  assertDateString(input.metric_date)

  if (!Number.isFinite(input.weight_kg) || input.weight_kg <= 0) {
    throw new Error('体重必须大于 0')
  }

  if (
    input.body_fat_percent !== undefined &&
    input.body_fat_percent !== null &&
    (!Number.isFinite(input.body_fat_percent) ||
      input.body_fat_percent < 0 ||
      input.body_fat_percent > 100)
  ) {
    throw new Error('体脂率必须在 0 到 100 之间')
  }

  if (
    input.waist_cm !== undefined &&
    input.waist_cm !== null &&
    (!Number.isFinite(input.waist_cm) || input.waist_cm <= 0)
  ) {
    throw new Error('腰围必须大于 0')
  }
}

export async function listMyBodyMetrics(): Promise<BodyMetric[]> {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('body_metrics')
    .select('*')
    .eq('user_id', user.id)
    .order('metric_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as BodyMetric[]
}

export async function getBodyMetricByDate(date: string): Promise<BodyMetric | null> {
  assertDateString(date)

  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('body_metrics')
    .select('*')
    .eq('user_id', user.id)
    .eq('metric_date', date)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return (data as BodyMetric | null) ?? null
}

export async function upsertBodyMetric(input: UpsertBodyMetricInput): Promise<BodyMetric> {
  validateInput(input)

  const user = await getCurrentUser()
  const existingMetric = await getBodyMetricByDate(input.metric_date)
  const payload = {
    user_id: user.id,
    metric_date: input.metric_date,
    weight_kg: input.weight_kg,
    body_fat_percent: normalizeOptionalNumber(input.body_fat_percent),
    waist_cm: normalizeOptionalNumber(input.waist_cm),
    notes: normalizeNotes(input.notes),
  }

  if (existingMetric) {
    const { data, error } = await supabase
      .from('body_metrics')
      .update(payload)
      .eq('id', existingMetric.id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as BodyMetric
  }

  const { data, error } = await supabase
    .from('body_metrics')
    .insert(payload)
    .select('*')
    .single()

  if (!error) {
    return data as BodyMetric
  }

  if (isDuplicateKeyError(error)) {
    const metricAfterConflict = await getBodyMetricByDate(input.metric_date)

    if (metricAfterConflict) {
      const { data: updatedMetric, error: updateError } = await supabase
        .from('body_metrics')
        .update(payload)
        .eq('id', metricAfterConflict.id)
        .eq('user_id', user.id)
        .select('*')
        .single()

      if (updateError) {
        throw new Error(updateError.message)
      }

      return updatedMetric as BodyMetric
    }
  }

  throw new Error(error.message)
}

export async function deleteBodyMetric(id: string): Promise<void> {
  const user = await getCurrentUser()
  const { error } = await supabase
    .from('body_metrics')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }
}
