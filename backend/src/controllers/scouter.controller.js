const scouterService = require('../services/scouter.service');

// GET /api/scouters  (público — para el formulario de registro)
const listActive = async (req, res, next) => {
  try {
    const scouters = await scouterService.listActive();
    res.json(scouters);
  } catch (err) { next(err); }
};

// GET /api/admin/scouters  (admin — ranking completo)
const listAll = async (req, res, next) => {
  try {
    const scouters = await scouterService.listAll();
    res.json(scouters);
  } catch (err) { next(err); }
};

// POST /api/admin/scouters
const create = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'El nombre es obligatorio.' });
    const scouter = await scouterService.create({ name: name.trim(), email, phone });
    res.status(201).json(scouter);
  } catch (err) { next(err); }
};

// PATCH /api/admin/scouters/:id
const update = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const scouter = await scouterService.update(id, req.body);
    res.json(scouter);
  } catch (err) { next(err); }
};

// DELETE /api/admin/scouters/:id
const remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await scouterService.remove(id);
    res.json({ message: 'Scouter eliminado.' });
  } catch (err) { next(err); }
};

module.exports = { listActive, listAll, create, update, remove };
