let wakeLockSentinel = null
let audioContext = null

const wait = (durationMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs)
  })

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

const playTone = async ({ frequency, durationMs, type = "square", volume = 0.24 }) => {
  const context = await ensureAudioContext()
  if (!context) return

  const oscillator = context.createOscillator()
  const gainNode = context.createGain()
  const startedAt = context.currentTime
  const durationSeconds = durationMs / 1000

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startedAt)

  gainNode.gain.setValueAtTime(0.0001, startedAt)
  gainNode.gain.exponentialRampToValueAtTime(volume, startedAt + 0.015)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startedAt + durationSeconds)

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)

  oscillator.start(startedAt)
  oscillator.stop(startedAt + durationSeconds + 0.02)

  await wait(durationMs + 24)
}

const playToneSequence = async (tones = []) => {
  for (const tone of tones) {
    if (tone.pauseMs) {
      await wait(tone.pauseMs)
      continue
    }

    await playTone(tone)
  }
}

export const playIntervalSignal = async (kind = "work") => {
  if (kind === "start") {
    await playToneSequence([
      { frequency: 523.25, durationMs: 120, type: "triangle", volume: 0.22 },
      { pauseMs: 40 },
      { frequency: 659.25, durationMs: 140, type: "triangle", volume: 0.24 },
      { pauseMs: 40 },
      { frequency: 783.99, durationMs: 180, type: "triangle", volume: 0.26 },
    ])
  } else if (kind === "pause") {
    await playToneSequence([
      { frequency: 392, durationMs: 140, type: "sawtooth", volume: 0.24 },
      { pauseMs: 40 },
      { frequency: 329.63, durationMs: 180, type: "sawtooth", volume: 0.24 },
    ])
  } else if (kind === "resume") {
    await playToneSequence([
      { frequency: 523.25, durationMs: 120, type: "triangle", volume: 0.22 },
      { pauseMs: 30 },
      { frequency: 659.25, durationMs: 180, type: "triangle", volume: 0.26 },
    ])
  } else if (kind === "rest" || kind === "set_rest") {
    await playToneSequence([
      { frequency: 440, durationMs: 180, type: "square", volume: 0.28 },
      { pauseMs: 60 },
      { frequency: 440, durationMs: 180, type: "square", volume: 0.28 },
      { pauseMs: 40 },
      { frequency: 349.23, durationMs: 220, type: "square", volume: 0.24 },
    ])
  } else if (kind === "finish") {
    await playToneSequence([
      { frequency: 523.25, durationMs: 140, type: "triangle", volume: 0.24 },
      { pauseMs: 35 },
      { frequency: 659.25, durationMs: 150, type: "triangle", volume: 0.24 },
      { pauseMs: 35 },
      { frequency: 783.99, durationMs: 160, type: "triangle", volume: 0.26 },
      { pauseMs: 35 },
      { frequency: 1046.5, durationMs: 240, type: "triangle", volume: 0.28 },
    ])
  } else {
    await playToneSequence([
      { frequency: 659.25, durationMs: 170, type: "square", volume: 0.26 },
      { pauseMs: 35 },
      { frequency: 659.25, durationMs: 170, type: "square", volume: 0.26 },
    ])
  }

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    const pattern =
      kind === "finish"
        ? [120, 60, 140, 60, 180]
        : kind === "rest" || kind === "set_rest"
        ? [120, 50, 120, 50, 120]
        : kind === "pause"
        ? [80, 40, 100]
        : kind === "resume" || kind === "start"
        ? [100, 30, 120]
        : [140, 40, 140]
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
