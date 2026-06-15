/* Sapa V2.3 service worker: persistent Android notifications + FCM background messages. */
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBRDsBH1cVTm7dGwD4EnXarLK5j1DvUYkM',
  authDomain: 'sapa-7edad.firebaseapp.com',
  projectId: 'sapa-7edad',
  storageBucket: 'sapa-7edad.firebasestorage.app',
  messagingSenderId: '244779214180',
  appId: '1:244779214180:web:7afba605067faf55a04671',
  measurementId: 'G-8897FY9CBP'
});

const messaging = firebase.messaging();
const STATIC_CACHE = 'sapa-static-v2-3';
const STATIC_ASSETS = [
  './manifest.webmanifest',
  './sapa-icon-192.png',
  './sapa-icon-512.png',
  './sapa-badge-96.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => null)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function normalizeTarget(data = {}) {
  if (!data.id) return null;
  return {
    kind: data.kind || 'room',
    id: data.id,
    name: data.name || '',
    storage: data.storage || ''
  };
}

function notificationOptions(payload = {}) {
  const data = payload.data || {};
  const notification = payload.notification || {};
  const target = normalizeTarget(data);
  return {
    title: notification.title || data.title || 'Sapa',
    options: {
      body: notification.body || data.body || 'Anda menerima pesan baru.',
      icon: './sapa-icon-192.png',
      badge: './sapa-badge-96.png',
      tag: `${target?.kind || 'sapa'}:${target?.id || data.messageId || 'message'}`,
      renotify: true,
      vibrate: [180, 90, 180],
      timestamp: Date.now(),
      data: { target, url: './' }
    }
  };
}

messaging.onBackgroundMessage((payload) => {
  const { title, options } = notificationOptions(payload);
  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.target || null;
  const baseUrl = new URL(event.notification.data?.url || './', self.registration.scope);
  if (target?.id) {
    baseUrl.searchParams.set('sapaKind', target.kind || 'room');
    baseUrl.searchParams.set('sapaId', target.id);
    if (target.name) baseUrl.searchParams.set('sapaName', target.name);
    if (target.storage) baseUrl.searchParams.set('sapaStorage', target.storage);
  }

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      const clientUrl = new URL(client.url);
      if (clientUrl.origin !== baseUrl.origin) continue;
      await client.focus();
      client.postMessage({ type: 'OPEN_SAPA_TARGET', target });
      return;
    }
    await self.clients.openWindow(baseUrl.href);
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
