const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const FormConfig = require('../models/FormConfig');
const Lead = require('../models/Lead');
const Update = require('../models/Update');

// Get active form config (public)
router.get('/config', async (req, res) => {
  try {
    let config = await FormConfig.findOne({ isActive: true });
    if (!config) {
      // Create default config
      config = await FormConfig.create({
        title: 'טופס פנייה - להקת קולות',
        subtitle: 'נשמח לשמוע מכם!',
        fields: [
          { name: 'fullName', label: 'שם מלא', type: 'text', required: true, order: 1 },
          { name: 'phone', label: 'טלפון', type: 'phone', required: true, order: 2 },
          { name: 'email', label: 'אימייל', type: 'email', required: false, order: 3 },
          { name: 'eventType', label: 'סוג אירוע', type: 'select', options: ['חתונה', 'בר מצווה', 'בת מצווה', 'אירוע', 'אחר'], required: true, order: 4 },
          { name: 'eventDate', label: 'תאריך אירוע', type: 'date', required: false, order: 5 },
          { name: 'location', label: 'מיקום אירוע', type: 'text', required: false, order: 6 },
          { name: 'howHeardAboutUs', label: 'איך שמעתם עלינו?', type: 'select', options: ['אינסטגרם', 'יוטיוב', 'פייסבוק', 'המלצה', 'גוגל', 'אחר'], required: false, order: 7 },
          { name: 'referredBy', label: 'מי המליץ?', type: 'text', required: false, order: 8 },
          { name: 'message', label: 'הודעה', type: 'textarea', required: false, order: 9 },
        ],
      });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update form config (admin)
router.put('/config', auth, async (req, res) => {
  try {
    let config = await FormConfig.findOne({ isActive: true });
    if (config) {
      Object.assign(config, req.body);
      await config.save();
    } else {
      config = await FormConfig.create(req.body);
    }
    res.json(config);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Submit form (public)
router.post('/submit', async (req, res) => {
  try {
    const { fullName, phone, email, eventType, eventDate, location, howHeardAboutUs, referredBy, message, relationship } = req.body;

    const lead = await Lead.create({
      title: `${eventType || 'פנייה'} - ${fullName}`,
      eventType: eventType || 'אחר',
      contacts: [{
        fullName: fullName || '',
        phone: phone || '',
        email: email || '',
        relationship: relationship || 'אחר',
      }],
      eventDate: eventDate || null,
      location: location || '',
      howHeardAboutUs: howHeardAboutUs || '',
      referredBy: referredBy || '',
      eventDetails: message || '',
      source: 'form',
      status: 'tracking',
    });

    await Update.create({
      leadId: lead._id,
      content: 'ליד חדש מטופס אינטרנטי',
      type: 'system',
    });

    // Fire WordPress webhook if configured
    try {
      const config = await FormConfig.findOne({ isActive: true });
      if (config && config.webhookUrl) {
        const webhookPayload = {
          event: 'new_lead',
          lead_id: lead._id.toString(),
          full_name: fullName || '',
          phone: phone || '',
          email: email || '',
          event_type: eventType || '',
          event_date: eventDate || '',
          location: location || '',
          how_heard: howHeardAboutUs || '',
          referred_by: referredBy || '',
          message: message || '',
          submitted_at: new Date().toISOString(),
        };

        fetch(config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        }).catch(err => console.error('Webhook error:', err.message));
      }
    } catch (whErr) {
      console.error('Webhook config error:', whErr.message);
    }

    res.status(201).json({ message: 'הטופס נשלח בהצלחה! נחזור אליכם בהקדם.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ── Band Signatures (admin) ──

// Add a signature
router.post('/config/band-signatures', auth, async (req, res) => {
  try {
    const config = await FormConfig.findOne({ isActive: true });
    if (!config) return res.status(404).json({ message: 'config not found' });
    config.bandSignatures.push(req.body);
    await config.save();
    res.json(config.bandSignatures);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// Update a signature
router.put('/config/band-signatures/:sigId', auth, async (req, res) => {
  try {
    const config = await FormConfig.findOne({ isActive: true });
    const sig = config.bandSignatures.id(req.params.sigId);
    if (!sig) return res.status(404).json({ message: 'signature not found' });
    Object.assign(sig, req.body);
    await config.save();
    res.json(config.bandSignatures);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// Delete a signature
router.delete('/config/band-signatures/:sigId', auth, async (req, res) => {
  try {
    const config = await FormConfig.findOne({ isActive: true });
    config.bandSignatures.pull({ _id: req.params.sigId });
    await config.save();
    res.json(config.bandSignatures);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

module.exports = router;
