const express = require('express');
const cors = require('cors');
const line = require('@line/bot-sdk');
const env = require('./config/env');
const lineWebhookController = require('./controllers/lineWebhookController');
const scheduler = require('./jobs/scheduler');
const googleSheetsService = require('./services/googleSheetsService');

const app = express();
app.use(cors());

// Root route for health check (useful for uptime monitoring)
app.get('/', (req, res) => {
  res.send('Medication LINE OA Bot is running!');
});

// Emergency Call Redirect Route (Bypass LINE Manager validation)
app.get('/call-1669', (req, res) => {
  res.redirect('tel:1669');
});

// Dashboard API Routes
app.get('/api/dashboard/stats', async (req, res) => {
  const stats = await googleSheetsService.getDashboardStats();
  res.json(stats);
});

app.get('/api/dashboard/alerts', async (req, res) => {
  const alerts = await googleSheetsService.getAlerts();
  res.json(alerts);
});

// LINE Webhook Route
app.post('/webhook', line.middleware({
  channelAccessToken: env.line.channelAccessToken,
  channelSecret: env.line.channelSecret
}), (req, res) => {
  Promise
    .all(req.body.events.map(lineWebhookController.handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// Start Server
app.listen(env.port, () => {
  console.log(`Server is running on port ${env.port}`);
  
  // Initialize Cron Jobs
  scheduler.initJobs();
});
