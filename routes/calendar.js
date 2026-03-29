const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Lead = require('../models/Lead');

// Get calendar events from Google Calendar
router.get('/events', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user?.accessToken) {
      return res.status(401).json({ message: 'נדרש חיבור לגוגל קלנדר' });
    }

    const { timeMin, timeMax } = req.query;
    const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${timeMin || new Date().toISOString()}&` +
      `timeMax=${timeMax || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}&` +
      `singleEvents=true&orderBy=startTime`;

    const response = await fetch(calendarUrl, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });

    if (!response.ok) {
      return res.status(response.status).json({ message: 'שגיאה בגישה לגוגל קלנדר' });
    }

    const data = await response.json();
    res.json(data.items || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Sync lead event to Google Calendar
router.post('/sync/:leadId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user?.accessToken) {
      return res.status(401).json({ message: 'נדרש חיבור לגוגל קלנדר' });
    }

    const lead = await Lead.findById(req.params.leadId);
    if (!lead) return res.status(404).json({ message: 'ליד לא נמצא' });
    if (!lead.eventDate) return res.status(400).json({ message: 'לא הוגדר תאריך אירוע' });

    const colorId = lead.status === 'won' ? '2' : '5'; // Green for won, Yellow for tracking

    const event = {
      summary: lead.title,
      description: `סוג אירוע: ${lead.eventType}\nמיקום: ${lead.location || 'לא צוין'}`,
      start: {
        dateTime: new Date(lead.eventDate).toISOString(),
        timeZone: 'Asia/Jerusalem',
      },
      end: {
        dateTime: new Date(new Date(lead.eventDate).getTime() + 5 * 60 * 60 * 1000).toISOString(),
        timeZone: 'Asia/Jerusalem',
      },
      location: lead.location || '',
      colorId,
    };

    let response;
    if (lead.calendarEventId) {
      // Update existing
      response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${lead.calendarEventId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );
    } else {
      // Create new
      response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );
    }

    if (!response.ok) {
      return res.status(response.status).json({ message: 'שגיאה ביצירת אירוע בקלנדר' });
    }

    const calEvent = await response.json();
    lead.calendarEventId = calEvent.id;
    await lead.save();

    res.json({ message: 'האירוע סונכרן בהצלחה', eventId: calEvent.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
