const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Reminder = require('../models/Reminder');

// Get reminders (optionally filter by lead)
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.leadId) filter.leadId = req.query.leadId;
    if (req.query.status) filter.status = req.query.status;
    
    const reminders = await Reminder.find(filter)
      .populate('leadId', 'title')
      .populate('handlerId', 'name email phone')
      .sort({ dueDate: 1 });
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create reminder
router.post('/', auth, async (req, res) => {
  try {
    const reminder = await Reminder.create({
      ...req.body,
      createdBy: req.user._id,
    });
    const populated = await Reminder.findById(reminder._id)
      .populate('leadId', 'title')
      .populate('handlerId', 'name email phone');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update reminder
router.put('/:id', auth, async (req, res) => {
  try {
    const reminder = await Reminder.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('leadId', 'title')
      .populate('handlerId', 'name email phone');
    if (!reminder) return res.status(404).json({ message: 'תזכורת לא נמצאה' });
    res.json(reminder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete reminder
router.delete('/:id', auth, async (req, res) => {
  try {
    await Reminder.findByIdAndDelete(req.params.id);
    res.json({ message: 'תזכורת נמחקה' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark reminder as completed
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    const reminder = await Reminder.findByIdAndUpdate(
      req.params.id,
      { status: 'completed' },
      { new: true }
    );
    res.json(reminder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
