const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Update = require('../models/Update');

// Get updates for a lead
router.get('/lead/:leadId', auth, async (req, res) => {
  try {
    const updates = await Update.find({ leadId: req.params.leadId })
      .sort({ createdAt: -1 });
    res.json(updates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create update
router.post('/', auth, async (req, res) => {
  try {
    const update = await Update.create({
      ...req.body,
      userId: req.user._id,
      userName: req.user.name,
    });
    res.status(201).json(update);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete update
router.delete('/:id', auth, async (req, res) => {
  try {
    await Update.findByIdAndDelete(req.params.id);
    res.json({ message: 'עדכון נמחק' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
