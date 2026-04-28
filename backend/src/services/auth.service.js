const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const prisma = require('../config/prisma');

const SALT_ROUNDS = 10;

/**
 * Genera un token JWT firmado con el id y rol del usuario.
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Registra un nuevo usuario en la base de datos.
 * Correos repetidos permitidos (entorno de desarrollo/pruebas).
 */
const register = async ({ name, email, password, role, phone }) => {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, role, phone: phone || null },
    select: { id: true, name: true, email: true, role: true, phone: true,
              profileCompleted: true, createdAt: true },
  });

  const token = generateToken(user);
  return { user, token };
};

/**
 * Valida credenciales y retorna el usuario con su token.
 * Incluye mustChangePassword para que el frontend pueda redirigir al cambio.
 */
const login = async ({ email, password }) => {
  // findFirst porque el email ya no es único — toma la cuenta más reciente con ese correo
  const user = await prisma.user.findFirst({
    where:   { email },
    orderBy: { id: 'desc' },
    select: {
      id: true, name: true, email: true,
      role: true, password: true, isActive: true,
      mustChangePassword: true,
      phone: true, profileCompleted: true,
    },
  });

  if (!user) {
    const error = new Error('Credenciales inválidas.');
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const error = new Error('Credenciales inválidas.');
    error.statusCode = 401;
    throw error;
  }

  const { password: _, ...userWithoutPassword } = user;
  const token = generateToken(user);
  return { user: userWithoutPassword, token };
};

/**
 * Cambia la contraseña del usuario autenticado.
 * Requiere verificar la contraseña actual antes de actualizar.
 *
 * @param {number} userId           - ID del usuario autenticado
 * @param {string} currentPassword  - Contraseña actual (texto plano)
 * @param {string} newPassword      - Nueva contraseña (texto plano)
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true },
  });

  if (!user) {
    const error = new Error('Usuario no encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    const error = new Error('La contraseña actual es incorrecta.');
    error.statusCode = 400;
    throw error;
  }

  const hashedNew = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password:          hashedNew,
      mustChangePassword: false,  // Se desactiva la obligación tras el cambio
    },
  });

  return { message: 'Contraseña actualizada correctamente.' };
};

module.exports = { register, login, changePassword };
