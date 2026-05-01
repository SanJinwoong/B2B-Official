const authService = require('../services/auth.service');

/**
 * POST /api/auth/register
 * Cuerpo: { name, email, password, role? }
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone,
            referredBy, scouterId, scouterRating, scouterComment } = req.body;
    const result = await authService.register({
      name, email, password, role, phone,
      referredBy, scouterId, scouterRating, scouterComment,
    });
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

/**
 * PATCH /api/auth/change-password
 * Requiere autenticación. Cuerpo: { currentPassword, newPassword, confirmPassword }
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: { message: 'Todos los campos son obligatorios.' } });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: { message: 'La nueva contraseña debe tener al menos 8 caracteres.' } });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: { message: 'La nueva contraseña y la confirmación no coinciden.' } });
    }

    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, changePassword };
