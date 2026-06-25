importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Initialize Firebase app in service worker using URL search params or defaults
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

try {
  const urlParams = new URLSearchParams(self.location.search);
  const apiKey = urlParams.get("apiKey") || "AIzaSyAFut0usQSBPDiha5Q5mbYxj9uA_nHgXo8";
  const projectId = urlParams.get("projectId") || "effortless-brace-0v7sv";
  const messagingSenderId = urlParams.get("messagingSenderId") || "176890705972";
  const appId = urlParams.get("appId") || "1:176890705972:web:ac5be780c0fd13c5727261";

  firebase.initializeApp({
    apiKey: apiKey,
    projectId: projectId,
    messagingSenderId: messagingSenderId,
    appId: appId,
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage(function (payload) {
    console.log("[firebase-messaging-sw.js] Received background message ", payload);
    const notificationTitle = payload.notification?.title || "Deadline Defender";
    const notificationOptions = {
      body: payload.notification?.body || "You have a new update.",
      icon: "/favicon.ico",
      data: payload.data || { url: payload.fcmOptions?.link || "/dashboard" },
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.warn("Service worker setup note:", err);
}
