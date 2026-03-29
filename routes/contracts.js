const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const Contract = require('../models/Contract');
const Lead = require('../models/Lead');
const Update = require('../models/Update');

// Get all contracts
router.get('/', auth, async (req, res) => {
  try {
    const contracts = await Contract.find()
      .populate('leadId', 'title eventType eventDate')
      .populate('packageId', 'name')
      .sort({ createdAt: -1 });
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get contract by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate('leadId')
      .populate('packageId');
    if (!contract) return res.status(404).json({ message: 'חוזה לא נמצא' });
    res.json(contract);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get contract by public link (no auth) - disabled after signing
router.get('/public/:linkToken', async (req, res) => {
  try {
    const FormConfig = require('../models/FormConfig');
    const contract = await Contract.findOne({ linkToken: req.params.linkToken })
      .populate('leadId', 'title eventType eventDate location')
      .populate('packageId', 'name');
    
    if (!contract) return res.status(404).json({ message: 'חוזה לא נמצא' });
    
    // If already signed, deny access (linkActive===false means explicitly disabled)
    if (contract.status === 'signed' || contract.linkActive === false) {
      return res.status(403).json({ message: 'חוזה זה כבר נחתם ואינו זמין לצפייה' });
    }
    
    // Update status to viewed
    if (contract.status === 'sent') {
      contract.status = 'viewed';
      await contract.save();
    }

    // Get logo from form config
    const config = await FormConfig.findOne({ isActive: true });
    const contractObj = contract.toObject();
    contractObj.logoUrl = config?.logoUrl || '';
    
    res.json(contractObj);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update contract details from public link (before signing only)
router.patch('/public/:linkToken/update-details', async (req, res) => {
  try {
    const contract = await Contract.findOne({ linkToken: req.params.linkToken });
    if (!contract) return res.status(404).json({ message: 'חוזה לא נמצא' });
    if (contract.status === 'signed') return res.status(403).json({ message: 'לא ניתן לערוך חוזה חתום' });

    const allowed = ['eventDate','eventLocation','performanceDuration','ordererName','ordererIdNumber','ordererAddress','ordererPhone','groomName','brideName'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) contract[field] = req.body[field];
    });
    await contract.save();
    res.json({ message: 'פרטים עודכנו בהצלחה' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Create contract
router.post('/', auth, async (req, res) => {
  try {
    const linkToken = uuidv4();
    const contract = await Contract.create({
      ...req.body,
      linkToken,
      linkActive: true,
      createdBy: req.user._id,
    });

    // Link contract to lead
    if (req.body.leadId) {
      await Lead.findByIdAndUpdate(req.body.leadId, { contractId: contract._id });
      
      await Update.create({
        leadId: req.body.leadId,
        userId: req.user._id,
        userName: req.user.name,
        content: 'חוזה חדש נוצר',
        type: 'system',
      });
    }

    const populated = await Contract.findById(contract._id)
      .populate('leadId', 'title eventType eventDate')
      .populate('packageId', 'name');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update contract (draft only edit)
router.put('/:id', auth, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ message: 'חוזה לא נמצא' });
    
    const updated = await Contract.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('leadId')
      .populate('packageId');
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Sign contract (public - no auth)
router.post('/public/:linkToken/sign', async (req, res) => {
  try {
    const contract = await Contract.findOne({ linkToken: req.params.linkToken });
    if (!contract) return res.status(404).json({ message: 'חוזה לא נמצא' });
    
    if (contract.status === 'signed') {
      return res.status(400).json({ message: 'החוזה כבר חתום' });
    }

    contract.signatureUrl = req.body.signatureUrl;
    contract.signerName = req.body.signerName;
    contract.signedAt = new Date();
    contract.status = 'signed';
    contract.linkActive = false; // Disable public access after signing
    
    // Save selected optional products and update totalPrice
    if (req.body.selectedOptionalProducts) {
      const selectedIds = req.body.selectedOptionalProducts;
      contract.products = contract.products.map(p => ({
        ...p.toObject(),
        isSelected: !p.isOptional || selectedIds.includes(p.product?.toString() || p.name),
      }));
      // Recalculate totalPrice
      const optionalTotal = contract.products
        .filter(p => p.isOptional && p.isSelected)
        .reduce((sum, p) => sum + (p.price || 0), 0);
      contract.totalPrice = (contract.basePrice || contract.totalPrice) + optionalTotal - (contract.discount || 0);
    }
    
    await contract.save();

    // Auto-move lead to WIN
    if (contract.leadId) {
      await Lead.findByIdAndUpdate(contract.leadId, { status: 'won' });
      
      await Update.create({
        leadId: contract.leadId,
        content: `חוזה נחתם ע"י ${req.body.signerName}`,
        type: 'status_change',
      });
    }

    res.json({ message: 'החוזה נחתם בהצלחה', contract });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Send contract (change status to sent)
router.patch('/:id/send', auth, async (req, res) => {
  try {
    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      { status: 'sent', linkActive: true },
      { new: true }
    );
    if (!contract) return res.status(404).json({ message: 'חוזה לא נמצא' });
    
    res.json(contract);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete contract
router.delete('/:id', auth, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ message: 'חוזה לא נמצא' });
    
    // Unlink from lead
    if (contract.leadId) {
      await Lead.findByIdAndUpdate(contract.leadId, { $unset: { contractId: 1 } });
    }
    
    await Contract.findByIdAndDelete(req.params.id);
    res.json({ message: 'חוזה נמחק' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
