import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Layout compartido para todas las páginas del panel de administración.
 * Incluye navbar con links a las secciones admin y botón de logout.
 */
const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="page-container">
      <header className="navbar">
        <div className="navbar-left">
          <span className="navbar-brand">B2B Admin</span>
          <nav className="admin-nav">
            <NavLink
              to="/admin/users"
              className={({ isActive }) => 'admin-nav-link' + (isActive ? ' active' : '')}
            >
              Usuarios
            </NavLink>
            <NavLink
              to="/admin/orders"
              className={({ isActive }) => 'admin-nav-link' + (isActive ? ' active' : '')}
            >
              Pedidos
            </NavLink>
            <NavLink
              to="/products"
              className="admin-nav-link"
            >
              ← Ver Productos
            </NavLink>
          </nav>
        </div>
        <div className="navbar-right">
          <span className="navbar-user">
            {user?.name} <span className="role-badge">{user?.role}</span>
          </span>
          <button className="btn btn-outline" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="main-content">{children}</main>
    </div>
  );
};

export default AdminLayout;
