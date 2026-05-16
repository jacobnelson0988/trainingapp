import { buildIntervalProgram, formatSecondsAsClock } from "../running/intervalPrograms"

export { formatSecondsAsClock }

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
