import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { StudentDashboard } from './pages/StudentDashboard'
import { CreateGatePassPage } from './pages/CreateGatePassPage'
import { HodDashboard } from './pages/HodDashboard'
import { PrincipalDashboard } from './pages/PrincipalDashboard'
import { SecurityDashboard } from './pages/SecurityDashboard'
import RegisterLandingPage from './pages/RegisterLandingPage'
import StudentRegisterPage from './pages/StudentRegisterPage'
import StaffRegisterPage from './pages/StaffRegisterPage'
import SecurityRegisterPage from './pages/SecurityRegisterPage'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterLandingPage />} />
          <Route path="/register/student" element={<StudentRegisterPage />} />
          <Route path="/register/staff" element={<StaffRegisterPage />} />
          <Route path="/register/security" element={<SecurityRegisterPage />} />

          {/* Student Routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/create-pass"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <CreateGatePassPage />
              </ProtectedRoute>
            }
          />

          {/* HOD / Class Incharge Routes */}
          <Route
            path="/hod/dashboard"
            element={
              <ProtectedRoute allowedRoles={['hod', 'class_incharge']}>
                <HodDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/class-incharge/dashboard"
            element={
              <ProtectedRoute allowedRoles={['class_incharge']}>
                <HodDashboard />
              </ProtectedRoute>
            }
          />

          {/* Principal Routes */}
          <Route
            path="/principal/dashboard"
            element={
              <ProtectedRoute allowedRoles={['principal']}>
                <PrincipalDashboard />
              </ProtectedRoute>
            }
          />

          {/* Security Routes */}
          <Route
            path="/security/dashboard"
            element={
              <ProtectedRoute allowedRoles={['security']}>
                <SecurityDashboard />
              </ProtectedRoute>
            }
          />

          {/* Faculty Routes */}
          <Route
            path="/faculty/dashboard"
            element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <HodDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <HodDashboard />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
