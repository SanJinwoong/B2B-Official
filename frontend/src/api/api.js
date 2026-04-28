import axios from 'axios';

// ─── Cliente Axios centralizado ───────────────────────────────────────────────
// Todas las llamadas al backend pasan por aquí.
// Esto garantiza que:
//   1. La base URL esté en un único lugar (.env)
//   2. El token se adjunte automáticamente en CADA request autenticado
//   3. Las respuestas 401 (token expirado) redirijan al login automáticamente

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: adjunta el token JWT si existe ───────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: maneja token expirado / inválido ────────────────────
// Si el backend responde 401, el token expiró o es inválido.
// Limpiamos localStorage y redirigimos al login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirige al login fuera del árbol de React
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Funciones de Auth ────────────────────────────────────────────────────────

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  changePassword: (data) => api.patch('/auth/change-password', data),
};

// ─── Perfil Empresarial del Cliente ──────────────────────────────────────────

export const clientProfileApi = {
  get:    ()     => api.get('/clients/profile'),
  upsert: (data) => api.post('/clients/profile', data),
};

// ─── Perfil personal del usuario ─────────────────────────────────────────────

export const meApi = {
  get:             ()     => api.get('/me'),
  update:          (data) => api.patch('/me', data),
  changePassword:  (data) => api.patch('/me/password', data),
};

// ─── Funciones de Productos ───────────────────────────────────────────────────

export const productsApi = {
  getAll: () => api.get('/products'),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
};

// ─── Funciones de Órdenes ─────────────────────────────────────────────────────

export const ordersApi = {
  create: (data) => api.post('/orders', data),
  getMyOrders: () => api.get('/orders/my'),
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
};

// ─── Funciones de Administración ─────────────────────────────────────────────

export const adminApi = {
  // Usuarios
  getAllUsers: () => api.get('/admin/users'),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),

  // Pedidos
  getAllOrders: () => api.get('/admin/orders'),
  updateOrderStatus: (id, status) => api.patch(`/admin/orders/${id}/status`, { status }),

  // Solicitudes de proveedores
  listApplications: (params) => api.get('/admin/applications', { params }),
  getApplication:   (id) => api.get(`/admin/applications/${id}`),
  claimApplication: (id) => api.patch(`/admin/applications/${id}/claim`),
  approveApplication: (id) => api.patch(`/admin/applications/${id}/approve`),
  rejectApplication:  (id, actionNote) => api.patch(`/admin/applications/${id}/reject`, { actionNote }),
  requestAction:      (id, actionNote) => api.patch(`/admin/applications/${id}/request-action`, { actionNote }),
  downloadDocumentUrl: (appId, docId) =>
    `${import.meta.env.VITE_API_URL}/admin/applications/${appId}/documents/${docId}/download`,
};

// ─── Funciones de Registro de Proveedores (públicas) ─────────────────────────

export const supplierApplicationApi = {
  /**
   * Envía el formulario completo como multipart/form-data.
   * @param {FormData} formData - FormData construido con todos los campos + archivos
   */
  create: (formData) =>
    api.post('/supplier-applications', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   * Consulta el estado de una solicitud por su ID.
   * Sin autenticación — el cuid actúa como identificador opaco.
   */
  getStatus: (id) => api.get(`/supplier-applications/status/${id}`),

  /**
   * Obtiene los datos de la solicitud por token para pre-rellenar el formulario de corrección.
   * @param {string} token - actionToken de la URL
   */
  getByToken: (token) => api.get(`/supplier-applications/action/${token}`),

  /**
   * Envía correcciones usando el token del correo.
   * @param {string}   token    - actionToken de la URL
   * @param {FormData} formData - Campos corregidos + nuevos archivos opcionales
   */
  applyCorrection: (token, formData) =>
    api.patch(`/supplier-applications/action/${token}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default api;
