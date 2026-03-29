require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const passport = require('./config/passport');
const cron = require('node-cron');
const Reminder = require('./models/Reminder');
const nodemailer = require('nodemailer');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/updates', require('./routes/updates'));
app.use('/api/products', require('./routes/products'));
app.use('/api/packages', require('./routes/packages'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/handlers', require('./routes/handlers'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/forms', require('./routes/forms'));
app.use('/api/calendar', require('./routes/calendar'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Reminder cron job - check every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const now = new Date();
    const dueReminders = await Reminder.find({
      status: 'pending',
      dueDate: { $lte: now },
    }).populate('leadId', 'title').populate('handlerId', 'name email phone');

    for (const reminder of dueReminders) {
      if (reminder.type === 'email' && reminder.handlerId?.email) {
        try {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.NODEMAILER_EMAIL,
              pass: process.env.NODEMAILER_PASS,
            },
          });

          await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: reminder.handlerId.email,
            subject: `תזכורת: ${reminder.leadId?.title || 'ליד'}`,
            html: `<div dir="rtl"><h2>תזכורת</h2><p>${reminder.message}</p><p>ליד: ${reminder.leadId?.title || ''}</p></div>`,
          });
        } catch (emailErr) {
          console.error('Error sending reminder email:', emailErr);
        }
      }
      
      reminder.status = 'sent';
      await reminder.save();
    }
  } catch (error) {
    console.error('Reminder cron error:', error);
  }
});

// Self-ping to prevent cold starts (every 14 minutes)
// In production, ping the actual Render URL; locally, use localhost
setInterval(() => {
  const host = process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL
    ? process.env.RENDER_EXTERNAL_URL
    : `http://localhost:${process.env.PORT || 5000}`;
  fetch(`${host}/api/health`).catch(() => {});
}, 14 * 60 * 1000);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Kolot CRM Server running on port ${PORT}`);
});
