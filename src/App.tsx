import { Navigate, Route, Routes } from 'react-router'
import RequireAuth from './auth/RequireAuth'
import AppLayout from './components/AppLayout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import MeterPage from './pages/MeterPage'
import MetersPage from './pages/MetersPage'
import SummaryPage from './pages/SummaryPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="meter/:id" element={<MeterPage />} />
          <Route path="summary" element={<SummaryPage />} />
          <Route path="meters" element={<MetersPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
