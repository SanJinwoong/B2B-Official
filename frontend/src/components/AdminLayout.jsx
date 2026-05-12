import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingCart, Users, Settings,
  Store, FileText, LogOut, Box, ShieldAlert, DollarSign
} from 'lucide-react';
import './AdminSidebar.css';

const NAV_ITEMS = [
  { to: '/admin/applications', label: 'Proveedores',    icon: Store           },
  { to: '/admin/orders',       label: 'Pedidos',        icon: ShoppingCart    },
  { to: '/admin/finances',     label: 'Finanzas B2B',   icon: DollarSign      },
  { to: '/admin/rfqs',         label: 'Cotizaciones',   icon: FileText        },
  { to: '/admin/chats-audit',  label: 'Auditoría B2B',  icon: ShieldAlert     },
  { to: '/admin/users',        label: 'Clientes',       icon: Users           },
  { to: '/admin/scouters',     label: 'Scouters',       icon: Users           },
  { to: '/admin/config',       label: 'Configuracion',  icon: Settings        },
];

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  // Initials for avatar
  const initials = (user?.name || 'A')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="adm-shell">
      {/* ── Sidebar ── */}
      <aside className="adm-sidebar">
        {/* Brand */}
        <div className="adm-brand">
          <div className="adm-brand-icon">
            <Box size={20} />
          </div>
          <div>
            <div className="adm-brand-name">B2B Platform</div>
            <div className="adm-brand-sub">Panel de Manejadores</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="adm-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                'adm-nav-item' + (isActive ? ' adm-nav-item--active' : '')
              }
            >
              <Icon size={18} className="adm-nav-icon" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="adm-user">
          <div className="adm-user-avatar">{initials}</div>
          <div className="adm-user-info">
            <div className="adm-user-name">{user?.name || 'Administrador'}</div>
            <div className="adm-user-email">{user?.email || ''}</div>
          </div>
          <button className="adm-logout-btn" onClick={handleLogout} title="Cerrar sesion">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="adm-main">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
