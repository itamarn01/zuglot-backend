const mongoose = require('mongoose');

const formFieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ['text', 'email', 'phone', 'select', 'date', 'textarea'],
    default: 'text'
  },
  options: [String],
  required: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
});

const formConfigSchema = new mongoose.Schema({
  title: { type: String, default: 'טופס פנייה - להקת קולות' },
  subtitle: { type: String, default: 'נשמח לשמוע מכם!' },
  headerImage: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  backgroundColor: { type: String, default: '#0a0a0a' },
  accentColor: { type: String, default: '#EAB21B' },
  fields: [formFieldSchema],
  isActive: { type: Boolean, default: true },
  thankYouMessage: { type: String, default: 'תודה! נחזור אליכם בהקדם.' },
  bandSignatures: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    name: { type: String, required: true },
    role: { type: String, default: '' },
    signatureUrl: { type: String, required: true },
  }],
}, { timestamps: true });

module.exports = mongoose.model('FormConfig', formConfigSchema);
