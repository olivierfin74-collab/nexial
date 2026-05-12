self.addEventListener("push", (event) => {
  let data = { title: "Nexial", body: "Nouvelle alerte", url: "/aujourdhui" };

  try {
    if (event.data) data = event.data.json();
  } catch (_error) {
    data = { title: "Nexial", body: event.data ? event.data.text() : "Nouvelle alerte", url: "/aujourdhui" };
  }

  const priority = data.priority || data.severity;

  event.waitUntil(
    self.registration.showNotification(data.title || "Nexial", {
      body: data.body || "Nouvelle alerte",
      icon: "/icon-192.svg",
      badge: "/badge-72.svg",
      data: { url: data.url || "/aujourdhui" },
      requireInteraction: priority === "CRITICAL",
      tag: data.tag || data.alert_id || "nexial-alert",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : "/aujourdhui";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
      return undefined;
    })
  );
});
