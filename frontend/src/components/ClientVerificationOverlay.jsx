import React, { useState } from 'react';
import { AlertCircle, CheckCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { clientProfileApi } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function ClientVerificationOverlay({ onVerified, onCancel }) {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    companyName: '',
    taxId: 'XAXX010101000', // Default generic RFC for quick verification
    businessType: 'Otro',
    commercialAddress: '',
    phone: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.commercialAddress || !form.phone) {
      setError('Por favor ingresa tu teléfono y ubicación de entrega.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await clientProfileApi.upsert(form);
      if (refreshUser) await refreshUser();
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al verificar cuenta.');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '450px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', textAlign: 'center', padding: '40px 30px' }}>
          <div style={{ width: '64px', height: '64px', background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>¡Cuenta Verificada con Éxito!</h2>
          <p style={{ fontSize: '1rem', color: '#475569', margin: '0 0 24px', lineHeight: 1.5 }}>
            Tu cuenta ha pasado de normal a <strong>Verificada B2B</strong>. Ya tienes acceso completo para crear cotizaciones y comprar en el marketplace.
          </p>
          <button 
            onClick={() => onVerified && onVerified()}
            style={{ width: '100%', padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1rem' }}
          >
            ¡Empieza a pedir ya! <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        
        {/* Header */}
        <div style={{ background: '#f8fafc', padding: '24px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', background: '#dbeafe', color: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Completa tu registro para continuar</h2>
          <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            Para poder enviar solicitudes de cotización o comprar en nuestro Marketplace, necesitamos saber dónde entregar tus pedidos y cómo contactarte.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{ padding: '12px', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', border: '1px solid #fca5a5' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Nombre o Razón Social</label>
              <input 
                type="text" 
                value={form.companyName}
                onChange={e => setForm({...form, companyName: e.target.value})}
                placeholder="Ej. Mi Empresa S.A. o Tu Nombre"
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Teléfono / WhatsApp</label>
              <input 
                type="tel" 
                value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})}
                placeholder="Ej. +52 81 1234 5678"
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Ubicación de Entrega (Dirección Completa)</label>
              <textarea 
                value={form.commercialAddress}
                onChange={e => setForm({...form, commercialAddress: e.target.value})}
                placeholder="Calle, Número, Colonia, Ciudad, Estado, CP"
                required
                rows={3}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', resize: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button 
              type="button" 
              onClick={onCancel}
              style={{ flex: 1, padding: '12px', background: '#fff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={saving}
              style={{ flex: 1, padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {saving ? 'Verificando...' : <><CheckCircle size={18} /> Verificar Cuenta</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
