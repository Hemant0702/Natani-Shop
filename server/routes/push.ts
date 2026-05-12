import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import webpush from 'web-push';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:contact@apnidukan.com',
  process.env.VITE_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

const router = Router();

// Save subscription
router.post('/subscribe', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    // Since we need to store subscriptions, but we can't easily run SQL without MCP,
    // and to avoid breaking existing users table structure, we will store it in a 
    // separate table 'push_subscriptions' which the user must create.
    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_id: req.user?.id,
        subscription: subscription,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      // For development, if table doesn't exist, we will gracefully fail 
      // so it doesn't break the app, but log it.
      console.error('Error saving subscription. Did you create the push_subscriptions table?', error.message);
      return res.status(500).json({ error: 'Database error. See backend logs.' });
    }

    res.status(201).json({});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const sendPushNotification = async (userId: string, payload: any) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) return;

    for (const sub of data) {
      try {
        await webpush.sendNotification(sub.subscription, JSON.stringify(payload));
      } catch (err: any) {
        if (err.statusCode === 410) {
          // Subscription expired or unsubscribed, optionally delete from DB
        }
        console.error('Error sending push notification', err);
      }
    }
  } catch (err) {
    console.error('Failed to process push notification sending', err);
  }
};

export const broadcastToAdmins = async (payload: any) => {
  try {
    const { data: admins } = await supabaseAdmin
      .from('users')
      .select('uid')
      .eq('role', 'admin');

    if (admins) {
      for (const admin of admins) {
        await sendPushNotification(admin.uid, payload);
      }
    }
  } catch (err) {
    console.error('Error broadcasting to admins', err);
  }
};

export default router;
