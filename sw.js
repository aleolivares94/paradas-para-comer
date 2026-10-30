// Solo almacena los archivos de la interfaz. Firebase y los datos se consultan online.
const CACHE = 'paradas-equipo-v3';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./firebase-config.js','./location-utils.mjs','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET' || new URL(event.request.url).origin!==self.location.origin) return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok) { const copy=response.clone(); caches.open(CACHE).then(c=>c.put(event.request,copy)); }
    return response;
  }).catch(()=>caches.match(event.request)));
});
