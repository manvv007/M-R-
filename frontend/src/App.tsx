import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProtectedRoute from './components/ProtectedRoute'

import DashboardOverview from './pages/authority/DashboardOverview'
import LiveMonitoringPage from './pages/authority/LiveMonitoringPage'
import IncidentsPage from './pages/authority/IncidentsPage'
import IncidentDetailPage from './pages/authority/IncidentDetailPage'
import CitizenReportsPage from './pages/authority/CitizenReportsPage'
import HotspotsPage from './pages/authority/HotspotsPage'
import CorridorsPage from './pages/authority/CorridorsPage'
import AnalyticsPage from './pages/authority/AnalyticsPage'
import InterventionsPage from './pages/authority/InterventionsPage'
import AuditLogPage from './pages/authority/AuditLogPage'
import AuthoritySettingsPage from './pages/authority/AuthoritySettingsPage'
import CongestionCausePage from './pages/authority/CongestionCausePage'
import VideoDetectionPage from './pages/authority/VideoDetectionPage'

import ReportIssuePage from './pages/citizen/ReportIssuePage'
import MyReportsPage from './pages/citizen/MyReportsPage'
import ReportDetailPage from './pages/citizen/ReportDetailPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Citizen */}
        <Route
          path="/report"
          element={
            <ProtectedRoute allowedRoles={['citizen', 'authority', 'admin']}>
              <ReportIssuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-reports"
          element={
            <ProtectedRoute allowedRoles={['citizen', 'authority', 'admin']}>
              <MyReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-reports/:id"
          element={
            <ProtectedRoute allowedRoles={['citizen', 'authority', 'admin']}>
              <ReportDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Authority */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['authority', 'admin']}>
              <DashboardOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/live"
          element={
            <ProtectedRoute allowedRoles={['authority', 'admin']}>
              <LiveMonitoringPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/detect"
          element={
            <ProtectedRoute allowedRoles={['authority', 'admin']}>
              <VideoDetectionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/incidents"
          element={
            <ProtectedRoute allowedRoles={['authority', 'admin']}>
              <IncidentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/incidents/:id"
          element={
            <ProtectedRoute allowedRoles={['authority', 'admin']}>
              <IncidentDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/reports"
          element={
            <ProtectedRoute allowedRoles={['authority', 'admin']}>
              <CitizenReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/hotspots"
          element={
            <ProtectedRoute allowedRoles={['authority', 'admin']}>
              <HotspotsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/corridors"
          element={
            <ProtectedRoute allowedRoles={['authority', 'admin']}>
              <CorridorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/corridors/:id/cause"
          element={
            <ProtectedRoute allowedRoles={['authority', 'admin']}>
              <CongestionCausePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/analytics"
          element={
            <ProtectedRoute allowedRoles={['authority', 'admin']}>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/interventions"
          element={
            <ProtectedRoute allowedRoles={['authority', 'admin']}>
              <InterventionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/audit-log"
          element={
            <ProtectedRoute allowedRoles={['authority', 'admin']}>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/settings"
          element={
            <ProtectedRoute allowedRoles={['authority', 'admin']}>
              <AuthoritySettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}
