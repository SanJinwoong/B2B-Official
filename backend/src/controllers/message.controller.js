const messageService = require('../services/message.service');

const getMessages = async (req, res, next) => {
  try {
    // CLIENT ve su propio hilo; ADMIN pasa ?clientId=X
    const clientId = req.user.role === 'CLIENT'
      ? req.user.id
      : Number(req.query.clientId);
    if (!clientId) return res.status(400).json({ message: 'clientId requerido.' });
    const msgs = await messageService.getMessages(clientId);
    // Marcar como leídos
    await messageService.markAsRead(clientId, req.user.role);
    res.json(msgs);
  } catch (e) { next(e); }
};

const sendMessage = async (req, res, next) => {
  try {
    const clientId = req.user.role === 'CLIENT'
      ? req.user.id
      : Number(req.body.clientId);
    if (!clientId) return res.status(400).json({ message: 'clientId requerido.' });
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'El mensaje no puede estar vacío.' });
    const msg = await messageService.sendMessage(clientId, req.user.id, content.trim());
    res.status(201).json(msg);
  } catch (e) { next(e); }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await messageService.getUnreadCount(req.user.id);
    res.json({ unread: count });
  } catch (e) { next(e); }
};

module.exports = { getMessages, sendMessage, getUnreadCount };
