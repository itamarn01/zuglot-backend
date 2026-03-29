const mongoose = require('mongoose');

const updateSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, default: '' },
  content: { type: String, required: true },
  type: {
    type: String,
    enum: ['note', 'call', 'meeting', 'email', 'status_change', 'system'],
    default: 'note'
  },
}, { timestamps: true });

module.exports = mongoose.model('Update', updateSchema);
