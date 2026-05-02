import { useState, useEffect } from 'react';
import { notificationsApi } from '../../../api/api';
import { Bell, ShoppingCart, MessageSquare, CheckCircle } from 'lucide-react';

export default function SupplierSettingsPage() {
  const [settings, setSettings] = useState({ notifyMarketplace: true, notifyRFQs: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    notificationsApi.getSettings()
      .then(r => setSettings(r.data?.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await notificationsApi.updateSettings(settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Cargando configuración...</div>;

  return (
    <div className="sp-page" style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 className="sp-page-title">Configuración de la Cuenta</h1>
        <p className="sp-page-sub">Gestiona tus preferencias de notificaciones y alertas.</p>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: 24 }}>
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={20} color="var(--accent)" /> Preferencias de Notificación
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Marketplace toggle */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ background: '#dbeafe', padding: 12, borderRadius: 12 }}>
              <ShoppingCart size={20} color="#2563eb" />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem' }}>Pedidos del Marketplace</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Recibe alertas cuando un cliente realice una compra directa de tu catálogo.
              </p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={settings.notifyMarketplace}
                onChange={e => setSettings(s => ({ ...s, notifyMarketplace: e.target.checked }))}
                style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
              />
            </label>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

          {/* RFQs toggle */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ background: '#f3e8ff', padding: 12, borderRadius: 12 }}>
              <MessageSquare size={20} color="#9333ea" />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem' }}>Nuevas Cotizaciones (RFQs)</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Recibe alertas cuando el administrador te asigne una oportunidad de cotización.
              </p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={settings.notifyRFQs}
                onChange={e => setSettings(s => ({ ...s, notifyRFQs: e.target.checked }))}
                style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
              />
            </label>
          </div>
        </div>

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
          {success && <span style={{ color: 'var(--success)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={16} /> Guardado</span>}
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="sp-btn-primary" 
            style={{ padding: '10px 24px', borderRadius: 8 }}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
