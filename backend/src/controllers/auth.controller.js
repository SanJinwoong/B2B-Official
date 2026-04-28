const authService = require('../services/auth.service');

/**
 * POST /api/auth/register
 * Cuerpo: { name, email, password, role? }
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const result = await authService.register({ name, email, password, role });
    res.status(201).json({
      message: 'Usuario registrado exitosamente.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Cuerpo: { email, password }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.status(200).json({
      message: 'Inicio de sesión exitoso.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login };
