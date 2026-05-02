import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, FileText, Package, MessageCircle, CreditCard, Building2, LogOut, Bell, ChevronDown, Settings, Menu, Sun, Moon, ShoppingCart, User, Globe } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { messageApi, marketplaceApi } from '../../../api/api';
import CartDrawer from '../components/CartDrawer';
import NotificationBell from '../../../components/notifications/NotificationBell';
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode]   = useState(() => localStorage.getItem('theme') === 'dark');
  const [cartCount, setCartCount] = useState(0);
  const [cartOpen, setCartOpen]   = useState(false);
  const [bounce, setBounce]       = useState(false);
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
    marketplaceApi.getCart().then(r => setCartCount(r.data.data?.itemCount || 0)).catch(() => {});
    const t = setInterval(() => {
      messageApi.getUnread().then(r => setUnread(r.data.unread)).catch(() => {});
      marketplaceApi.getCart().then(r => setCartCount(r.data.data?.itemCount || 0)).catch(() => {});
    }, 15000);
    
    const handleOpen = () => setCartOpen(true);
    const handleBounce = () => {
      setBounce(true);
      setTimeout(() => setBounce(false), 400);
      marketplaceApi.getCart().then(r => setCartCount(r.data.data?.itemCount || 0)).catch(() => {});
    };
    window.addEventListener('open-cart', handleOpen);
    window.addEventListener('cart-bounce', handleBounce);
    
    return () => {
      clearInterval(t);
      window.removeEventListener('open-cart', handleOpen);
      window.removeEventListener('cart-bounce', handleBounce);
    };
  }, []);

  // Cerrar dropdown al click fuera
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sincronizar dark mode con HTML class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={`cd-shell ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
      {/* ── Sidebar ── */}
      <aside className={`cd-sidebar ${!sidebarOpen ? 'closed' : ''}`}>
        {/* Logo */}
        <div className="cd-sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="cd-sidebar-logo-icon"><Building2 size={16} /></div>
            <div>
              <div className="cd-sidebar-logo-text">B2B Portal</div>
              <div className="cd-sidebar-logo-sub">Portal del Cliente</div>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
          >
            <Menu size={20} />
          </button>
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
      <div className={`cd-main ${!sidebarOpen ? 'expanded' : ''}`}>
        {/* Header */}
        <header className="cd-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {!sidebarOpen && (
              <button className="cd-header-menu-btn" onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
            {/* Dark mode toggle */}
            <button className="cd-header-bell" onClick={() => setDarkMode(!darkMode)} title="Alternar modo oscuro">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {/* Cart link */}
            <button id="global-cart-btn" className="cd-header-bell" onClick={() => setCartOpen(true)} title="Carrito de Compras">
              <ShoppingCart size={17} className={bounce ? 'cart-bounce-anim' : ''} />
              {cartCount > 0 && <span className="cd-header-bell-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>{cartCount}</span>}
            </button>

            {/* Notifications */}
            <NotificationBell />

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
                <Link to="/client/perfil" className="cd-dropdown-item" onClick={() => setDropOpen(false)}>
                  <User size={15} /> Configuración de perfil
                </Link>
                <Link to="/client/empresa" className="cd-dropdown-item" onClick={() => setDropOpen(false)}>
                  <Building2 size={15} /> Perfil de empresa
                </Link>
                <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                <button className="cd-dropdown-item" onClick={() => { setDropOpen(false); alert('Ajustes de idioma/moneda próximamente.'); }}>
                  <Globe size={15} /> Preferencias B2B
                </button>
                <Link to="/client/empresa" className="cd-dropdown-item" onClick={() => setDropOpen(false)}>
                  <Settings size={15} /> Ajustes avanzados
                </Link>
                <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                <button className="cd-dropdown-item" onClick={handleLogout} style={{ color: 'var(--error)' }}>
                  <LogOut size={15} /> Cerrar Sesión
                </button>
              </div>
            )}
          </div>
          </div>
        </header>

        {/* Contenido de la página activa */}
        <div className="cd-content">
          <Outlet />
        </div>
      </div>
      
      {/* ── Global Cart Drawer ── */}
      {cartOpen && (
        <CartDrawer
          onClose={() => setCartOpen(false)}
          onCartChange={count => setCartCount(count)}
        />
      )}
    </div>
  );
}
