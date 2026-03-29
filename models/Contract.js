const mongoose = require('mongoose');

const contractProductSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true },
  price: { type: Number, default: 0 },
  imageUrl: { type: String, default: '' },
  isOptional: { type: Boolean, default: false },
  isSelected: { type: Boolean, default: true },
});

const contractSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
  packageName: { type: String, default: '' },
  
  // Orderer details
  ordererName: { type: String, default: '' },
  ordererIdNumber: { type: String, default: '' },
  ordererAddress: { type: String, default: '' },
  ordererPhone: { type: String, default: '' },
  
  // Couple details
  groomName: { type: String, default: '' },
  brideName: { type: String, default: '' },
  
  // Event details
  eventDate: { type: Date },
  eventLocation: { type: String, default: '' },
  
  // Products & pricing
  products: [contractProductSchema],
  basePrice: { type: Number, default: 0 },    // package base price
  discount: { type: Number, default: 0 },      // discount amount
  totalPrice: { type: Number, default: 0 },    // final price
  advancePayment: { type: Number, default: 0 },
  
  // Notes
  specialNotes: { type: String, default: '' },
  contractTerms: { type: String, default: '' },
  
  // Signature
  signatureUrl: { type: String, default: '' },
  signedAt: { type: Date },
  signerName: { type: String, default: '' },
  
  // PDF after signing
  pdfUrl: { type: String, default: '' },
  
  // Unique link
  linkToken: { type: String, unique: true, required: true },
  linkActive: { type: Boolean, default: true }, // false after signing
  
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'signed'],
    default: 'draft'
  },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Contract', contractSchema);
