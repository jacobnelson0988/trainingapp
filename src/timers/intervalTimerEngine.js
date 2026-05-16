const clampToPositiveInteger = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export const parseDurationToSeconds = (value) => {
  if (value == null) return null

  if (typeof value === "number") {
    return value > 0 ? Math.round(value) : null
  }

  const normalized = String(value).trim().toLowerCase()
  if (!normalized) return null

  if (/^\d+$/.test(normalized)) {
    return clampToPositiveInteger(normalized)
  }

  if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(normalized)) {
    const parts = normalized.split(":").map((part) => Number.parseInt(part, 10))
    if (parts.some((part) => !Number.isFinite(part))) return null

    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]
    }

    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }

  const hourMatch = normalized.match(/(\d+)\s*(h|tim|timmar?)/)
  const minuteMatch = normalized.match(/(\d+)\s*(m|min|minut|minuter)/)
  const secondMatch = normalized.match(/(\d+)\s*(s|sek|sekund|sekunder)/)

  const hours = hourMatch ? Number.parseInt(hourMatch[1], 10) : 0
  const minutes = minuteMatch ? Number.parseInt(minuteMatch[1], 10) : 0
  const seconds = secondMatch ? Number.parseInt(secondMatch[1], 10) : 0

  const total = hours * 3600 + minutes * 60 + seconds
  return total > 0 ? total : null
}

export const formatSecondsAsClock = (totalSeconds) => {
  const safeSeconds = Math.max(0, Math.round(totalSeconds || 0))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export const buildLegacyIntervalProgram = (config = {}) => {
  const workSeconds = parseDurationToSeconds(config.interval_time)
  const repeats = clampToPositiveInteger(config.intervals_count)
  const countdownSeconds = clampToPositiveInteger(config.countdown_seconds) ?? 5
  const restSeconds = clampToPositiveInteger(config.rest_seconds) ?? 0

  if (!workSeconds || !repeats) return null

  const phases = []

  if (countdownSeconds > 0) {
    phases.push({
      key: "countdown",
      kind: "countdown",
      label: "Nedräkning",
      durationSeconds: countdownSeconds,
      intervalIndex: 0,
      totalIntervals: repeats,
    })
  }

  for (let index = 0; index < repeats; index += 1) {
    phases.push({
      key: `work-${index + 1}`,
      kind: "work",
      label: "Löp",
      durationSeconds: workSeconds,
      intervalIndex: index + 1,
      totalIntervals: repeats,
    })

    if (restSeconds > 0 && index < repeats - 1) {
      phases.push({
        key: `rest-${index + 1}`,
        kind: "rest",
        label: "Vila",
        durationSeconds: restSeconds,
        intervalIndex: index + 1,
        totalIntervals: repeats,
      })
    }
  }

  const totalDurationSeconds = phases.reduce((total, phase) => total + phase.durationSeconds, 0)

  return {
    countdownSeconds,
    workSeconds,
    restSeconds,
    repeats,
    phases,
    totalDurationSeconds,
  }
}

export const createIntervalTimerSession = (program, now = Date.now()) => ({
  program,
  startedAt: now,
  pausedAt: null,
  pausedTotalMs: 0,
  completedAt: null,
  status: "running",
})

export const pauseIntervalTimerSession = (session, now = Date.now()) => {
  if (!session || session.status !== "running") return session

  return {
    ...session,
    pausedAt: now,
    status: "paused",
  }
}

export const resumeIntervalTimerSession = (session, now = Date.now()) => {
  if (!session || session.status !== "paused" || !session.pausedAt) return session

  return {
    ...session,
    pausedTotalMs: session.pausedTotalMs + (now - session.pausedAt),
    pausedAt: null,
    status: "running",
  }
}

export const completeIntervalTimerSession = (session, now = Date.now()) => {
  if (!session || session.status === "complete") return session

  return {
    ...session,
    completedAt: now,
    status: "complete",
  }
}

const getEffectiveNow = (session, now) => {
  if (session.status === "paused" && session.pausedAt) return session.pausedAt
  if (session.status === "complete" && session.completedAt) return session.completedAt
  return now
}

export const getIntervalTimerSnapshot = (session, now = Date.now()) => {
  if (!session?.program) return null

  const totalDurationMs = session.program.totalDurationSeconds * 1000
  const effectiveNow = getEffectiveNow(session, now)
  const elapsedMs = Math.max(0, effectiveNow - session.startedAt - session.pausedTotalMs)
  const cappedElapsedMs = Math.min(elapsedMs, totalDurationMs)
  const remainingMs = Math.max(0, totalDurationMs - cappedElapsedMs)
  const isComplete = cappedElapsedMs >= totalDurationMs

  let traversedMs = 0
  let currentPhase = null
  let currentPhaseIndex = -1

  for (let index = 0; index < session.program.phases.length; index += 1) {
    const phase = session.program.phases[index]
    const phaseDurationMs = phase.durationSeconds * 1000
    const phaseEndsAt = traversedMs + phaseDurationMs

    if (cappedElapsedMs < phaseEndsAt || (isComplete && index === session.program.phases.length - 1)) {
      currentPhase = phase
      currentPhaseIndex = index
      break
    }

    traversedMs = phaseEndsAt
  }

  const currentPhaseElapsedMs = currentPhase ? Math.max(0, cappedElapsedMs - traversedMs) : 0
  const currentPhaseRemainingMs = currentPhase
    ? Math.max(0, currentPhase.durationSeconds * 1000 - currentPhaseElapsedMs)
    : 0
  const nextPhase = currentPhaseIndex >= 0 ? session.program.phases[currentPhaseIndex + 1] || null : null

  return {
    status: session.status,
    isComplete,
    remainingMs,
    totalElapsedMs: cappedElapsedMs,
    totalDurationMs,
    progressRatio: totalDurationMs > 0 ? cappedElapsedMs / totalDurationMs : 0,
    currentPhase,
    currentPhaseIndex,
    currentPhaseElapsedMs,
    currentPhaseRemainingMs,
    nextPhase,
  }
}
