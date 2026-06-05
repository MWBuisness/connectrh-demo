const CACHE_NAME = 'connectrh-v1'
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/conges',
  '/temps',
  '/documents',
  '/profil',
  '/manifest.json',
]

// Installation — mise en cache des assets statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activation — suppression des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch — Network first, cache fallback
self.addEventListener('fetch', (event) => {
  // Ne pas intercepter les requêtes non-GET ou les API Supabase
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.hostname.includes('supabase.co')) return
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre en cache les réponses HTML pour fallback offline
        if (response.ok && event.request.headers.get('accept')?.includes('text/html')) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// Notifications push
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'ConnectRH', {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag ?? 'connectrh',
      data: { url: data.url ?? '/dashboard' },
    })
  )
})

// Clic sur notification → ouvrir l'app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data?.url ?? '/dashboard')
  )
})
