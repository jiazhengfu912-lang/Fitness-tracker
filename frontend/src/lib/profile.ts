import type { User } from '@supabase/supabase-js'
import type { Profile, UserPreference } from '../types/database'
import { supabase } from './supabase'

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
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as Profile | null
}

export async function ensureMyProfile(): Promise<Profile> {
  const user = await getCurrentUser()
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  if (existingProfile) {
    return existingProfile as Profile
  }

  const { data: createdProfile, error: createError } = await supabase
    .from('profiles')
    .insert({ id: user.id })
    .select('*')
    .single()

  if (createError) {
    throw new Error(createError.message)
  }

  return createdProfile as Profile
}

export async function getMyPreferences(): Promise<UserPreference | null> {
  const user = await getCurrentUser()
  const { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as UserPreference | null
}

export async function ensureMyPreferences(): Promise<UserPreference> {
  const user = await getCurrentUser()
  const { data: existingPreferences, error: fetchError } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  if (existingPreferences) {
    return existingPreferences as UserPreference
  }

  const { data: createdPreferences, error: createError } = await supabase
    .from('user_preferences')
    .insert({ user_id: user.id })
    .select('*')
    .single()

  if (createError) {
    throw new Error(createError.message)
  }

  return createdPreferences as UserPreference
}
