const PREVIEW_HOST_PATTERNS = [/\.vercel\.app$/i]

export const shouldEnablePreviewPwa = () => {
  if (typeof window === "undefined") return false

  const host = window.location.hostname || ""

  if (host === "localhost" || host === "127.0.0.1") return true

  return PREVIEW_HOST_PATTERNS.some((pattern) => pattern.test(host))
}

export const registerPreviewServiceWorker = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null
  if (!shouldEnablePreviewPwa()) return null

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    })
    return registration
  } catch (error) {
    console.error("Kunde inte registrera service worker:", error)
    return null
  }
}
