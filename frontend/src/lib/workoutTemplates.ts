import type { StrengthWorkoutSession, TimestampString, UuidString } from '../types/database'
import { getCurrentUser } from './profile'
import { deleteWorkoutSession } from './workout'
import { supabase } from './supabase'

export type WorkoutTemplate = {
  id: UuidString
  user_id: UuidString
  name: string
  description: string | null
  created_at: TimestampString
  updated_at: TimestampString
}

export type WorkoutTemplateExercise = {
  id: UuidString
  user_id: UuidString
  template_id: UuidString
  exercise_name_snapshot: string
  sort_order: number
  notes: string | null
  created_at: TimestampString
  updated_at: TimestampString
}

export type WorkoutTemplateSet = {
  id: UuidString
  user_id: UuidString
  template_exercise_id: UuidString
  set_number: number
  target_weight_kg: number | null
  target_reps: number | null
  is_warmup: boolean
  notes: string | null
  created_at: TimestampString
  updated_at: TimestampString
}

export type CreateWorkoutTemplateInput = {
  name: string
  description?: string | null
}

export type CreateTemplateExerciseInput = {
  exercise_name_snapshot: string
  notes?: string | null
}

export type CreateTemplateSetInput = {
  target_weight_kg?: number | null
  target_reps?: number | null
  is_warmup?: boolean
  notes?: string | null
}

function getTodayDateString() {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function normalizeOptionalText(value?: string | null) {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : null
}

async function selectWorkoutTemplate(userId: string, templateId: string): Promise<WorkoutTemplate | null> {
  const { data, error } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('id', templateId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as WorkoutTemplate | null
}

async function selectTemplateExercise(
  userId: string,
  templateExerciseId: string,
): Promise<WorkoutTemplateExercise | null> {
  const { data, error } = await supabase
    .from('workout_template_exercises')
    .select('*')
    .eq('id', templateExerciseId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as WorkoutTemplateExercise | null
}

async function listTemplateExercisesForUser(
  userId: string,
  templateId: string,
): Promise<WorkoutTemplateExercise[]> {
  const { data, error } = await supabase
    .from('workout_template_exercises')
    .select('*')
    .eq('template_id', templateId)
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as WorkoutTemplateExercise[]
}

async function listTemplateSetsForUser(
  userId: string,
  templateExerciseId: string,
): Promise<WorkoutTemplateSet[]> {
  const { data, error } = await supabase
    .from('workout_template_sets')
    .select('*')
    .eq('template_exercise_id', templateExerciseId)
    .eq('user_id', userId)
    .order('set_number', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as WorkoutTemplateSet[]
}

export async function listWorkoutTemplates(): Promise<WorkoutTemplate[]> {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as WorkoutTemplate[]
}

export async function createWorkoutTemplate(input: CreateWorkoutTemplateInput): Promise<WorkoutTemplate> {
  const user = await getCurrentUser()
  const name = input.name.trim()

  if (!name) {
    throw new Error('模板名称不能为空')
  }

  const { data, error } = await supabase
    .from('workout_templates')
    .insert({
      user_id: user.id,
      name,
      description: normalizeOptionalText(input.description),
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as WorkoutTemplate
}

export async function deleteWorkoutTemplate(templateId: string): Promise<void> {
  const user = await getCurrentUser()
  const { error } = await supabase
    .from('workout_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function getWorkoutTemplateById(templateId: string): Promise<WorkoutTemplate> {
  const user = await getCurrentUser()
  const template = await selectWorkoutTemplate(user.id, templateId)

  if (!template) {
    throw new Error('训练模板不存在或无权访问')
  }

  return template
}

export async function listTemplateExercises(templateId: string): Promise<WorkoutTemplateExercise[]> {
  const user = await getCurrentUser()
  return listTemplateExercisesForUser(user.id, templateId)
}

export async function createTemplateExercise(
  templateId: string,
  input: CreateTemplateExerciseInput,
): Promise<WorkoutTemplateExercise> {
  const user = await getCurrentUser()
  const exerciseName = input.exercise_name_snapshot.trim()

  if (!exerciseName) {
    throw new Error('模板动作名称不能为空')
  }

  const template = await selectWorkoutTemplate(user.id, templateId)

  if (!template) {
    throw new Error('训练模板不存在或无权访问')
  }

  const existingExercises = await listTemplateExercisesForUser(user.id, templateId)
  const nextSortOrder = existingExercises.length + 1

  const { data, error } = await supabase
    .from('workout_template_exercises')
    .insert({
      user_id: user.id,
      template_id: template.id,
      exercise_name_snapshot: exerciseName,
      sort_order: nextSortOrder,
      notes: normalizeOptionalText(input.notes),
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as WorkoutTemplateExercise
}

export async function deleteTemplateExercise(templateExerciseId: string): Promise<void> {
  const user = await getCurrentUser()
  const { error } = await supabase
    .from('workout_template_exercises')
    .delete()
    .eq('id', templateExerciseId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function listTemplateSets(templateExerciseId: string): Promise<WorkoutTemplateSet[]> {
  const user = await getCurrentUser()
  return listTemplateSetsForUser(user.id, templateExerciseId)
}

export async function createTemplateSet(
  templateExerciseId: string,
  input: CreateTemplateSetInput,
): Promise<WorkoutTemplateSet> {
  const user = await getCurrentUser()
  const targetWeightKg = input.target_weight_kg ?? null
  const targetReps = input.target_reps ?? null

  if (targetWeightKg !== null && targetWeightKg < 0) {
    throw new Error('目标重量必须大于等于 0')
  }

  if (targetReps !== null && targetReps <= 0) {
    throw new Error('目标次数必须大于 0')
  }

  const templateExercise = await selectTemplateExercise(user.id, templateExerciseId)

  if (!templateExercise) {
    throw new Error('模板动作不存在或无权访问')
  }

  const existingSets = await listTemplateSetsForUser(user.id, templateExerciseId)
  const nextSetNumber = existingSets.length + 1

  const { data, error } = await supabase
    .from('workout_template_sets')
    .insert({
      user_id: user.id,
      template_exercise_id: templateExercise.id,
      set_number: nextSetNumber,
      target_weight_kg: targetWeightKg,
      target_reps: targetReps,
      is_warmup: input.is_warmup ?? false,
      notes: normalizeOptionalText(input.notes),
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as WorkoutTemplateSet
}

export async function deleteTemplateSet(templateSetId: string): Promise<void> {
  const user = await getCurrentUser()
  const { error } = await supabase
    .from('workout_template_sets')
    .delete()
    .eq('id', templateSetId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function applyTemplateToToday(templateId: string): Promise<StrengthWorkoutSession> {
  const user = await getCurrentUser()
  const template = await selectWorkoutTemplate(user.id, templateId)

  if (!template) {
    throw new Error('训练模板不存在或无权访问')
  }

  const templateExercises = await listTemplateExercisesForUser(user.id, templateId)
  const templateSetsEntries = await Promise.all(
    templateExercises.map(async (exercise) => {
      const sets = await listTemplateSetsForUser(user.id, exercise.id)
      return [exercise.id, sets] as const
    }),
  )
  const templateSetsByExerciseId = Object.fromEntries(templateSetsEntries)

  const { data: createdSession, error: createSessionError } = await supabase
    .from('strength_workout_sessions')
    .insert({
      user_id: user.id,
      workout_date: getTodayDateString(),
      title: template.name,
      notes: template.description,
    })
    .select('*')
    .single()

  if (createSessionError) {
    throw new Error(createSessionError.message)
  }

  const session = createdSession as StrengthWorkoutSession

  try {
    for (const templateExercise of templateExercises) {
      const { data: createdExercise, error: createExerciseError } = await supabase
        .from('strength_workout_exercises')
        .insert({
          user_id: user.id,
          session_id: session.id,
          exercise_id: null,
          exercise_name_snapshot: templateExercise.exercise_name_snapshot,
          sort_order: templateExercise.sort_order,
          notes: templateExercise.notes,
        })
        .select('id')
        .single()

      if (createExerciseError) {
        throw new Error(createExerciseError.message)
      }

      const templateSets = templateSetsByExerciseId[templateExercise.id] ?? []

      if (templateSets.length === 0) {
        continue
      }

      const { error: createSetsError } = await supabase.from('strength_workout_sets').insert(
        templateSets.map((templateSet) => ({
          user_id: user.id,
          workout_exercise_id: createdExercise.id,
          set_number: templateSet.set_number,
          weight_kg: templateSet.target_weight_kg ?? 0,
          reps: templateSet.target_reps ?? 1,
          is_warmup: templateSet.is_warmup,
          notes: templateSet.notes,
        })),
      )

      if (createSetsError) {
        throw new Error(createSetsError.message)
      }
    }

    return session
  } catch (error) {
    try {
      await deleteWorkoutSession(session.id)
    } catch {
      // Best effort cleanup to avoid leaving a half-copied workout session behind.
    }

    throw error instanceof Error ? error : new Error('套用训练模板失败')
  }
}
