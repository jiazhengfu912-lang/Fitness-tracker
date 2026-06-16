import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ensureMyPreferences, ensureMyProfile } from '../lib/profile'

type DashboardPageProps = {
  user: User
}

type InitializationStatus = 'loading' | 'ready' | 'error'

function getInitializationStatusText(
  label: 'Profile' | 'Preferences',
  status: InitializationStatus,
) {
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
  const [errorMessage, setErrorMessage] = useState('')
  const [profileStatus, setProfileStatus] = useState<InitializationStatus>('loading')
  const [preferencesStatus, setPreferencesStatus] = useState<InitializationStatus>('loading')
  const [profileErrorMessage, setProfileErrorMessage] = useState('')
  const [preferencesErrorMessage, setPreferencesErrorMessage] = useState('')

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

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="inline-flex rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            to="/today"
          >
            进入今日记录
          </Link>

          <Link
            className="inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            to="/templates"
          >
            管理训练模板
          </Link>

          <Link
            className="inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            to="/stats"
          >
            查看统计
          </Link>

          <Link
            className="inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            to="/history"
          >
            查看历史记录
          </Link>

          <Link
            className="inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            to="/weight"
          >
            查看体重记录
          </Link>

          <Link
            className="inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            to="/export"
          >
            导出数据
          </Link>
        </div>
      </div>
    </section>
  )
}

export default DashboardPage
