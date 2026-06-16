import type { User } from '@supabase/supabase-js'
import type { Profile, UserPreference } from '../types/database'
import { supabase } from './supabase'

type DatabaseError = {
  code?: string
  message?: string
}

function isDuplicateKeyError(error: DatabaseError) {
  return error.code === '23505' || error.message?.toLowerCase().includes('duplicate key')
}

async function selectMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as Profile | null
}

async function selectMyPreferences(userId: string): Promise<UserPreference | null> {
  const { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as UserPreference | null
}

export async function getCurrentUser(): Promise<User> {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    throw new Error(error.message)
  }

  if (!data.user) {
    throw new Error('当前用户未登录')
  }

  return data.user
}

export async function getMyProfile(): Promise<Profile | null> {
  const user = await getCurrentUser()
  return selectMyProfile(user.id)
}

export async function ensureMyProfile(): Promise<Profile> {
  const user = await getCurrentUser()
  const existingProfile = await selectMyProfile(user.id)

  if (existingProfile) {
    return existingProfile
  }

  const { data: createdProfile, error: createError } = await supabase
    .from('profiles')
    .insert({ id: user.id })
    .select('*')
    .single()

  if (!createError) {
    return createdProfile as Profile
  }

  if (isDuplicateKeyError(createError)) {
    const profileAfterConflict = await selectMyProfile(user.id)

    if (profileAfterConflict) {
      return profileAfterConflict
    }
  }

  throw new Error(createError.message)
}

export async function getMyPreferences(): Promise<UserPreference | null> {
  const user = await getCurrentUser()
  return selectMyPreferences(user.id)
}

export async function ensureMyPreferences(): Promise<UserPreference> {
  const user = await getCurrentUser()
  const existingPreferences = await selectMyPreferences(user.id)

  if (existingPreferences) {
    return existingPreferences
  }

  const { data: createdPreferences, error: createError } = await supabase
    .from('user_preferences')
    .insert({
      user_id: user.id,
      weight_unit: 'kg',
      distance_unit: 'km',
      week_start_day: 'monday',
    })
    .select('*')
    .single()

  if (!createError) {
    return createdPreferences as UserPreference
  }

  if (isDuplicateKeyError(createError)) {
    const preferencesAfterConflict = await selectMyPreferences(user.id)

    if (preferencesAfterConflict) {
      return preferencesAfterConflict
    }
  }

  throw new Error(createError.message)
}
