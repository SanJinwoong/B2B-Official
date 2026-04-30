const prisma = require('../config/prisma');

/**
 * Retorna todos los mensajes del hilo de un cliente.
 * clientId = el dueño del hilo.
 * senderId = quien consulta (puede ser el cliente o el admin).
 */
const getMessages = async (clientId) => {
  return prisma.message.findMany({
    where: { clientId },
    include: {
      sender: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
};

/**
 * Envía un mensaje en el hilo del cliente.
 * Si el emisor es ADMIN, el clientId es el id del cliente al que le escribe.
 */
const sendMessage = async (clientId, senderId, content) => {
  return prisma.message.create({
    data: { clientId, senderId, content },
    include: {
      sender: { select: { id: true, name: true, role: true } },
    },
  });
};

/**
 * Marca todos los mensajes no leídos del cliente como leídos.
 * Se llama cuando el cliente abre el chat.
 */
const markAsRead = async (clientId, readerRole) => {
  if (readerRole === 'CLIENT') {
    // El cliente lee → marca mensajes del admin
    return prisma.message.updateMany({
      where: { clientId, isRead: false, sender: { role: { not: 'CLIENT' } } },
      data: { isRead: true },
    });
  }
};

/**
 * Cuenta mensajes no leídos para el cliente.
 */
const getUnreadCount = async (clientId) => {
  return prisma.message.count({
    where: { clientId, isRead: false, sender: { role: { not: 'CLIENT' } } },
  });
};

module.exports = { getMessages, sendMessage, markAsRead, getUnreadCount };
