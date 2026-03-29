const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Lead = require('../models/Lead');
const Update = require('../models/Update');

// Get all leads with filters + pagination
router.get('/', auth, async (req, res) => {
  try {
    const { status, eventType, handler, search, sortBy, sortOrder, sort, dir, page, limit } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (eventType) filter.eventType = eventType;
    if (handler) filter.handler = handler;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'contacts.fullName': { $regex: search, $options: 'i' } },
        { 'contacts.phone': { $regex: search, $options: 'i' } },
      ];
    }

    const sortField = sort || sortBy || 'createdAt';
    const sortDirection = dir === 'asc' || sortOrder === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortDirection };

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 1000;
    const skip = (pageNum - 1) * limitNum;

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('handler', 'name phone email')
        .populate('contractId')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      Lead.countDocuments(filter)
    ]);
    
    // Return paginated response if page/limit provided
    if (page || limit) {
      res.json({ leads, total, page: pageNum, limit: limitNum });
    } else {
      res.json(leads);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Get single lead
router.get('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('handler', 'name phone email')
      .populate('contractId');
    
    if (!lead) return res.status(404).json({ message: 'ליד לא נמצא' });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create lead
router.post('/', auth, async (req, res) => {
  try {
    const lead = await Lead.create({ ...req.body, createdBy: req.user._id });
    
    // Create system update
    await Update.create({
      leadId: lead._id,
      userId: req.user._id,
      userName: req.user.name,
      content: 'ליד חדש נוצר',
      type: 'system',
    });

    const populated = await Lead.findById(lead._id).populate('handler', 'name phone email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update lead
router.put('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'ליד לא נמצא' });

    // Track status changes
    if (req.body.status && req.body.status !== lead.status) {
      const statusMap = { tracking: 'מעקב', won: 'WIN', lost: 'LOST' };
      await Update.create({
        leadId: lead._id,
        userId: req.user._id,
        userName: req.user.name,
        content: `סטטוס שונה ל${statusMap[req.body.status]}${req.body.status === 'lost' && req.body.lostReason ? ` - סיבה: ${req.body.lostReason}` : ''}`,
        type: 'status_change',
      });
    }

    const updated = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('handler', 'name phone email')
      .populate('contractId');
    
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete lead
router.delete('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: 'ליד לא נמצא' });
    
    // Clean up related data
    await Update.deleteMany({ leadId: req.params.id });
    
    res.json({ message: 'ליד נמחק בהצלחה' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update lead status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, lostReason } = req.body;
    
    if (status === 'lost' && !lostReason) {
      return res.status(400).json({ message: 'נדרשת סיבה להעברה לLOST' });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'ליד לא נמצא' });

    lead.status = status;
    if (lostReason) lead.lostReason = lostReason;
    await lead.save();

    const statusMap = { tracking: 'מעקב', won: 'WIN', lost: 'LOST' };
    await Update.create({
      leadId: lead._id,
      userId: req.user._id,
      userName: req.user.name,
      content: `סטטוס שונה ל${statusMap[status]}${lostReason ? ` - סיבה: ${lostReason}` : ''}`,
      type: 'status_change',
    });

    const populated = await Lead.findById(lead._id)
      .populate('handler', 'name phone email')
      .populate('contractId');
    
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
