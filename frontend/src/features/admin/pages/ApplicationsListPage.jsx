/**
 * ApplicationsListPage.jsx
 *
 * Tabla paginada de todas las solicitudes de registro de proveedores.
 * Filtro por estado con <select>. Clic en fila → detalle de la solicitud.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }     from '../../../context/AuthContext';
import { adminApi }    from '../../../api/api';
import StatusBadge     from '../components/StatusBadge';
import '../admin-applications.css';

const STATUS_OPTIONS = [
  { value: '',               label: 'Todos los estados' },
  { value: 'PENDING',        label: '● Pendientes' },
  { value: 'REVIEWING',      label: '◉ En Revisión' },
  { value: 'ACTION_REQUIRED',label: '▲ Acción Requerida' },
  { value: 'APPROVED',       label: '✓ Aprobados' },
  { value: 'REJECTED',       label: '✕ Rechazados' },
];

const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const ApplicationsListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [apps,       setApps]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status,     setStatus]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.listApplications({
        ...(status ? { status } : {}),
        page,
        limit: LIMIT,
      });
      setApps(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'No se pudieron cargar las solicitudes.');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  // Resetear a página 1 cuando cambia el filtro
  const handleStatusChange = (val) => { setStatus(val); setPage(1); };

  return (
    <div className="aa-layout">
      <main className="aa-content">

        {/* Page header */}
        <div className="aa-page-header">
          <div>
            <h1 className="aa-page-title">Solicitudes de Registro</h1>
            <p className="aa-page-subtitle">Gestiona las solicitudes de registro de nuevos proveedores B2B.</p>
          </div>
          <button className="aa-btn aa-btn-ghost aa-btn-sm" onClick={load}>
            ↺ Actualizar
          </button>
        </div>

        {/* Filtros */}
        <div className="aa-filters">
          <select
            className="aa-filter-select"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {!loading && (
            <span className="aa-filter-count">
              {total} solicitud{total !== 1 ? 'es' : ''} encontrada{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Error */}
        {error && <div className="aa-error-box">{error}</div>}

        {/* Tabla */}
        <div className="aa-table-wrapper">
          {loading ? (
            <div className="aa-loading">
              <span className="aa-spinner" />
              Cargando solicitudes...
            </div>
          ) : (
            <table className="aa-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Categoría</th>
                  <th>Contacto</th>
                  <th>Estado</th>
                  <th>Revisor</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {apps.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="aa-table-empty">
                      No hay solicitudes con el filtro seleccionado.
                    </td>
                  </tr>
                ) : (
                  apps.map((app) => (
                    <tr key={app.id} onClick={() => navigate(`/admin/applications/${app.id}`)}>
                      <td>
                        <p className="aa-table-company">{app.companyName}</p>
                        <p className="aa-table-sub">{app.rfc}</p>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{app.category}</td>
                      <td>
                        <p>{app.contactName}</p>
                        <p className="aa-table-sub">{app.contactEmail}</p>
                      </td>
                      <td><StatusBadge status={app.status} /></td>
                      <td>
                        {app.reviewer
                          ? <span style={{ fontSize: '0.82rem', color: 'var(--aa-text-muted)' }}>{app.reviewer.name}</span>
                          : <span style={{ fontSize: '0.8rem', color: 'var(--aa-text-subtle)' }}>—</span>}
                      </td>
                      <td className="aa-table-date">{fmt(app.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* Paginación */}
          {totalPages > 1 && !loading && (
            <div className="aa-pagination">
              <span>Página {page} de {totalPages}</span>
              <div className="aa-pagination-btns">
                <button
                  className="aa-btn aa-btn-ghost aa-btn-sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  ← Anterior
                </button>
                <button
                  className="aa-btn aa-btn-ghost aa-btn-sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default ApplicationsListPage;
