import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, FileText, Package, MessageCircle, CreditCard, Building2, LogOut, Bell, ChevronDown, Settings } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { messageApi } from '../../../api/api';
import '../client-dashboard.css';

const NAV = [
  { to: '/client/marketplace',label: 'Marketplace B2B',       icon: Package },
  { to: '/client/dashboard',  label: 'Dashboard',             icon: LayoutDashboard },
  { to: '/client/rfqs',     label: 'Cotizaciones',        icon: FileText },
  { to: '/client/orders',   label: 'Mis Pedidos',         icon: Package },
  { to: '/client/messages', label: 'Centro de Mensajes',  icon: MessageCircle, badge: true },
  { to: '/client/payments', label: 'Facturación y Pagos', icon: CreditCard },
  { to: '/client/empresa',  label: 'Mi Empresa',          icon: Building2 },
];

export default function ClientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread]       = useState(0);
  const [dropOpen, setDropOpen]   = useState(false);
  const dropRef = useRef(null);

  // Iniciales del avatar
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';
  // Nombre empresa del perfil guardado en localStorage
  const profile = (() => { try { return JSON.parse(localStorage.getItem('clientProfile') || '{}'); } catch { return {}; } })();
  const companyName = profile.companyName || user?.name || 'Mi Empresa';
  const companyPlan = 'Plan Business Pro';

  useEffect(() => {
    messageApi.getUnread().then(r => setUnread(r.data.unread)).catch(() => {});
    const t = setInterval(() => {
      messageApi.getUnread().then(r => setUnread(r.data.unread)).catch(() => {});
    }, 15000);
    return () => clearInterval(t);
  }, []);

  // Cerrar dropdown al click fuera
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="cd-shell">
      {/* ── Sidebar ── */}
      <aside className="cd-sidebar">
        {/* Logo */}
        <div className="cd-sidebar-logo">
          <div className="cd-sidebar-logo-icon"><Building2 size={16} /></div>
          <div>
            <div className="cd-sidebar-logo-text">B2B Portal</div>
            <div className="cd-sidebar-logo-sub">Portal del Cliente</div>
          </div>
        </div>

        {/* Bloque empresa */}
        <div className="cd-company-block">
          <div className="cd-company-avatar">{initials}</div>
          <div>
            <div className="cd-company-name">{companyName}</div>
            <div className="cd-company-plan">{companyPlan}</div>
          </div>
        </div>

        {/* Navegación */}
        <div className="cd-nav-label">Navegación</div>
        <nav>
          {NAV.map(({ to, label, icon: Icon, badge, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `cd-nav-item${isActive ? ' active' : ''}`}>
              <Icon size={16} strokeWidth={1.75} />
              {label}
              {badge && unread > 0 && <span className="cd-nav-badge">{unread}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="cd-sidebar-footer">
          <button className="cd-logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="cd-main">
        {/* Header */}
        <header className="cd-header">
          <button className="cd-header-bell">
            <Bell size={17} />
            <span className="cd-header-bell-badge" />
          </button>

          {/* Avatar + dropdown */}
          <div style={{ position: 'relative' }} ref={dropRef}>
            <button className="cd-header-user" onClick={() => setDropOpen(v => !v)}>
              <div className="cd-header-avatar">{initials}</div>
              <div>
                <div className="cd-header-username">{user?.name}</div>
                <div className="cd-header-company">{companyName}</div>
              </div>
              <ChevronDown size={14} style={{ color: '#94a3b8', marginLeft: 4 }} />
            </button>
            {dropOpen && (
              <div className="cd-header-dropdown">
                <Link to="/client/empresa" className="cd-dropdown-item" onClick={() => setDropOpen(false)}>
                  <Settings size={15} /> Configuración de empresa
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Contenido de la página activa */}
        <div className="cd-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
