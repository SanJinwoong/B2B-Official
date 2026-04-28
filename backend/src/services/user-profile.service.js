/**
 * user-profile.service.js
 *
 * Lógica de negocio para edición de perfil personal (nombre, teléfono, bio).
 * Expone el perfil propio y permite actualizarlo sin credenciales especiales.
 */
const prisma  = require('../config/prisma');
const bcrypt  = require('bcryptjs');

const SALT_ROUNDS = 10;

const SELECT_PUBLIC = {
  id: true, name: true, email: true, role: true,
  phone: true, bio: true, profileCompleted: true,
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
 * Actualiza nombre y/o teléfono.
 * No toca email ni rol.
 */
const updateMe = async (userId, { name, phone }) => {
  const data = {};
  if (name  !== undefined) data.name  = name.trim();
  if (phone !== undefined) data.phone = phone?.trim() || null;

  const user = await prisma.user.update({
    where:  { id: userId },
    data,
    select: SELECT_PUBLIC,
  });
  return user;
};

module.exports = { getMe, updateMe };
