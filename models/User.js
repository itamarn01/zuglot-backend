const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['admin', 'user'], default: 'admin' },
  accessToken: { type: String },
  refreshToken: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
