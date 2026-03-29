const mongoose = require('mongoose');

const packageProductSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  customPrice: { type: Number },
  isOptional: { type: Boolean, default: false }, // true = not included, customer chooses
});

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  products: [packageProductSchema],
  basePrice: { type: Number, default: 0 }, // price without optionals
  totalPrice: { type: Number, default: 0 }, // price with all included products
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Package', packageSchema);
