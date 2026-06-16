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
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Fitness Tracker</p>
              <p className="mt-1 text-sm text-slate-600">
                当前用户：{userEmail ?? '未提供邮箱'}
              </p>
            </div>
            <button
              className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSigningOut}
              onClick={handleSignOut}
              type="button"
            >
              {isSigningOut ? '退出中...' : '退出登录'}
            </button>
          </div>

          <AppNav />

          {errorMessage ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p> : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}

export default AppLayout
