import { useState, useEffect } from 'react';
import { adminConfigApi } from '../../../api/api';
import { Settings, DollarSign, Building2, Coins, Save, RefreshCw } from 'lucide-react';

export default function AdminConfigPage() {
  const [config, setConfig]   = useState({ marginPercentage: 15, currency: 'MXN', companyName: 'B2B Intermediacion' });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    adminConfigApi.getAdminConfig()
      .then(r => setConfig(r.data.data || r.data))
      .catch(() => setError('No se pudo cargar la configuración.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const r = await adminConfigApi.patchAdminConfig(config);
      setConfig(r.data.data || r.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // Preview: cuánto gana la plataforma con margen actual sobre $10,000
  const exampleSupplier = 10000;
  const exampleClient   = parseFloat((exampleSupplier * (1 + config.marginPercentage / 100)).toFixed(2));
  const exampleProfit   = parseFloat((exampleClient - exampleSupplier).toFixed(2));

  const LOCALES = { MXN: 'es-MX', USD: 'en-US', EUR: 'de-DE' };
  const fmtCurrency = (val) => new Intl.NumberFormat(
    LOCALES[config.currency] || 'es-MX',
    { style: 'currency', currency: config.currency || 'MXN', maximumFractionDigits: 0 }
  ).format(val);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
      <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginRight: 10 }} /> Cargando configuración...
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
          <Settings size={26} /> Configuración
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem', fontSize: '0.95rem' }}>
          Ajusta los parámetros globales de la plataforma intermediaria.
        </p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* ── Margen de Ganancia ── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <DollarSign size={20} color="#2563eb" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Margen de Ganancia</h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 1.2rem' }}>
            Define el porcentaje de margen de cobro sobre los pedidos de cotización.
          </p>

          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.4rem' }}>
            Porcentaje de Margen (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={config.marginPercentage}
            onChange={e => setConfig(p => ({ ...p, marginPercentage: parseFloat(e.target.value) || 0 }))}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '10px 14px',
              border: '1px solid var(--border)', borderRadius: 8, fontSize: '1rem',
              fontWeight: 700, color: 'var(--text)', background: 'var(--surface-hover)',
              outline: 'none'
            }}
          />

          {/* Preview live */}
          <div style={{ marginTop: '1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#1d4ed8' }}>
            Con un margen del <strong>{config.marginPercentage}%</strong>, un pedido de proveedor de{' '}
            <strong>{fmtCurrency(exampleSupplier)}</strong> se cobra al cliente como{' '}
            <strong>{fmtCurrency(exampleClient)}</strong>{' '}
            — ganancia de la plataforma: <strong>{fmtCurrency(exampleProfit)}</strong>
          </div>
        </div>

        {/* ── Informacion de la Empresa ── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Building2 size={20} color="#7c3aed" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Información de la Empresa</h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 1.2rem' }}>
            Datos generales de tu plataforma intermediaria.
          </p>

          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.4rem' }}>
            Nombre de la Empresa
          </label>
          <input
            type="text"
            value={config.companyName}
            onChange={e => setConfig(p => ({ ...p, companyName: e.target.value }))}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '10px 14px',
              border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.9rem',
              color: 'var(--text)', background: 'var(--surface-hover)', outline: 'none',
              marginBottom: '1rem'
            }}
          />

          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.4rem' }}>
            Moneda
          </label>
          <select
            value={config.currency}
            onChange={e => setConfig(p => ({ ...p, currency: e.target.value }))}
            style={{
              width: '100%', padding: '10px 14px', boxSizing: 'border-box',
              border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.9rem',
              color: 'var(--text)', background: 'var(--surface-hover)', outline: 'none'
            }}
          >
            <option value="MXN">MXN — Peso Mexicano</option>
            <option value="USD">USD — Dólar Americano</option>
            <option value="EUR">EUR — Euro</option>
          </select>
        </div>
      </div>

      {/* Explicacion del modelo intermediario */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
          <Coins size={20} color="#d97706" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Como Funciona el Modelo Intermediario</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          {[
            { label: 'Proveedor cotiza', value: fmtCurrency(exampleSupplier), sub: 'Precio real del proveedor', color: '#6b7280', bg: '#f9fafb' },
            { label: 'Cliente paga', value: fmtCurrency(exampleClient), sub: `Precio con ${config.marginPercentage}% de margen`, color: '#2563eb', bg: '#eff6ff' },
            { label: 'Ganancia plataforma', value: fmtCurrency(exampleProfit), sub: 'Diferencia retenida', color: '#16a34a', bg: '#f0fdf4' },
          ].map(item => (
            <div key={item.label} style={{ background: item.bg, borderRadius: 10, padding: '1rem', textAlign: 'center', border: `1px solid ${item.color}22` }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', margin: '4px 0 2px' }}>{item.label}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Boton guardar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
        {saved && (
          <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.9rem' }}>
            Configuracion guardada correctamente
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 24px', borderRadius: 8,
            background: saving ? '#94a3b8' : '#2563eb',
            color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.95rem',
            cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.2s'
          }}
        >
          <Save size={16} />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
}
