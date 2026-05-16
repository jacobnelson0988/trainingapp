let wakeLockSentinel = null
let audioContext = null

const ensureAudioContext = async () => {
  if (typeof window === "undefined") return null

  const AudioCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioCtor) return null

  if (!audioContext) {
    audioContext = new AudioCtor()
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume()
  }

  return audioContext
}

const playTone = async ({ frequency, durationMs }) => {
  const context = await ensureAudioContext()
  if (!context) return

  const oscillator = context.createOscillator()
  const gainNode = context.createGain()
  const startedAt = context.currentTime
  const durationSeconds = durationMs / 1000

  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(frequency, startedAt)

  gainNode.gain.setValueAtTime(0.0001, startedAt)
  gainNode.gain.exponentialRampToValueAtTime(0.18, startedAt + 0.02)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startedAt + durationSeconds)

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)

  oscillator.start(startedAt)
  oscillator.stop(startedAt + durationSeconds + 0.02)
}

export const playIntervalSignal = async (kind = "work") => {
  if (kind === "rest") {
    await playTone({ frequency: 440, durationMs: 160 })
    await playTone({ frequency: 392, durationMs: 180 })
  } else if (kind === "finish") {
    await playTone({ frequency: 523.25, durationMs: 180 })
    await playTone({ frequency: 659.25, durationMs: 220 })
    await playTone({ frequency: 783.99, durationMs: 280 })
  } else {
    await playTone({ frequency: 659.25, durationMs: 220 })
  }

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    const pattern =
      kind === "finish" ? [120, 80, 160, 80, 200] : kind === "rest" ? [90, 60, 110] : [140]
    navigator.vibrate(pattern)
  }
}

export const requestScreenWakeLock = async () => {
  if (typeof navigator === "undefined" || !navigator.wakeLock?.request) return null

  try {
    wakeLockSentinel = await navigator.wakeLock.request("screen")
    wakeLockSentinel.addEventListener("release", () => {
      if (wakeLockSentinel?.released) {
        wakeLockSentinel = null
      }
    })
    return wakeLockSentinel
  } catch (error) {
    console.error("Kunde inte aktivera Wake Lock:", error)
    return null
  }
}

export const releaseScreenWakeLock = async () => {
  if (!wakeLockSentinel) return

  try {
    await wakeLockSentinel.release()
  } catch (error) {
    console.error("Kunde inte släppa Wake Lock:", error)
  } finally {
    wakeLockSentinel = null
  }
}

export const syncIntervalMediaSession = ({ title, artist, phaseLabel, playbackState }) => {
  if (
    typeof navigator === "undefined" ||
    !("mediaSession" in navigator) ||
    typeof window === "undefined" ||
    typeof window.MediaMetadata !== "function"
  ) {
    return
  }

  navigator.mediaSession.metadata = new window.MediaMetadata({
    title,
    artist,
    album: phaseLabel,
  })
  navigator.mediaSession.playbackState = playbackState
}

export const clearIntervalMediaSession = () => {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return

  navigator.mediaSession.metadata = null
  navigator.mediaSession.playbackState = "none"
}
