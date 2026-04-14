const offlineHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dotly.one offline</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        font-family: Arial, sans-serif;
        color: #0f172a;
        background:
          radial-gradient(circle at top, rgba(56, 189, 248, 0.18), transparent 28%),
          linear-gradient(180deg, #f6faff 0%, #eef4fb 100%);
      }
      main {
        width: min(100%, 480px);
        padding: 32px;
        border: 1px solid rgba(255, 255, 255, 0.75);
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.88);
        box-shadow: 0 28px 80px -42px rgba(15, 23, 42, 0.35);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 1.75rem;
        line-height: 1.1;
      }
      p {
        margin: 0;
        color: #475569;
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>You're offline</h1>
      <p>Dotly.one couldn't reach the network. Reconnect and reload to keep working with your live data.</p>
    </main>
  </body>
</html>`

const serviceWorkerSource = `
const CACHE_VERSION = 'dotly-pwa-v2'
const ASSET_CACHE = CACHE_VERSION + '-assets'
const PAGE_CACHE = CACHE_VERSION + '-pages'
const OFFLINE_URL = '/offline'
const PRECACHE_PAGES = ${JSON.stringify(['/', '/pricing', '/offline'])}

function buildOfflineResponse() {
  return new Response(${JSON.stringify(offlineHtml)}, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    status: 200,
  })
}

function isCacheableAsset(request, url) {
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return false
  }

  if (url.pathname === '/service-worker.js' || url.pathname.startsWith('/api/')) {
    return false
  }

  if (url.pathname.startsWith('/_next/static/')) {
    return true
  }

  return ['style', 'script', 'worker', 'font', 'image'].includes(request.destination)
}

function isPrecachedPage(url) {
  return url.origin === self.location.origin && PRECACHE_PAGES.includes(url.pathname)
}

async function precachePages() {
  const cache = await caches.open(PAGE_CACHE)

  await Promise.all(
    PRECACHE_PAGES.map(async (pathname) => {
      try {
        await cache.add(new Request(pathname, { cache: 'reload' }))
      } catch {
      }
    }),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(Promise.all([caches.open(ASSET_CACHE), precachePages()]))
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url)

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok && isPrecachedPage(requestUrl)) {
            const cache = await caches.open(PAGE_CACHE)
            await cache.put(event.request, response.clone())
          }
          return response
        })
        .catch(async () => {
          const pageCache = await caches.open(PAGE_CACHE)
          const cachedPage = await pageCache.match(event.request, { ignoreSearch: true })
          if (cachedPage) {
            return cachedPage
          }

          const offlinePage = await pageCache.match(OFFLINE_URL)
          return offlinePage || buildOfflineResponse()
        }),
    )
    return
  }

  if (!isCacheableAsset(event.request, requestUrl)) {
    return
  }

  event.respondWith(
    caches.open(ASSET_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request)
      const networkPromise = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            cache.put(event.request, response.clone())
          }
          return response
        })
        .catch(() => cached)

      return cached || networkPromise
    }),
  )
})
`

export async function GET(): Promise<Response> {
  return new Response(serviceWorkerSource.trim(), {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/',
    },
  })
}