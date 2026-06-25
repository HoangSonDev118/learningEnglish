self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Nhac on tap", body: event.data.text() };
  }

  const title = payload.title || "Nhac on tap";
  const body = payload.body || "Ban co the mo app de tiep tuc hoc.";
  const url = payload.url || "/review";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/logo.png",
      badge: "/logo.png",
      data: { url },
      tag: "due-review-reminder",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/review";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
