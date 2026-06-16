import type { ReactNode } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AppNav from './AppNav'

type AppLayoutProps = {
  children: ReactNode
  userEmail?: string | null
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '退出登录失败'
}

function AppLayout({ children, userEmail }: AppLayoutProps) {
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSignOut() {
    setErrorMessage('')
    setIsSigningOut(true)

    const { error } = await supabase.auth.signOut()

    setIsSigningOut(false)

    if (error) {
      setErrorMessage(getErrorMessage(error))
      return
    }

    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Fitness Tracker
              </p>
              <p className="mt-1 text-sm text-slate-600">当前用户</p>
              <p className="mt-1 break-all text-sm font-medium text-slate-900">{userEmail ?? '未提供邮箱'}</p>
            </div>

            <button
              className="mobile-action-button self-stretch bg-slate-900 text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 md:self-start"
              disabled={isSigningOut}
              onClick={handleSignOut}
              type="button"
            >
              {isSigningOut ? '退出中...' : '退出登录'}
            </button>
          </div>

          <AppNav />

          {errorMessage ? (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}

export default AppLayout
