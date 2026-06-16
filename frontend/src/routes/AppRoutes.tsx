import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import DashboardPage from '../pages/DashboardPage'
import HistoryPage from '../pages/HistoryPage'
import LoginPage from '../pages/LoginPage'
import MealRecordPage from '../pages/MealRecordPage'
import RegisterPage from '../pages/RegisterPage'
import StatsPage from '../pages/StatsPage'
import TodayPage from '../pages/TodayPage'
import WorkoutSessionPage from '../pages/WorkoutSessionPage'
import { supabase } from '../lib/supabase'

function AppRoutes() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return
      }

      setSession(data.session)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">
        <p>加载中...</p>
      </main>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={session ? <DashboardPage user={session.user} /> : <Navigate replace to="/login" />}
          path="/"
        />
        <Route element={session ? <TodayPage /> : <Navigate replace to="/login" />} path="/today" />
        <Route element={session ? <StatsPage /> : <Navigate replace to="/login" />} path="/stats" />
        <Route element={session ? <HistoryPage /> : <Navigate replace to="/login" />} path="/history" />
        <Route element={session ? <MealRecordPage /> : <Navigate replace to="/login" />} path="/meals/:mealRecordId" />
        <Route element={session ? <WorkoutSessionPage /> : <Navigate replace to="/login" />} path="/workouts/:sessionId" />
        <Route element={session ? <Navigate replace to="/" /> : <LoginPage />} path="/login" />
        <Route element={session ? <Navigate replace to="/" /> : <RegisterPage />} path="/register" />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
