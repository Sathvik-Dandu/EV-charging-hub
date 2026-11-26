import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Box, CircularProgress } from '@mui/material';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import PublicLayout from './components/public/PublicLayout';
import HomePage from './pages/public/HomePage';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StationsPage = lazy(() => import('./pages/StationsPage'));
const VehiclesPage = lazy(() => import('./pages/VehiclesPage'));
const BookingsPage = lazy(() => import('./pages/BookingsPage'));
const SessionsPage = lazy(() => import('./pages/SessionsPage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
const EnquiriesPage = lazy(() => import('./pages/EnquiriesPage'));
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const TariffsPage = lazy(() => import('./pages/TariffsPage'));

const Loading = () => (
  <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
    <CircularProgress color="secondary" aria-label="Loading" />
  </Box>
);

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/stations" element={<StationsPage />} />
              <Route path="/vehicles" element={<VehiclesPage />} />
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/enquiries" element={<EnquiriesPage />} />
              <Route path="/approvals" element={<ApprovalsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/tariffs" element={<TariffsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
