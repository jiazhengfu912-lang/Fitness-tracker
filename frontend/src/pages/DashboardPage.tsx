import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ensureMyPreferences, ensureMyProfile } from '../lib/profile'
import { supabase } from '../lib/supabase'

type DashboardPageProps = {
  user: User
}

type InitializationStatus = 'loading' | 'ready' | 'error'

function getInitializationStatusText(label: 'Profile' | 'Preferences', status: InitializationStatus) {
  if (status === 'ready') {
    return `${label} 初始化成功`
  }

  if (status === 'error') {
    return `${label} 初始化失败`
  }

  return `${label} 初始化中`
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '未知错误'
}

function DashboardPage({ user }: DashboardPageProps) {
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState('')
  const [profileStatus, setProfileStatus] = useState<InitializationStatus>('loading')
  const [preferencesStatus, setPreferencesStatus] = useState<InitializationStatus>('loading')
  const [profileErrorMessage, setProfileErrorMessage] = useState('')
  const [preferencesErrorMessage, setPreferencesErrorMessage] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function initializeUserData() {
      setErrorMessage('')
      setProfileErrorMessage('')
      setPreferencesErrorMessage('')
      setProfileStatus('loading')
      setPreferencesStatus('loading')

      try {
        await ensureMyProfile()

        if (isMounted) {
          setProfileStatus('ready')
        }
      } catch (error) {
        if (isMounted) {
          setProfileStatus('error')
          setProfileErrorMessage(`Profile 初始化失败：${getErrorMessage(error)}`)
        }
      }

      try {
        await ensureMyPreferences()

        if (isMounted) {
          setPreferencesStatus('ready')
        }
      } catch (error) {
        if (isMounted) {
          setPreferencesStatus('error')
          setPreferencesErrorMessage(`Preferences 初始化失败：${getErrorMessage(error)}`)
        }
      }
    }

    initializeUserData()

    return () => {
      isMounted = false
    }
  }, [user.id])

  async function handleSignOut() {
    setErrorMessage('')
    setIsSigningOut(true)

    const { error } = await supabase.auth.signOut()

    setIsSigningOut(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <section className="mx-auto w-full max-w-3xl">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-emerald-700">Fitness Tracker MVP</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">仪表盘</h1>
          <p className="mt-3 text-sm text-slate-600">当前登录用户邮箱：</p>
          <p className="mt-1 text-base font-medium text-slate-900">{user.email ?? '未提供邮箱'}</p>

          <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-4 py-3">
              <p className="font-medium text-slate-900">Profile 初始化状态</p>
              <p>{getInitializationStatusText('Profile', profileStatus)}</p>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <p className="font-medium text-slate-900">Preferences 初始化状态</p>
              <p>{getInitializationStatusText('Preferences', preferencesStatus)}</p>
            </div>
          </div>

          {profileErrorMessage ? <p className="mt-4 text-sm text-red-600">{profileErrorMessage}</p> : null}
          {preferencesErrorMessage ? (
            <p className="mt-2 text-sm text-red-600">{preferencesErrorMessage}</p>
          ) : null}
          {errorMessage ? <p className="mt-4 text-sm text-red-600">{errorMessage}</p> : null}

          <button
            className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSigningOut}
            onClick={handleSignOut}
            type="button"
          >
            {isSigningOut ? '退出中...' : '退出登录'}
          </button>
        </div>
      </section>
    </main>
  )
}

export default DashboardPage
