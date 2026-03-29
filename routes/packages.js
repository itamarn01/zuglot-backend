const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Package = require('../models/Package');

// Get all packages
router.get('/', auth, async (req, res) => {
  try {
    const packages = await Package.find()
      .populate('products.product')
      .sort({ createdAt: 1 });
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single package
router.get('/:id', auth, async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id).populate('products.product');
    if (!pkg) return res.status(404).json({ message: 'חבילה לא נמצאה' });
    res.json(pkg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create package
router.post('/', auth, async (req, res) => {
  try {
    const pkg = await Package.create(req.body);
    const populated = await Package.findById(pkg._id).populate('products.product');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update package
router.put('/:id', auth, async (req, res) => {
  try {
    const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('products.product');
    if (!pkg) return res.status(404).json({ message: 'חבילה לא נמצאה' });
    res.json(pkg);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete package
router.delete('/:id', auth, async (req, res) => {
  try {
    await Package.findByIdAndDelete(req.params.id);
    res.json({ message: 'חבילה נמחקה' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
