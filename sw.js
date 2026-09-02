// نسخه‌ی کش — هر بار که فایل‌ها را عوض کردی این عدد را یکی زیاد کن
// تا مرورگر/تلویزیون کش قدیمی را دور بریزد و نسخه‌ی جدید را دانلود کند.
const CACHE_VERSION = 'jarvis-v1';

// فایل‌های اصلی رابط کاربری که باید همیشه در دسترس باشند (حتی بدون اینترنت)
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// هنگام نصب: فایل‌های اصلی را دانلود و در کش ذخیره کن
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// هنگام فعال‌سازی: کش‌های نسخه‌ی قدیمی را پاک کن
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// استراتژی دریافت فایل‌ها:
// - برای فایل‌های اصلی برنامه (هم‌مبدأ): اول کش، بعد شبکه (کار می‌کند حتی بدون اینترنت)
// - برای فونت‌ها و فایل‌های خارجی: تلاش برای شبکه، اگر نبود از کش (اگر قبلاً کش شده باشد)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (req.mode === 'navigate') {
    // بازکردن خود صفحه: اول کش (index.html) تا روی تلویزیون بدون اینترنت هم فوری بالا بیاید
    event.respondWith(
      caches.match('./index.html').then((cached) => cached || fetch(req))
    );
    return;
  }

  if (isSameOrigin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          return res;
        });
      })
    );
  } else {
    // منابع خارجی (مثل فونت گوگل): سعی کن از اینترنت بگیری و در کش هم ذخیره کن
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});
