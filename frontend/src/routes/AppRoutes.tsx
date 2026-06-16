import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { supabase } from '../lib/supabase'
import DashboardPage from '../pages/DashboardPage'
import ExportPage from '../pages/ExportPage'
import GoalsPage from '../pages/GoalsPage'
import HistoryPage from '../pages/HistoryPage'
import LoginPage from '../pages/LoginPage'
import MealRecordPage from '../pages/MealRecordPage'
import RegisterPage from '../pages/RegisterPage'
import StatsPage from '../pages/StatsPage'
import TemplateDetailPage from '../pages/TemplateDetailPage'
import TemplatesPage from '../pages/TemplatesPage'
import TodayPage from '../pages/TodayPage'
import WeightPage from '../pages/WeightPage'
import WorkoutSessionPage from '../pages/WorkoutSessionPage'

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
          element={
            session ? (
              <AppLayout userEmail={session.user.email}>
                <DashboardPage user={session.user} />
              </AppLayout>
            ) : (
              <Navigate replace to="/login" />
            )
          }
          path="/"
        />
        <Route
          element={
            session ? (
              <AppLayout userEmail={session.user.email}>
                <TodayPage />
              </AppLayout>
            ) : (
              <Navigate replace to="/login" />
            )
          }
          path="/today"
        />
        <Route
          element={
            session ? (
              <AppLayout userEmail={session.user.email}>
                <TemplatesPage />
              </AppLayout>
            ) : (
              <Navigate replace to="/login" />
            )
          }
          path="/templates"
        />
        <Route
          element={
            session ? (
              <AppLayout userEmail={session.user.email}>
                <TemplateDetailPage />
              </AppLayout>
            ) : (
              <Navigate replace to="/login" />
            )
          }
          path="/templates/:templateId"
        />
        <Route
          element={
            session ? (
              <AppLayout userEmail={session.user.email}>
                <GoalsPage />
              </AppLayout>
            ) : (
              <Navigate replace to="/login" />
            )
          }
          path="/goals"
        />
        <Route
          element={
            session ? (
              <AppLayout userEmail={session.user.email}>
                <StatsPage />
              </AppLayout>
            ) : (
              <Navigate replace to="/login" />
            )
          }
          path="/stats"
        />
        <Route
          element={
            session ? (
              <AppLayout userEmail={session.user.email}>
                <HistoryPage />
              </AppLayout>
            ) : (
              <Navigate replace to="/login" />
            )
          }
          path="/history"
        />
        <Route
          element={
            session ? (
              <AppLayout userEmail={session.user.email}>
                <WeightPage />
              </AppLayout>
            ) : (
              <Navigate replace to="/login" />
            )
          }
          path="/weight"
        />
        <Route
          element={
            session ? (
              <AppLayout userEmail={session.user.email}>
                <ExportPage />
              </AppLayout>
            ) : (
              <Navigate replace to="/login" />
            )
          }
          path="/export"
        />
        <Route
          element={
            session ? (
              <AppLayout userEmail={session.user.email}>
                <MealRecordPage />
              </AppLayout>
            ) : (
              <Navigate replace to="/login" />
            )
          }
          path="/meals/:mealRecordId"
        />
        <Route
          element={
            session ? (
              <AppLayout userEmail={session.user.email}>
                <WorkoutSessionPage />
              </AppLayout>
            ) : (
              <Navigate replace to="/login" />
            )
          }
          path="/workouts/:sessionId"
        />
        <Route element={session ? <Navigate replace to="/" /> : <LoginPage />} path="/login" />
        <Route element={session ? <Navigate replace to="/" /> : <RegisterPage />} path="/register" />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
