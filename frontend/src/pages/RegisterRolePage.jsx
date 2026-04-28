/**
 * RegisterRolePage.jsx  —  NUEVA
 *
 * Pantalla intermediaria en /register.
 * Muestra 2 tarjetas: Cliente y Proveedor.
 * El usuario elige su rol antes de ir al formulario correspondiente.
 *
 * - "Registrarme como Cliente"   → /register/cliente
 * - "Registrarme como Proveedor" → /registro-proveedor  (ya implementado)
 */

import { Link } from 'react-router-dom';
import { Sun, Moon, Building2, ShoppingCart, Package, Check, ArrowRight, ChevronLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './auth-pages.css';

const CLIENT_BENEFITS = [
  'Acceso a un catálogo exclusivo de proveedores verificados',
  'Solicita cotizaciones (RFQ) con un clic',
  'Comparación de precios y lead times en tiempo real',
  'Gestión de órdenes y seguimiento de entregas',
  'Historial de compras y reportes de gasto',
  'Soporte prioritario B2B 24/7',
];

const SUPPLIER_BENEFITS = [
  'Exposición a cientos de clientes empresariales activos',
  'Recibe RFQs automáticas según tu categoría',
  'Panel de control para gestionar órdenes y capacidad',
  'Incrementa tus ventas sin intermediarios',
  'Perfil verificado que genera confianza',
  'Pagos seguros y trazabilidad completa',
];

// ── Tarjeta de rol ─────────────────────────────────────────────────────────────
const RoleCard = ({ icon: Icon, badge, title, subtitle, benefits, cta, href, accent }) => (
  <div className={`rr-card ${accent ? 'rr-card-accent' : ''}`}>
    {accent && <div className="rr-recommended">RECOMENDADO PARA EMPRESAS</div>}

    <div className="rr-card-header">
      <div className={`rr-icon ${accent ? 'rr-icon-accent' : ''}`}>
        <Icon size={26} strokeWidth={1.75} />
      </div>
      <div>
        <p className="rr-badge">{badge}</p>
        <h2 className="rr-card-title">{title}</h2>
        <p className="rr-card-sub">{subtitle}</p>
      </div>
    </div>

    <ul className="rr-benefits">
      {benefits.map((b) => (
        <li key={b} className="rr-benefit-item">
          <Check size={14} strokeWidth={2.5} className="rr-check" />
          <span>{b}</span>
        </li>
      ))}
    </ul>

    <Link to={href} className={`rr-cta ${accent ? 'rr-cta-accent' : 'rr-cta-outline'}`}>
      {cta}
      <ArrowRight size={16} />
    </Link>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
const RegisterRolePage = () => {
  const { isDark, toggle } = useTheme();

  return (
    <div className="rr-page">

      {/* Toggle dark mode */}
      <button className="ap-theme-btn" onClick={toggle} title="Cambiar tema">
        {isDark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
      </button>

      {/* Header */}
      <div className="rr-header">
        <div className="ap-logo">
          <Building2 size={22} strokeWidth={2} />
        </div>
        <h1 className="rr-title">Crea tu cuenta en <span className="rr-brand">B2B Platform</span></h1>
        <p className="rr-subtitle">
          Elige cómo quieres participar en nuestra plataforma de comercio empresarial.
        </p>
      </div>

      {/* Tarjetas */}
      <div className="rr-grid">
        <RoleCard
          icon={ShoppingCart}
          badge="COMPRADOR"
          title="Quiero registrarme como Cliente"
          subtitle="Empresa que compra insumos, productos o servicios a través de la plataforma."
          benefits={CLIENT_BENEFITS}
          cta="Registrarme como Cliente"
          href="/register/cliente"
          accent={false}
        />
        <RoleCard
          icon={Package}
          badge="VENDEDOR"
          title="Quiero registrarme como Proveedor"
          subtitle="Empresa que ofrece productos o servicios a clientes corporativos verificados."
          benefits={SUPPLIER_BENEFITS}
          cta="Registrarme como Proveedor"
          href="/registro-proveedor"
          accent={true}
        />
      </div>

      {/* Footer */}
      <div className="rr-footer">
        <Link to="/login" className="rr-back">
          <ChevronLeft size={15} />
          Ya tengo cuenta — Iniciar sesión
        </Link>
      </div>
    </div>
  );
};

export default RegisterRolePage;
