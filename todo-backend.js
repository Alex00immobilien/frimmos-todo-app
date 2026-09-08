import express from 'express';
import { google } from 'googleapis';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
const tokenStore = {};

app.get('/auth/url', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: ['https://www.googleapis.com/auth/calendar'] });
  res.json({ authUrl });
});

app.post('/auth/callback', async (req, res) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.body.code);
    oauth2Client.setCredentials(tokens);
    tokenStore.accessToken = tokens.access_token;
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/sync/create-event', async (req, res) => {
  if (!tokenStore.accessToken) return res.status(401).json({ error: 'Not authenticated' });
  oauth2Client.setCredentials({ access_token: tokenStore.accessToken });
  try {
    const { todo } = req.body;
    const event = {
      summary: todo.text,
      start: { dateTime: new Date().toISOString(), timeZone: 'Europe/Berlin' },
      end: { dateTime: new Date(Date.now() + 3600000).toISOString(), timeZone: 'Europe/Berlin' }
    };
    const r = await calendar.events.insert({ calendarId: 'primary', resource: event });
    res.json({ success: true, eventId: r.data.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(process.env.PORT || 3001, () => console.log('Todo Backend running'));