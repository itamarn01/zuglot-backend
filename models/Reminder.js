const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  handlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Handler' },
  message: { type: String, required: true },
  dueDate: { type: Date, required: true },
  type: {
    type: String,
    enum: ['notification', 'email', 'whatsapp'],
    default: 'notification'
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'completed'],
    default: 'pending'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Reminder', reminderSchema);
