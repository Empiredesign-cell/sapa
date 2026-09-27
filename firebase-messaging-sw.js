/* Sapa V5.0 — PWA shell + Firebase Cloud Messaging service worker */
const SAPA_CACHE = 'sapa-v5.0-shell-1';
const SAPA_SHELL = [
  './', './manifest.webmanifest', './sapa-icon-192.png', './sapa-icon-512.png',
  './sapa-icon-maskable-512.png', './sapa-apple-touch-180.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SAPA_CACHE);
    await Promise.allSettled(SAPA_SHELL.map((url) => cache.add(url)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('sapa-') && n !== SAPA_CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

const SAPA_MUTED_CACHE_KEY = './__sapa_muted_v5__';
async function saveMutedChatsV5(list) {
  const cache = await caches.open(SAPA_CACHE);
  await cache.put(SAPA_MUTED_CACHE_KEY, new Response(JSON.stringify(Array.isArray(list) ? list : []), {headers:{'content-type':'application/json'}}));
}
async function getMutedChatsV5() {
  try { const res = await caches.match(SAPA_MUTED_CACHE_KEY); return res ? await res.json() : []; } catch (_) { return []; }
}
async function isTargetMutedV5(target) {
  if (!target?.id) return false;
  const list = await getMutedChatsV5();
  const now = Date.now();
  return list.some((x) => x?.id === target.id && (!x.kind || x.kind === target.kind) && (Number(x.until) === -1 || Number(x.until) > now));
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SAPA_SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'SAPA_SYNC_MUTED_V5') event.waitUntil(saveMutedChatsV5(event.data.muted || []));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(SAPA_CACHE);
        cache.put('./', fresh.clone()).catch(() => {});
        return fresh;
      } catch (_) {
        return (await caches.match(req)) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
    const networkPromise = fetch(req).then(async (fresh) => {
      if (fresh?.ok) {
        const cache = await caches.open(SAPA_CACHE);
        cache.put(req, fresh.clone()).catch(() => {});
      }
      return fresh;
    }).catch(() => null);
    return cached || (await networkPromise) || Response.error();
  })());
});

// Firebase Messaging stays only for push notifications. Firestore remains app database.
try {
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
  messaging.onBackgroundMessage(async (payload) => {
    const data = payload?.data || {};
    const notification = payload?.notification || {};
    const title = notification.title || data.title || 'Sapa';
    const body = notification.body || data.body || 'Pesan baru';
    const target = data.id ? { kind:data.kind || 'room', id:data.id, name:data.name || '', storage:data.storage || '' } : null;
    if (await isTargetMutedV5(target)) return;
    self.registration.showNotification(title, {
      body,
      icon: './sapa-icon-192.png',
      badge: './sapa-icon-192.png',
      tag: data.id ? `sapa-${data.kind || 'room'}-${data.id}` : 'sapa-message',
      renotify: true,
      vibrate: [180, 90, 180],
      actions: [{ action:'open', title:'Buka Sapa' }],
      data: { target, url: './' }
    });
  });
} catch (error) {
  console.warn('Sapa FCM SW init skipped:', error);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const payload = event.notification.data || {};
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type:'window', includeUncontrolled:true });
    const client = all.find((c) => 'focus' in c);
    if (client) {
      await client.focus();
      if (payload.target) client.postMessage({ type:'SAPA_NOTIFICATION_CLICK', target:payload.target });
      return;
    }
    const t = payload.target;
    const url = t?.id ? `./?sapaKind=${encodeURIComponent(t.kind||'room')}&sapaId=${encodeURIComponent(t.id)}&sapaName=${encodeURIComponent(t.name||'')}&sapaStorage=${encodeURIComponent(t.storage||'')}` : './';
    await clients.openWindow(url);
  })());
});
