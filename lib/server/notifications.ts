import { adminDb, adminMessaging } from '../firebase/admin';

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToUser(userId: string, payload: PushNotificationPayload): Promise<{ successCount: number; failureCount: number }> {
  try {
    const devicesSnap = await adminDb.collection('users').doc(userId).collection('devices').get();
    if (devicesSnap.empty) {
      return { successCount: 0, failureCount: 0 };
    }

    const tokens: { docId: string; token: string }[] = [];
    devicesSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data && data.fcmToken) {
        tokens.push({ docId: doc.id, token: data.fcmToken });
      }
    });

    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    let successCount = 0;
    let failureCount = 0;

    for (const item of tokens) {
      try {
        await adminMessaging.send({
          token: item.token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          webpush: {
            fcmOptions: {
              link: payload.url || '/',
            },
          },
        });
        successCount++;
      } catch (err: any) {
        console.warn(`Failed to send push to token ${item.docId}:`, err?.message || err);
        failureCount++;
        // If token is unregistered or invalid, delete it
        if (
          err?.code === 'messaging/invalid-registration-token' ||
          err?.code === 'messaging/registration-token-not-registered'
        ) {
          try {
            await adminDb.collection('users').doc(userId).collection('devices').doc(item.docId).delete();
          } catch (delErr) {
            console.error('Failed to cleanup expired FCM token:', delErr);
          }
        }
      }
    }

    return { successCount, failureCount };
  } catch (error) {
    console.error('Error in sendPushToUser:', error);
    return { successCount: 0, failureCount: 1 };
  }
}
