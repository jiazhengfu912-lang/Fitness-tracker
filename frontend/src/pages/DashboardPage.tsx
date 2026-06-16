import type { User } from '@supabase/supabase-js'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type DashboardPageProps = {
  user: User
}

function DashboardPage({ user }: DashboardPageProps) {
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)

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
