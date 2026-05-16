const APP_CACHE = "trainingapp-design-shell-v1"
const RUNTIME_CACHE = "trainingapp-design-runtime-v1"
const APP_SHELL_URLS = ["/", "/index.html", "/manifest.webmanifest", "/favicon.svg", "/pwa-icon.svg"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== APP_CACHE && key !== RUNTIME_CACHE) {
            return caches.delete(key)
          }
          return null
        })
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone))
          return response
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request)
          return cachedResponse || caches.match("/index.html")
        })
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse

      return fetch(request).then((response) => {
        const responseClone = response.clone()
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone))
        return response
      })
    })
  )
})
