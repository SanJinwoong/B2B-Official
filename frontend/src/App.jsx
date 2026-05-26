import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import AdminLayout from './components/AdminLayout';
import LoginPage              from './pages/LoginPage';
import RegisterRolePage       from './pages/RegisterRolePage';
import ClientRegisterPage     from './pages/ClientRegisterPage';

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
import AdminDashboardPage     from './features/admin/pages/AdminDashboardPage';
import ScoutersPage           from './features/admin/pages/ScoutersPage';
import AdminConfigPage        from './features/admin/pages/AdminConfigPage';
import AdminRFQsPage          from './features/admin/pages/AdminRFQsPage';
import AdminRFQDetailPage     from './features/admin/pages/AdminRFQDetailPage';
import AdminChatAuditPage     from './features/admin/pages/AdminChatAuditPage';
import AdminSupportChatsPage  from './features/admin/pages/AdminSupportChatsPage';
import AdminFinancesPage      from './features/admin/pages/AdminFinancesPage';
// Client Dashboard
import ClientLayout           from './features/client-dashboard/layout/ClientLayout';
import ClientDashboardPage    from './features/client-dashboard/pages/ClientDashboardPage';
import ClientRFQsPage         from './features/client-dashboard/pages/ClientRFQsPage';
import ClientOrdersPage       from './features/client-dashboard/pages/ClientOrdersPage';
import ClientOrderDetailPage  from './features/client-dashboard/pages/ClientOrderDetailPage';
import ClientMessagesPage     from './features/client-dashboard/pages/ClientMessagesPage';
import ClientPaymentsPage     from './features/client-dashboard/pages/ClientPaymentsPage';
import ClientEmpresaPage      from './features/client-dashboard/pages/ClientEmpresaPage';
import MarketplacePage        from './features/client-dashboard/pages/MarketplacePage';
import ProductDetailPage      from './features/client-dashboard/pages/ProductDetailPage';
import ErrorBoundary          from './components/ErrorBoundary';
// Supplier Portal
import SupplierLayout         from './features/supplier-portal/SupplierLayout';
import SupplierDashboardPage  from './features/supplier-portal/pages/SupplierDashboardPage';
import SupplierCatalogPage    from './features/supplier-portal/pages/SupplierCatalogPage';
import SupplierOrdersPage     from './features/supplier-portal/pages/SupplierOrdersPage';
import SupplierPerformancePage from './features/supplier-portal/pages/SupplierPerformancePage';
import SupplierSettingsPage    from './features/supplier-portal/pages/SupplierSettingsPage';
import SupplierOpportunitiesPage from './features/supplier-portal/pages/SupplierOpportunitiesPage';
import SupplierMessagesPage      from './features/supplier-portal/pages/SupplierMessagesPage';


// Hide the top Navbar when we are inside the admin shell (has its own sidebar)
const ConditionalNavbar = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) return null;
  return <Navbar />;
};

const RootRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  switch (user?.role) {
    case 'ADMIN': return <Navigate to="/admin/dashboard" replace />;
    case 'SUPPLIER': return <Navigate to="/proveedor/dashboard" replace />;
    case 'CLIENT': return <Navigate to="/client/marketplace" replace />;
    default: return <Navigate to="/login" replace />;
  }
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ConditionalNavbar />
          <Routes>
          {/* Ruta raíz dinámica */}
          <Route path="/" element={<RootRedirect />} />

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
              <PrivateRoute roles={['SUPPLIER']}>
                <UserProfilePage />
              </PrivateRoute>
            }
          />


          {/* Rutas exclusivas de ADMIN — todas dentro del sidebar AdminLayout */}
          <Route
            path="/admin"
            element={
              <PrivateRoute roles={['ADMIN']}>
                <AdminLayout><Outlet /></AdminLayout>
              </PrivateRoute>
            }
          >
            <Route index                  element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"       element={<AdminDashboardPage />} />
            <Route path="applications"    element={<ApplicationsListPage />} />
            <Route path="applications/:id" element={<ApplicationDetailPage />} />
            <Route path="users"           element={<AdminUsersPage />} />
            <Route path="orders"          element={<AdminOrdersPage />} />
            <Route path="rfqs"            element={<AdminRFQsPage />} />
            <Route path="rfqs/:id"        element={<AdminRFQDetailPage />} />
            <Route path="chats-audit"     element={<AdminChatAuditPage />} />
            <Route path="support-chats"   element={<AdminSupportChatsPage />} />
            <Route path="finances"        element={<AdminFinancesPage />} />
            <Route path="scouters"        element={<ScoutersPage />} />
            <Route path="config"          element={<AdminConfigPage />} />
          </Route>


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
            <Route index          element={<Navigate to="marketplace" replace />} />
            <Route path="dashboard" element={<ClientDashboardPage />} />
            <Route path="marketplace" element={<MarketplacePage />} />
            <Route path="marketplace/:id" element={<ProductDetailPage />} />
            <Route path="rfqs"    element={<ClientRFQsPage />} />
            <Route path="orders"  element={<ClientOrdersPage />} />
            <Route path="orders/:id" element={<ClientOrderDetailPage />} />
            <Route path="messages" element={<ClientMessagesPage />} />
            <Route path="payments" element={<ClientPaymentsPage />} />
            <Route path="empresa"  element={<ClientEmpresaPage />} />
            <Route path="perfil"   element={<UserProfilePage />} />
          </Route>

          {/* Portal Proveedor */}
          <Route
            path="/proveedor"
            element={
              <ErrorBoundary>
                <PrivateRoute roles={['SUPPLIER']}>
                  <SupplierLayout />
                </PrivateRoute>
              </ErrorBoundary>
            }
          >
            <Route index             element={<Navigate to="/proveedor/dashboard" replace />} />
            <Route path="dashboard"  element={<SupplierDashboardPage />} />
            <Route path="rfqs"       element={<SupplierOpportunitiesPage />} />
            <Route path="pedidos"    element={<SupplierOrdersPage />} />
            <Route path="catalogo"   element={<SupplierCatalogPage />} />
            <Route path="catalogo/:id" element={<ProductDetailPage />} />
            <Route path="mensajes"   element={<SupplierMessagesPage />} />
            <Route path="rendimiento" element={<SupplierPerformancePage />} />
            <Route path="configuracion" element={<SupplierSettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

