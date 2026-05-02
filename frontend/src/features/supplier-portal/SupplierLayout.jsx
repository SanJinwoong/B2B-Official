import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, Zap, Package, BookOpen, MessageSquare, Star, LogOut, Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../../components/notifications/NotificationBell';
import './supplier-portal.css';

const NAV = [
  { to: '/proveedor/dashboard',  icon: LayoutDashboard, label: 'Dashboard',           badge: null },
  { to: '/proveedor/rfqs',       icon: Zap,             label: 'Oportunidades (RFQs)', badge: 'newRFQs' },
  { to: '/proveedor/pedidos',    icon: Package,         label: 'Mis Pedidos Activos',  badge: null },
  { to: '/proveedor/catalogo',   icon: BookOpen,        label: 'Mi Catálogo',           badge: null },
  { to: '/proveedor/mensajes',   icon: MessageSquare,   label: 'Mensajería',            badge: 'messages' },
  { to: '/proveedor/rendimiento',icon: Star,            label: 'Mi Rendimiento',         badge: null },
];

function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'SP';
}

function StarRating({ value = 0 }) {
  return (
    <div className="sp-stars">
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ opacity: i <= Math.round(value) ? 1 : 0.3 }}>★</span>
      ))}
      <span style={{ fontSize:11, color:'#fbbf24', marginLeft:4 }}>{value > 0 ? value.toFixed(1) : 'N/A'}</span>
    </div>
  );
}

export default function SupplierLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };
  const companyInit = initials(user?.name);

  return (
    <div className="sp-shell">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="sp-sidebar">
        {/* Logo */}
        <div className="sp-sidebar-logo">
          <div className="sp-logo-icon">B2</div>
          <div>
            <div className="sp-logo-title">B2B Supply</div>
            <div className="sp-logo-sub">Portal del Proveedor</div>
          </div>
        </div>

        {/* Company card */}
        <div className="sp-company-card">
          <div className="sp-company-row">
            <div className="sp-avatar">
              {user?.avatar
                ? <img src={user.avatar} alt="avatar" />
                : companyInit}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="sp-company-name">{user?.name || 'Proveedor'}</div>
              <div className="sp-company-status">Cuenta Activa</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:10, color:'#64748b' }}>Calificación</span>
            <StarRating value={0} />
          </div>
        </div>

        {/* Nav */}
        <nav className="sp-nav-section" style={{ flex:1, overflowY:'auto' }}>
          <div className="sp-nav-label">Navegación</div>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sp-nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="sp-sidebar-footer">
          <button className="sp-logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="sp-main">
        {/* Top bar */}
        <header className="sp-topbar">
          <NotificationBell />
          <div style={{ position: 'relative' }} ref={dropRef}>
            <div className="sp-topbar-user" onClick={() => setDropOpen(!dropOpen)} style={{ cursor: 'pointer' }}>
              <div className="sp-avatar" style={{ width:32, height:32, fontSize:12 }}>
                {user?.avatar ? <img src={user.avatar} alt="" /> : initials(user?.name)}
              </div>
              <div>
                <div className="sp-topbar-name">{user?.name}</div>
                <div className="sp-topbar-company">{user?.email}</div>
              </div>
              <ChevronDown size={14} color="var(--text-muted)" />
            </div>
            {dropOpen && (
              <div className="sp-header-dropdown" style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 220,
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', zIndex: 1000, overflow: 'hidden'
              }}>
                <Link to="/proveedor/configuracion" className="sp-dropdown-item" onClick={() => setDropOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', color: 'var(--text)', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}>
                  <Star size={15} /> Configuración
                </Link>
                <button className="sp-dropdown-item" onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', color: 'var(--danger)', textDecoration: 'none', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <LogOut size={15} /> Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="sp-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
