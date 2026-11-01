"use strict";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = new URL(event.notification.data?.url || "./index.html", self.registration.scope);
    if (url.origin !== self.location.origin) return;
    const snoozing = event.action === "snooze-10";
    const deadline = Date.now() + 10 * 60_000;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const pagePath = (value) => value.replace(/\/index\.html$/, "/");
    const client = windows.find((item) => {
      const candidate = new URL(item.url);
      return candidate.origin === url.origin && pagePath(candidate.pathname) === pagePath(url.pathname);
    });
    if (client) {
      client.postMessage(snoozing
        ? { type: "activity-snooze", deadline }
        : { type: "activity-open" });
      if (!snoozing) await client.focus();
    } else {
      if (snoozing) url.hash = `snooze=${deadline}`;
      await self.clients.openWindow(url.href);
    }
  })());
});
