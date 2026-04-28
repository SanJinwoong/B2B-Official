import { useEffect, useState } from 'react';
import { adminApi } from '../api/api';
import AdminLayout from '../components/AdminLayout';

const ROLES = ['CLIENT', 'SUPPLIER', 'ADMIN'];

/**
 * Página de gestión de usuarios (solo ADMIN).
 * Permite:
 *  - Ver todos los usuarios con su rol, estado y conteo de entidades.
 *  - Cambiar el rol de un usuario.
 *  - Activar o desactivar una cuenta.
 */
const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // { [userId]: boolean } — controla qué fila está procesando una acción
  const [processing, setProcessing] = useState({});

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.getAllUsers();
      setUsers(data.data);
    } catch {
      setError('No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  /**
   * Ejecuta una acción sobre un usuario y refresca la lista.
   * @param {number} id   - ID del usuario
   * @param {object} body - { role? } o { isActive? }
   */
  const handleUpdate = async (id, body) => {
    setProcessing((p) => ({ ...p, [id]: true }));
    try {
      await adminApi.updateUser(id, body);
      // Actualiza solo la fila modificada sin refetch completo
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...body } : u))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Error al actualizar el usuario.');
    } finally {
      setProcessing((p) => ({ ...p, [id]: false }));
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h2>Gestión de Usuarios</h2>
        <span className="status-count">{users.length} usuarios</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && <p className="status-msg">Cargando usuarios...</p>}

      {!loading && users.length > 0 && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Órdenes</th>
                <th>Productos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={!user.isActive ? 'row-inactive' : ''}>
                  <td>#{user.id}</td>
                  <td>{user.name}</td>
                  <td className="td-email">{user.email}</td>

                  {/* ── Selector de rol ── */}
                  <td>
                    <select
                      className="inline-select"
                      value={user.role}
                      disabled={processing[user.id]}
                      onChange={(e) => handleUpdate(user.id, { role: e.target.value })}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>

                  {/* ── Estado activo ── */}
                  <td>
                    <span className={`status-pill ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  <td className="td-center">{user._count?.orders ?? 0}</td>
                  <td className="td-center">{user._count?.products ?? 0}</td>

                  {/* ── Botón activar / desactivar ── */}
                  <td>
                    <button
                      className={`btn btn-sm ${user.isActive ? 'btn-danger' : 'btn-success'}`}
                      disabled={processing[user.id]}
                      onClick={() => handleUpdate(user.id, { isActive: !user.isActive })}
                    >
                      {processing[user.id]
                        ? '...'
                        : user.isActive
                        ? 'Desactivar'
                        : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && users.length === 0 && (
        <p className="status-msg">No hay usuarios registrados.</p>
      )}
    </AdminLayout>
  );
};

export default AdminUsersPage;
