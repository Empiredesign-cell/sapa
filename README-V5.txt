SAPA V5.0 — Messenger + PWA
============================

Deploy semua file di folder ini ke root website yang sama:
- index.html
- manifest.webmanifest
- firebase-messaging-sw.js
- semua icon PNG

WAJIB:
1. Website harus HTTPS agar PWA/service worker berfungsi penuh.
2. firebase-messaging-sw.js harus berada di root yang sama dengan index.html.
3. Jika sebelumnya pernah install Sapa, lakukan hard refresh / tutup-buka PWA agar cache V5 menggantikan V4.1.
4. Untuk background push FCM penuh, isi meta sapa-fcm-vapid-key pada index.html dengan Web Push certificate public key dari Firebase Console > Project Settings > Cloud Messaging.
5. Backend/server pengirim FCM tetap diperlukan agar pesan baru menghasilkan push ketika aplikasi tertutup.

Fitur utama V5:
- ✓ sent / ✓✓ delivered / ✓✓ read (delivered saat client penerima menerima message listener; read hanya saat app terlihat)
- unread counter grup + direct chat + app badge
- offline text queue + auto retry saat online
- mute 8 jam / 1 minggu / selamanya, termasuk sinkron ke service worker untuk background notification
- shared Media / File / Link panel
- disappearing message 24 jam / 7 hari / 90 hari
- multi-pin sampai 5 pesan per grup
- polling + ubah vote
- @mention autocomplete dalam grup
- forward ke banyak chat sekaligus
- share contact card
- QR/deep-link profil username
- PWA Share Target (share teks/link dari aplikasi lain ke Sapa)
- PWA shortcuts dan install flow Android/iOS

CATATAN ARSITEKTUR:
Media tetap Firestore-inline sesuai keputusan project. Pesan sementara pada V5 disembunyikan client-side setelah expiresAtMs; untuk penghapusan permanen database yang benar sebaiknya nanti ditambah backend cleanup/Cloud Function atau Firestore TTL dengan field timestamp khusus.
