/* 临时：卸载 Service Worker，避免开发阶段缓存旧页面 */
self.registration.unregister();
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
