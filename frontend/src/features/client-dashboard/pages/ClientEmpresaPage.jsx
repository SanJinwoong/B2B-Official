import { useState } from 'react';
import {
  Building2, User, MapPin, Bell, Shield,
  Pencil, ChevronRight, Mail, Phone, Lock, Smartphone, Globe, CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

/* ── Static seed data matching Figma ──────────────────────────────────── */
const COMPANY = {
  razonSocial: 'Distribuidora del Norte S.A. de C.V.',
  rfc: 'DN0951204ABC',
  industria: 'Distribución y Comercio',
  sitioWeb: 'www.distribuidoradelnorte.com',
  plan: 'Business Pro',
  miembroDesde: 'julio de 2025',
};
const CONTACT = {
  nombre: 'María González Ríos',
  email: 'maria.gonzalez@distribuidora.com',
  telefono: '+52 81 1234 5678',
};
const ADDRESS = {
  calle: 'Av. Constitución 1450, Piso 3',
  ciudad: 'Monterrey',
  estado: 'Nuevo León',
  pais: 'México',
  cp: '64000',
};
const GESTOR = {
  nombre: 'Andrea Vega',
  email: 'andrea.vega@b2bplatform.com',
  disponible: true,
  respuesta: 'Responde en <2 hrs',
};
const NOTIFICATIONS_INIT = [
  { id: 'orders',   label: 'Actualizaciones de pedidos',   sub: 'Cuando cambie el estado de tus órdenes',            on: true  },
  { id: 'rfqs',     label: 'Cotizaciones listas',           sub: 'Cuando tu gestor envíe opciones de cotización',     on: true  },
  { id: 'payments', label: 'Recordatorio de pagos',         sub: 'Antes de la fecha de vencimiento',                 on: true  },
  { id: 'samples',  label: 'Muestras disponibles',          sub: 'Cuando llegue una muestra para tu aprobación',     on: false },
  { id: 'report',   label: 'Reporte semanal',               sub: 'Resumen de actividad de tu cuenta',                on: false },
];

/* ── Helper: initials from company name ────────────────────────────────── */
function companyInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/* ── Sub-components ────────────────────────────────────────────────────── */
function SectionCard({ icon, title, children }) {
  return (
    <div className="ce-section-card">
      <div className="ce-section-head">
        <span className="ce-section-icon">{icon}</span>
        <h2 className="ce-section-title">{title}</h2>
      </div>
      <div className="ce-section-body">{children}</div>
    </div>
  );
}

function FieldRow({ label, value, icon, half }) {
  return (
    <div className={`ce-field${half ? ' half' : ''}`}>
      <div className="ce-field-label">{label}</div>
      <div className="ce-field-value">
        {icon && <span className="ce-field-icon">{icon}</span>}
        {value || '—'}
      </div>
    </div>
  );
}

function FieldGrid({ children }) {
  return <div className="ce-field-grid">{children}</div>;
}

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`ce-toggle${on ? ' on' : ''}`}
      aria-checked={on}
      role="switch"
    >
      <span className="ce-toggle-thumb" />
    </button>
  );
}

/* ── Main component ────────────────────────────────────────────────────── */
export default function ClientEmpresaPage() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState(NOTIFICATIONS_INIT);

  const toggleNotif = (id) =>
    setNotifs(n => n.map(x => x.id === id ? { ...x, on: !x.on } : x));

  const initials = companyInitials(COMPANY.razonSocial);

  return (
    <div>
      {/* ── Page header ── */}
      <div className="cd-section-header">
        <div>
          <h1 className="cd-section-title">Configuración de Empresa</h1>
          <p className="cd-section-sub">Gestiona la información de tu empresa y preferencias.</p>
        </div>
        <button className="cd-btn-ghost ce-edit-btn">
          <Pencil size={14} /> Editar
        </button>
      </div>

      {/* ── Two-column grid ── */}
      <div className="ce-grid">

        {/* ── LEFT: main content ── */}
        <div className="ce-left">

          {/* 1. Información de la Empresa */}
          <SectionCard icon={<Building2 size={18} />} title="Información de la Empresa">
            <FieldRow label="RAZÓN SOCIAL" value={COMPANY.razonSocial} />
            <FieldGrid>
              <FieldRow label="RFC / TAX ID"       value={COMPANY.rfc}       half />
              <FieldRow label="INDUSTRIA / SECTOR"  value={COMPANY.industria} half />
            </FieldGrid>
            <FieldGrid>
              <FieldRow label="SITIO WEB"    value={COMPANY.sitioWeb} half />
              <FieldRow label="PLAN ACTUAL"  value={COMPANY.plan}     half />
            </FieldGrid>
          </SectionCard>

          {/* 2. Contacto Principal */}
          <SectionCard icon={<User size={18} />} title="Contacto Principal">
            <FieldRow label="NOMBRE DEL CONTACTO" value={user?.name || CONTACT.nombre} />
            <FieldGrid>
              <FieldRow label="CORREO ELECTRÓNICO" value={user?.email || CONTACT.email}
                icon={<Mail size={13} style={{ color: '#64748b' }} />} half />
              <FieldRow label="TELÉFONO" value={CONTACT.telefono}
                icon={<Phone size={13} style={{ color: '#64748b' }} />} half />
            </FieldGrid>
          </SectionCard>

          {/* 3. Dirección Fiscal */}
          <SectionCard icon={<MapPin size={18} />} title="Dirección Fiscal">
            <FieldRow label="CALLE Y NÚMERO" value={ADDRESS.calle} />
            <FieldGrid>
              <FieldRow label="CIUDAD" value={ADDRESS.ciudad} half />
              <FieldRow label="ESTADO" value={ADDRESS.estado} half />
            </FieldGrid>
            <FieldGrid>
              <FieldRow label="PAÍS"          value={ADDRESS.pais} half />
              <FieldRow label="CÓDIGO POSTAL" value={ADDRESS.cp}   half />
            </FieldGrid>
          </SectionCard>

          {/* 4. Preferencias de Notificaciones */}
          <SectionCard icon={<Bell size={18} />} title="Preferencias de Notificaciones">
            {notifs.map(n => (
              <div key={n.id} className="ce-notif-row">
                <div className="ce-notif-info">
                  <div className="ce-notif-label">{n.label}</div>
                  <div className="ce-notif-sub">{n.sub}</div>
                </div>
                <Toggle on={n.on} onChange={() => toggleNotif(n.id)} />
              </div>
            ))}
          </SectionCard>
        </div>

        {/* ── RIGHT: sidebar ── */}
        <div className="ce-right">

          {/* Company card (dark) */}
          <div className="ce-company-card">
            <div className="ce-company-card-avatar">{initials}</div>
            <div className="ce-company-card-name">{COMPANY.razonSocial}</div>
            <div className="ce-company-card-email">{user?.email || CONTACT.email}</div>
            <span className="ce-company-card-badge">
              <Shield size={12} /> Business Pro
            </span>
            <div className="ce-company-card-meta">
              <div className="ce-company-card-meta-row">
                <span>Miembro desde</span><span>{COMPANY.miembroDesde}</span>
              </div>
              <div className="ce-company-card-meta-row">
                <span>RFC</span><span>{COMPANY.rfc}</span>
              </div>
            </div>
          </div>

          {/* Gestor Asignado */}
          <div className="ce-sidebar-card">
            <div className="ce-sidebar-card-title">Tu Gestor Asignado</div>
            <div className="ce-gestor-row">
              <div className="ce-gestor-avatar">AV</div>
              <div>
                <div className="ce-gestor-name">{GESTOR.nombre}</div>
                <div className="ce-gestor-email">{GESTOR.email}</div>
                <div className="ce-gestor-status">
                  <span className="ce-status-dot" />
                  Disponible · {GESTOR.respuesta}
                </div>
              </div>
            </div>
          </div>

          {/* Seguridad */}
          <div className="ce-sidebar-card">
            <div className="ce-sidebar-card-title ce-security-title">
              <Shield size={15} /> Seguridad
            </div>
            {[
              { icon: <Lock size={14} />,        label: 'Cambiar Contraseña' },
              { icon: <Smartphone size={14} />,  label: 'Verificación en Dos Pasos' },
              { icon: <Globe size={14} />,        label: 'Sesiones Activas' },
            ].map(({ icon, label }) => (
              <button key={label} className="ce-security-row">
                <span className="ce-security-icon">{icon}</span>
                <span className="ce-security-label">{label}</span>
                <ChevronRight size={14} className="ce-security-chevron" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
