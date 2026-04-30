import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import LoginPage              from './pages/LoginPage';
import RegisterRolePage       from './pages/RegisterRolePage';
import ClientRegisterPage     from './pages/ClientRegisterPage';
import ProductsPage           from './pages/ProductsPage';
import AdminUsersPage         from './pages/AdminUsersPage';
import AdminOrdersPage        from './pages/AdminOrdersPage';
import CheckStatusPage        from './pages/CheckStatusPage';
import ChangePasswordPage     from './pages/ChangePasswordPage';
import CompleteProfilePage    from './pages/CompleteProfilePage';
import UserProfilePage        from './pages/UserProfilePage';
import RegistrationPage       from './features/supplier-registration/pages/RegistrationPage';
import CorrectionPage         from './features/supplier-registration/pages/CorrectionPage';
import ApplicationsListPage   from './features/admin/pages/ApplicationsListPage';
import ApplicationDetailPage  from './features/admin/pages/ApplicationDetailPage';
// Client Dashboard
import ClientLayout           from './features/client-dashboard/layout/ClientLayout';
import ClientDashboardPage    from './features/client-dashboard/pages/ClientDashboardPage';
import ClientRFQsPage         from './features/client-dashboard/pages/ClientRFQsPage';
import ClientOrdersPage       from './features/client-dashboard/pages/ClientOrdersPage';
import ClientOrderDetailPage  from './features/client-dashboard/pages/ClientOrderDetailPage';
import ClientMessagesPage     from './features/client-dashboard/pages/ClientMessagesPage';
import ClientPaymentsPage     from './features/client-dashboard/pages/ClientPaymentsPage';
import ClientEmpresaPage      from './features/client-dashboard/pages/ClientEmpresaPage';
import ErrorBoundary          from './components/ErrorBoundary';

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
          {/* Ruta raíz → redirige a productos */}
          <Route path="/" element={<Navigate to="/products" replace />} />

          {/* Rutas públicas de autenticación */}
          <Route path="/login"              element={<LoginPage />} />
          <Route path="/register"           element={<RegisterRolePage />} />
          <Route path="/register/cliente"   element={<ClientRegisterPage />} />
          {/* Registro de Proveedor B2B (formulario multi-step) */}
          <Route path="/registro-proveedor" element={<RegistrationPage />} />
          {/* Corrección de solicitud con token (link desde correo) */}
          <Route path="/correccion/:token"  element={<CorrectionPage />} />
          {/* Consulta de estado sin login */}
          <Route path="/estado-solicitud"   element={<CheckStatusPage />} />

          {/* Rutas de negocio (cualquier usuario autenticado) */}
          <Route
            path="/change-password"
            element={
              <PrivateRoute>
                <ChangePasswordPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/completar-perfil"
            element={
              <PrivateRoute roles={['CLIENT']}>
                <CompleteProfilePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/perfil"
            element={
              <PrivateRoute roles={['CLIENT', 'SUPPLIER']}>
                <UserProfilePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/products"
            element={
              <PrivateRoute>
                <ProductsPage />
              </PrivateRoute>
            }
          />

          {/* Rutas exclusivas de ADMIN */}
          <Route
            path="/admin/users"
            element={
              <PrivateRoute roles={['ADMIN']}>
                <AdminUsersPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <PrivateRoute roles={['ADMIN']}>
                <AdminOrdersPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <PrivateRoute roles={['ADMIN']}>
                <ApplicationsListPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/applications/:id"
            element={
              <PrivateRoute roles={['ADMIN']}>
                <ApplicationDetailPage />
              </PrivateRoute>
            }
          />

          {/* /admin sin subruta → redirige a aplicaciones */}
          <Route path="/admin" element={<Navigate to="/admin/applications" replace />} />

          {/* Dashboard Cliente (layout propio, sin Navbar) */}
          <Route
            path="/client"
            element={
              <ErrorBoundary>
                <PrivateRoute roles={['CLIENT']}>
                  <ClientLayout />
                </PrivateRoute>
              </ErrorBoundary>
            }
          >
            <Route index          element={<ClientDashboardPage />} />
            <Route path="rfqs"    element={<ClientRFQsPage />} />
            <Route path="orders"  element={<ClientOrdersPage />} />
            <Route path="orders/:id" element={<ClientOrderDetailPage />} />
            <Route path="messages" element={<ClientMessagesPage />} />
            <Route path="payments" element={<ClientPaymentsPage />} />
            <Route path="empresa"  element={<ClientEmpresaPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/products" replace />} />
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

