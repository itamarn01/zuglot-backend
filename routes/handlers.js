const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Handler = require('../models/Handler');

// Get all handlers
router.get('/', auth, async (req, res) => {
  try {
    const handlers = await Handler.find({ isActive: true }).sort({ name: 1 });
    res.json(handlers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create handler
router.post('/', auth, async (req, res) => {
  try {
    // If setting as default, unset others
    if (req.body.isDefault) {
      await Handler.updateMany({}, { isDefault: false });
    }
    const handler = await Handler.create(req.body);
    res.status(201).json(handler);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update handler
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.body.isDefault) {
      await Handler.updateMany({}, { isDefault: false });
    }
    const handler = await Handler.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!handler) return res.status(404).json({ message: 'מטפל לא נמצא' });
    res.json(handler);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete handler (soft)
router.delete('/:id', auth, async (req, res) => {
  try {
    await Handler.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'מטפל הוסר' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
