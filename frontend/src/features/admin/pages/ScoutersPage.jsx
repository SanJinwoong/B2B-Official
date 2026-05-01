/**
 * ScoutersPage.jsx — Admin: Gestión y ranking de scouters
 *
 * - Tabla de ranking por calificación (avgRating DESC)
 * - CRUD: crear, editar nombre/email/teléfono, activar/desactivar, eliminar
 * - Columnas: Pos · Nombre · Email · Tel · Clientes referidos · Calificación (estrellas) · Estado · Acciones
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Star, Plus, Pencil, Trash2, Check, X,
  Users, Trophy, RefreshCw, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { adminScouterApi } from '../../../api/api';

// ── Utilidades ──────────────────────────────────────────────────────────────
const StarDisplay = ({ value, max = 5 }) => (
  <span style={{ display: 'inline-flex', gap: '1px', alignItems: 'center' }}>
    {Array.from({ length: max }, (_, i) => (
      <Star
        key={i}
        size={13}
        fill={i < Math.round(value) ? '#f59e0b' : 'none'}
        color={i < Math.round(value) ? '#f59e0b' : '#cbd5e1'}
        strokeWidth={1.5}
      />
    ))}
    <span style={{ marginLeft: '4px', fontSize: '12px', fontWeight: 600, color: '#f59e0b' }}>
      {value.toFixed(1)}
    </span>
  </span>
);

const medalColors = ['#f59e0b', '#94a3b8', '#cd7f32'];

const EMPTY_FORM = { name: '', email: '', phone: '' };

// ── Componente principal ────────────────────────────────────────────────────
const ScoutersPage = () => {
  const [scouters, setScouters] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  // Form de creación / edición
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState('');

  // ── Carga ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminScouterApi.listAll();
      setScouters(data);
    } catch {
      setError('No se pudieron cargar los scouters.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Helpers de form ────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditId(s.id);
    setForm({ name: s.name, email: s.email || '', phone: s.phone || '' });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('El nombre es obligatorio.'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (editId) {
        await adminScouterApi.update(editId, form);
      } else {
        await adminScouterApi.create(form);
      }
      closeForm();
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (s) => {
    try {
      await adminScouterApi.update(s.id, { isActive: !s.isActive });
      load();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este scouter? Se perderán sus calificaciones.')) return;
    try {
      await adminScouterApi.remove(id);
      load();
    } catch { /* ignore */ }
  };

  // ── Estadísticas rápidas ──────────────────────────────────────────────────
  const totalClients = scouters.reduce((a, s) => a + (s._count?.clients || 0), 0);
  const avgOverall   = scouters.length
    ? (scouters.reduce((a, s) => a + s.avgRating, 0) / scouters.length).toFixed(1)
    : '—';
  const top = scouters[0];

  return (
    <div style={{ padding: '28px 24px', maxWidth: '1000px', margin: '0 auto' }}>

      {/* ── Cabecera ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={22} color="#f59e0b" /> Ranking de Scouters
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Gestiona a los scouters y visualiza su desempeño según las calificaciones de los clientes registrados.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={load}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '8px',
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> Actualizar
          </button>
          <button
            id="sc-create-btn"
            onClick={openCreate}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px',
              border: 'none', background: 'var(--accent)',
              color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={15} /> Nuevo Scouter
          </button>
        </div>
      </div>

      {/* ── Métricas rápidas ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Scouters activos', value: scouters.filter((s) => s.isActive).length, color: 'var(--accent)' },
          { label: 'Clientes referidos', value: totalClients, color: '#0ea5e9', icon: <Users size={16} color="#0ea5e9" /> },
          { label: 'Calificación promedio', value: avgOverall, color: '#f59e0b', suffix: '/ 5' },
        ].map((m) => (
          <div key={m.label} style={{
            padding: '16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
          }}>
            <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</p>
            <p style={{ margin: '6px 0 0', fontSize: '1.6rem', fontWeight: 800, color: m.color }}>
              {m.value} {m.suffix && <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)' }}>{m.suffix}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* ── Banner del top scouter ──────────────────────────────────────── */}
      {top && top.avgRating > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '14px 18px',
          background: 'linear-gradient(135deg, #f59e0b18, #f59e0b08)',
          border: '1px solid #f59e0b40',
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <Trophy size={20} color="#f59e0b" />
          <div>
            <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '13.5px' }}>
              🥇 {top.name}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
              es el mejor scouter con ★ {top.avgRating.toFixed(1)} promedio y {top._count?.clients || 0} clientes referidos.
            </span>
          </div>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', marginBottom: '16px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* ── Modal / Form inline ──────────────────────────────────────────── */}
      {showForm && (
        <div style={{
          marginBottom: '20px',
          padding: '20px',
          background: 'var(--bg-card)',
          border: '2px solid var(--accent)',
          borderRadius: '12px',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
            {editId ? 'Editar Scouter' : 'Nuevo Scouter'}
          </h3>

          {formError && (
            <div style={{ padding: '8px 12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#dc2626', marginBottom: '12px', fontSize: '12.5px' }}>
              {formError}
            </div>
          )}

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {[
                { id: 'sc-name',  label: 'Nombre *', key: 'name',  placeholder: 'Juan López',           type: 'text'  },
                { id: 'sc-email', label: 'Email',    key: 'email', placeholder: 'juan@email.com',       type: 'email' },
                { id: 'sc-phone', label: 'Teléfono', key: 'phone', placeholder: '+52 55 1234 5678',     type: 'tel'   },
              ].map(({ id, label, key, placeholder, type }) => (
                <div key={key}>
                  <label htmlFor={id} style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    {label}
                  </label>
                  <input
                    id={id}
                    type={type}
                    value={form[key]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="ap-input"
                    style={{ width: '100%', boxSizing: 'border-box', fontSize: '13px' }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={closeForm} style={{
                padding: '8px 16px', borderRadius: '7px',
                border: '1px solid var(--border)', background: 'var(--bg-card)',
                color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}>
                <X size={14} /> Cancelar
              </button>
              <button type="submit" disabled={saving} style={{
                padding: '8px 18px', borderRadius: '7px',
                border: 'none', background: 'var(--accent)',
                color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}>
                <Check size={14} /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tabla de ranking ────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
          Cargando scouters...
        </div>
      ) : scouters.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: 'var(--bg-card)',
          border: '1px dashed var(--border)',
          borderRadius: '12px',
        }}>
          <Users size={36} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            No hay scouters registrados aún. Crea el primero.
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                {['#', 'Nombre', 'Contacto', 'Clientes', 'Calificación', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left',
                    fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scouters.map((s, i) => (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: i === 0 && s.avgRating > 0 ? '#f59e0b08' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = i === 0 && s.avgRating > 0 ? '#f59e0b08' : 'transparent'}
                >
                  {/* Posición */}
                  <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '26px', height: '26px', borderRadius: '50%',
                      background: i < 3 && s.avgRating > 0 ? `${medalColors[i]}22` : 'var(--bg)',
                      color: i < 3 && s.avgRating > 0 ? medalColors[i] : 'var(--text-muted)',
                      border: `1px solid ${i < 3 && s.avgRating > 0 ? medalColors[i] : 'var(--border)'}`,
                      fontSize: '12px',
                    }}>
                      {i + 1}
                    </span>
                  </td>

                  {/* Nombre + avatar */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>
                        {s.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{s.name}</span>
                        {i === 0 && s.avgRating > 0 && (
                          <span style={{ marginLeft: '6px', fontSize: '10px', color: '#f59e0b', fontWeight: 700 }}>
                            🥇 TOP
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Contacto */}
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '12px' }}>{s.email || '—'}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{s.phone || ''}</div>
                  </td>

                  {/* Clientes referidos */}
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '3px 10px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '20px', fontSize: '12px',
                      fontWeight: 600, color: 'var(--text)',
                    }}>
                      <Users size={11} /> {s._count?.clients || 0}
                    </span>
                  </td>

                  {/* Calificación */}
                  <td style={{ padding: '12px 14px' }}>
                    {s.ratingCount > 0 ? (
                      <div>
                        <StarDisplay value={s.avgRating} />
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {s.ratingCount} {s.ratingCount === 1 ? 'voto' : 'votos'}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sin votos</span>
                    )}
                  </td>

                  {/* Estado */}
                  <td style={{ padding: '12px 14px' }}>
                    <button
                      title={s.isActive ? 'Desactivar' : 'Activar'}
                      onClick={() => handleToggle(s)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        display: 'flex', alignItems: 'center', gap: '5px',
                        color: s.isActive ? '#22c55e' : 'var(--text-muted)',
                        fontSize: '12px', fontWeight: 600,
                      }}
                    >
                      {s.isActive
                        ? <><ToggleRight size={18} /> Activo</>
                        : <><ToggleLeft size={18} /> Inactivo</>
                      }
                    </button>
                  </td>

                  {/* Acciones */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        title="Editar"
                        onClick={() => openEdit(s)}
                        style={{
                          background: 'none', border: '1px solid var(--border)',
                          borderRadius: '6px', padding: '5px 8px',
                          cursor: 'pointer', color: 'var(--text-muted)',
                          display: 'flex', alignItems: 'center',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        title="Eliminar"
                        onClick={() => handleDelete(s.id)}
                        style={{
                          background: 'none', border: '1px solid var(--border)',
                          borderRadius: '6px', padding: '5px 8px',
                          cursor: 'pointer', color: 'var(--text-muted)',
                          display: 'flex', alignItems: 'center',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ScoutersPage;
