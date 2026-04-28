import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Componente que protege rutas privadas.
 * Si el usuario no está autenticado, redirige a /login.
 * Uso: <Route path="/products" element={<PrivateRoute><ProductsPage /></PrivateRoute>} />
 *
 * @param {string[]} roles - Roles permitidos. Si está vacío, cualquier usuario autenticado puede acceder.
 */
const PrivateRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/products" replace />;
  }

  return children;
};

export default PrivateRoute;
