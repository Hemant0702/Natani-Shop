import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import configRoutes from './routes/config';
import customerRoutes from './routes/customers';
import khataRoutes from './routes/khata';
import loyaltyRoutes from './routes/loyalty';
import pushRoutes from './routes/push';
import rateLimit from 'express-rate-limit';
import webpush from 'web-push';



dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173'];
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rate limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true }));
app.use('/api/orders', rateLimit({ windowMs: 60 * 1000, max: 20 }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/config', configRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/khata', khataRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/push', pushRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

webpush.setVapidDetails(
  process.env.VAPID_CONTACT_EMAIL || 'mailto:hemantnatani2002@gmail.com',
  process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

// In-memory store (replace with Supabase table for persistence)
const subscriptions: webpush.PushSubscription[] = [];

// Subscribe endpoint
app.post('/api/push/subscribe', (req, res) => {
  const sub = req.body as webpush.PushSubscription;
  const exists = subscriptions.some(s => s.endpoint === sub.endpoint);
  if (!exists) subscriptions.push(sub);
  res.status(201).json({ success: true });
});

// Send notification helper
export async function sendPushToAll(title: string, body: string, url = '/') {
  const payload = JSON.stringify({ title, body, url });
  await Promise.allSettled(
    subscriptions.map(sub => webpush.sendNotification(sub, payload))
  );
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});