const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Lead = require('../models/Lead');
const Contract = require('../models/Contract');

// Get dashboard statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.createdAt = { $gte: new Date(startDate) };
    if (endDate) dateFilter.createdAt = { ...dateFilter.createdAt, $lte: new Date(endDate) };

    // Total counts
    const totalLeads = await Lead.countDocuments(dateFilter);
    const trackingLeads = await Lead.countDocuments({ ...dateFilter, status: 'tracking' });
    const wonLeads = await Lead.countDocuments({ ...dateFilter, status: 'won' });
    const lostLeads = await Lead.countDocuments({ ...dateFilter, status: 'lost' });

    // Conversion rate
    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0;

    // Revenue from won leads
    const wonLeadsData = await Lead.find({ ...dateFilter, status: 'won' });
    const totalRevenue = wonLeadsData.reduce((sum, lead) => sum + (lead.proposedPrice || 0), 0);

    // Monthly breakdown
    const monthlyData = await Lead.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' },
          },
          total: { $sum: 1 },
          won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
          revenue: {
            $sum: { $cond: [{ $eq: ['$status', 'won'] }, '$proposedPrice', 0] }
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Handler performance
    const handlerStats = await Lead.aggregate([
      { $match: { ...dateFilter, handler: { $exists: true } } },
      {
        $group: {
          _id: '$handler',
          total: { $sum: 1 },
          won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
          revenue: {
            $sum: { $cond: [{ $eq: ['$status', 'won'] }, '$proposedPrice', 0] }
          },
        },
      },
      {
        $lookup: {
          from: 'handlers',
          localField: '_id',
          foreignField: '_id',
          as: 'handler',
        },
      },
      { $unwind: '$handler' },
      {
        $project: {
          handlerName: '$handler.name',
          total: 1,
          won: 1,
          lost: 1,
          revenue: 1,
          conversionRate: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$won', '$total'] }, 100] },
              0,
            ],
          },
        },
      },
    ]);

    // Event type distribution
    const eventTypes = await Lead.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
        },
      },
    ]);

    // Source distribution
    const sources = await Lead.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$howHeardAboutUs',
          count: { $sum: 1 },
        },
      },
    ]);

    // Lost reasons
    const lostReasons = await Lead.aggregate([
      { $match: { ...dateFilter, status: 'lost', lostReason: { $ne: '' } } },
      {
        $group: {
          _id: '$lostReason',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Signed contracts count
    const signedContracts = await Contract.countDocuments({ status: 'signed' });

    res.json({
      totalLeads,
      trackingLeads,
      wonLeads,
      lostLeads,
      conversionRate,
      totalRevenue,
      monthlyData,
      handlerStats,
      eventTypes,
      sources,
      lostReasons,
      signedContracts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
