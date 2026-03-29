const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  relationship: {
    type: String,
    enum: ['חתן', 'כלה', 'אבא חתן', 'אבא כלה', 'אמא חתן', 'אמא כלה', 'מפיק', 'חבר', 'אח/אחות', 'אחר'],
    default: 'אחר'
  },
});

const leadSchema = new mongoose.Schema({
  title: { type: String, required: true },
  eventType: {
    type: String,
    enum: ['חתונה', 'בר מצווה', 'בת מצווה', 'אירוע', 'אחר'],
    required: true
  },
  contacts: [contactSchema],
  eventDate: { type: Date },
  location: { type: String, default: '' },
  eventDetails: { type: String, default: '' },
  howHeardAboutUs: { type: String, default: '' },
  referredBy: { type: String, default: '' },
  handler: { type: mongoose.Schema.Types.ObjectId, ref: 'Handler' },
  proposedPrice: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['tracking', 'won', 'lost'],
    default: 'tracking'
  },
  lostReason: { type: String, default: '' },
  source: {
    type: String,
    enum: ['manual', 'form'],
    default: 'manual'
  },
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
  calendarEventId: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
