/**
 * user-profile.controller.js
 */
const userProfileService = require('../services/user-profile.service');
const authService        = require('../services/auth.service');

/** GET /api/me — devuelve datos del usuario actual */
const getMe = async (req, res, next) => {
  try {
    const user = await userProfileService.getMe(req.user.id);
    res.status(200).json({ data: user });
  } catch (err) { next(err); }
};

/** PATCH /api/me — actualiza nombre y/o teléfono */
const updateMe = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const user = await userProfileService.updateMe(req.user.id, { name, phone });
    res.status(200).json({ message: 'Perfil actualizado.', data: user });
  } catch (err) { next(err); }
};

/** PATCH /api/me/password — cambia contraseña (reutiliza authService.changePassword) */
const changeMyPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: { message: 'Todos los campos son obligatorios.' } });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: { message: 'La nueva contraseña debe tener al menos 6 caracteres.' } });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: { message: 'Las contraseñas no coinciden.' } });
    }
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.status(200).json(result);
  } catch (err) { next(err); }
};

module.exports = { getMe, updateMe, changeMyPassword };
