/**
 * user-profile.service.js
 * Lógica de negocio para edición de perfil personal (nombre, teléfono, avatar).
 */
const prisma  = require('../config/prisma');
const bcrypt  = require('bcryptjs');

const SALT_ROUNDS = 10;

const SELECT_PUBLIC = {
  id: true, name: true, email: true, role: true,
  phone: true, avatar: true, profileCompleted: true,
  createdAt: true,
};

/** Retorna los datos públicos del usuario autenticado. */
const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: SELECT_PUBLIC,
  });
  if (!user) {
    const err = new Error('Usuario no encontrado.');
    err.statusCode = 404;
    throw err;
  }
  return user;
};

/**
 * Actualiza nombre, teléfono y/o avatar.
 * No toca email ni rol.
 */
const updateMe = async (userId, { name, phone, avatar }) => {
  const data = {};
  if (name   !== undefined) data.name   = name.trim();
  if (phone  !== undefined) data.phone  = phone?.trim() || null;
  if (avatar !== undefined) data.avatar = avatar || null;

  const user = await prisma.user.update({
    where:  { id: userId },
    data,
    select: SELECT_PUBLIC,
  });
  return user;
};

/**
 * Cambia la contraseña del usuario validando la actual.
 */
const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Object.assign(new Error('Usuario no encontrado.'), { statusCode: 404 });

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) throw Object.assign(new Error('La contraseña actual es incorrecta.'), { statusCode: 400 });

  const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
};

module.exports = { getMe, updateMe, changePassword };
