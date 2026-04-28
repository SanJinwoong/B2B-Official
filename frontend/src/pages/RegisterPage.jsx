import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/api';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { value: 'CLIENT', label: 'Cliente' },
  { value: 'SUPPLIER', label: 'Proveedor' },
];

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CLIENT',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors([]);
    setLoading(true);

    try {
      const { data } = await authApi.register(form);
      // ✅ Guarda el token en localStorage via AuthContext
      login(data.token, data.user);
      navigate('/products');
    } catch (err) {
      const response = err.response?.data;
      if (response?.errors) {
        // Errores de validación Zod (400)
        setFieldErrors(response.errors);
      } else {
        setError(response?.message || 'Error al registrarse.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Obtiene el error de un campo específico
  const getFieldError = (field) =>
    fieldErrors.find((e) => e.field === field)?.message;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Crear Cuenta</h1>
        <p className="auth-subtitle">B2B Platform</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Nombre completo</label>
            <input
              id="name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Juan Pérez"
              required
            />
            {getFieldError('name') && (
              <span className="field-error">{getFieldError('name')}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="tu@correo.com"
              required
            />
            {getFieldError('email') && (
              <span className="field-error">{getFieldError('email')}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              required
            />
            {getFieldError('password') && (
              <span className="field-error">{getFieldError('password')}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="role">Tipo de cuenta</label>
            <select id="role" name="role" value={form.role} onChange={handleChange}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrarme'}
          </button>
        </form>

        <p className="auth-link">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
