import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "../../../../lib/firebase/apiAuth";
import { adminDb } from "../../../../lib/firebase/admin";
import { evaluateTaskReminders } from "../../../../lib/reminders/reminderEngine";
import { sendPushToUser } from "../../../../lib/server/notifications";
import { Task } from "../../../../types/task";
import { UserProfile } from "../../../../types/user";

export async function POST(req: NextRequest) {
  try {
    const user = await verifyApiAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.uid;

    // Fetch user profile
    const userDoc = await adminDb.collection("users").doc(userId).get();
    const userProfile: UserProfile = userDoc.exists
      ? (userDoc.data() as UserProfile)
      : {
          uid: userId,
          email: "",
          displayName: "User",
          timezone: "UTC",
          workHours: { start: "09:00", end: "22:00" },
          preferredFocusBlockMinutes: 45,
          reminderIntensity: "normal",
          productivityStyle: "flexible",
          defaultBufferPercentage: 15,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

    // Fetch tasks
    const tasksSnap = await adminDb.collection("users").doc(userId).collection("tasks").get();
    const tasks: Task[] = tasksSnap.docs.map((doc: any) => ({
      ...doc.data(),
      id: doc.id,
    } as Task));

    // Fetch existing recent notifications to prevent spamming duplicates
    const notifsSnap = await adminDb
      .collection("users")
      .doc(userId)
      .collection("notifications")
      .where("status", "==", "unread")
      .get();

    const existingKeys = new Set<string>();
    notifsSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      if (data && data.taskId && data.type) {
        existingKeys.add(`${data.taskId}_${data.type}`);
      }
    });

    let createdCount = 0;
    let pushSentCount = 0;

    for (const task of tasks) {
      const generatedList = evaluateTaskReminders(userId, task, userProfile);
      for (const reminder of generatedList) {
        const dedupeKey = `${reminder.taskId || "gen"}_${reminder.type}`;
        if (!existingKeys.has(dedupeKey)) {
          // Save in-app reminder
          await adminDb.collection("users").doc(userId).collection("notifications").add({
            ...reminder,
            createdAt: new Date(),
          });
          existingKeys.add(dedupeKey);
          createdCount++;

          // Send push notification if available
          const pushRes = await sendPushToUser(userId, {
            title: reminder.title,
            body: reminder.reason || reminder.message,
            url: reminder.taskId ? `/tasks/${reminder.taskId}` : `/dashboard`,
          });
          if (pushRes.successCount > 0) {
            pushSentCount += pushRes.successCount;
          }
        }
      }
    }

    return NextResponse.json({ success: true, generatedReminders: createdCount, pushNotificationsSent: pushSentCount });
  } catch (error: any) {
    console.error("Error generating reminders:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
