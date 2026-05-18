import { useEffect, useMemo, useRef, useState } from "react"
import {
  redesignAccent,
  redesignBody,
  redesignDisplayFont,
  redesignInk,
  redesignLine,
  redesignMonoFont,
  redesignMuted,
  redesignPaper,
  redesignSurface,
  redesignSurfaceSoft,
} from "../../ui/redesignTokens"
import {
  clearIntervalMediaSession,
  playIntervalSignal,
  releaseScreenWakeLock,
  requestScreenWakeLock,
  syncIntervalMediaSession,
} from "../../app/device/intervalDevice"
import {
  completeIntervalTimerSession,
  createIntervalTimerSession,
  formatSecondsAsClock,
  getIntervalTimerSnapshot,
  pauseIntervalTimerSession,
  resumeIntervalTimerSession,
} from "../../timers/intervalTimerEngine"
import { buildIntervalProgram, getIntervalProgramSummary } from "../../running/intervalPrograms"

const workoutShellStyle = {
  display: "grid",
  gap: "18px",
}

const workoutMetaStyle = {
  display: "grid",
  gap: "6px",
}

const workoutKickerStyle = {
  fontFamily: redesignMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: redesignMuted,
}

const workoutTitleStyle = {
  margin: 0,
  fontFamily: redesignDisplayFont,
  fontSize: "clamp(34px, 8vw, 48px)",
  lineHeight: 0.94,
  fontWeight: 700,
  letterSpacing: "-0.04em",
  color: redesignInk,
}

const workoutSummaryStyle = {
  fontSize: "15px",
  lineHeight: 1.5,
  fontWeight: 700,
  color: redesignBody,
}

const intervalSetupGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const fieldShellStyle = {
  display: "grid",
  gap: "8px",
}

const fieldLabelStyle = {
  fontFamily: redesignMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: redesignMuted,
}

const fieldInputStyle = {
  width: "100%",
  minHeight: "60px",
  padding: "14px 16px",
  borderRadius: "18px",
  border: `1px solid ${redesignLine}`,
  backgroundColor: redesignSurfaceSoft,
  boxSizing: "border-box",
  fontFamily: redesignDisplayFont,
  fontSize: "18px",
  lineHeight: 1.2,
  fontWeight: 700,
  color: redesignInk,
}

const timerCardStyle = (isExpanded = false) => ({
  minHeight: isExpanded ? "320px" : "auto",
  padding: isExpanded ? "24px 22px" : "18px 18px",
  borderRadius: "28px",
  border: `1px solid rgba(217, 74, 31, ${isExpanded ? 0.36 : 0.18})`,
  background: isExpanded
    ? "linear-gradient(180deg, rgba(20, 18, 14, 0.98) 0%, rgba(40, 24, 14, 0.98) 100%)"
    : redesignSurface,
  boxShadow: isExpanded ? "0 24px 54px rgba(26, 24, 20, 0.24)" : "none",
  display: "grid",
  gap: isExpanded ? "14px" : "10px",
  alignContent: isExpanded ? "center" : "start",
  justifyItems: isExpanded ? "center" : "stretch",
  textAlign: isExpanded ? "center" : "left",
})

const timerPhaseLabelStyle = (isExpanded = false) => ({
  fontFamily: redesignMonoFont,
  fontSize: isExpanded ? "12px" : "10px",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: isExpanded ? "rgba(255, 255, 255, 0.74)" : redesignMuted,
})

const timerValueStyle = (isExpanded = false) => ({
  fontFamily: redesignMonoFont,
  fontSize: isExpanded ? "clamp(76px, 22vw, 144px)" : "clamp(34px, 9vw, 52px)",
  lineHeight: 0.88,
  fontWeight: 700,
  letterSpacing: "-0.06em",
  color: isExpanded ? redesignAccent : redesignInk,
})

const timerMetaGridStyle = (isMobile) => ({
  width: "100%",
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
})

const timerMetaCellStyle = (isExpanded = false) => ({
  padding: "12px 14px",
  borderRadius: "18px",
  border: `1px solid ${isExpanded ? "rgba(255,255,255,0.08)" : redesignLine}`,
  backgroundColor: isExpanded ? "rgba(255,255,255,0.05)" : redesignSurfaceSoft,
  display: "grid",
  gap: "4px",
})

const timerMetaLabelStyle = {
  fontFamily: redesignMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: redesignMuted,
}

const timerMetaValueStyle = (isExpanded = false) => ({
  fontSize: "15px",
  lineHeight: 1.3,
  fontWeight: 800,
  color: isExpanded ? redesignPaper : redesignInk,
})

const timerHintStyle = (isExpanded = false) => ({
  fontSize: "14px",
  lineHeight: 1.5,
  fontWeight: 700,
  color: isExpanded ? "rgba(255, 255, 255, 0.78)" : redesignBody,
})

const timerProgressTrackStyle = (isExpanded = false) => ({
  width: "100%",
  height: isExpanded ? "12px" : "8px",
  borderRadius: "999px",
  backgroundColor: isExpanded ? "rgba(255, 255, 255, 0.1)" : "rgba(26, 24, 20, 0.1)",
  overflow: "hidden",
})

const timerProgressFillStyle = (ratio) => ({
  width: `${Math.max(0, Math.min(1, ratio || 0)) * 100}%`,
  height: "100%",
  borderRadius: "999px",
  background: "linear-gradient(90deg, #d94a1f 0%, #f17f45 100%)",
  transition: "width 240ms linear",
})

const controlsGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const primaryButtonStyle = {
  width: "100%",
  minHeight: "56px",
  padding: "16px 18px",
  borderRadius: "20px",
  border: `1px solid ${redesignAccent}`,
  backgroundColor: redesignAccent,
  color: redesignPaper,
  cursor: "pointer",
  fontFamily: redesignDisplayFont,
  fontSize: "16px",
  fontWeight: 700,
}

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  border: `1px solid ${redesignLine}`,
  backgroundColor: "rgba(255,255,255,0.34)",
  color: redesignInk,
}

const inlineHintStyle = {
  fontSize: "13px",
  lineHeight: 1.5,
  fontWeight: 700,
  color: redesignMuted,
}

const getPhaseDisplayLabel = (snapshot) => snapshot?.currentPhase?.label || "Klar"

export default function ActiveIntervalWorkout({
  workoutLabel,
  intervalProgram,
  onTotalTimeChange,
  onStatusChange,
  isMobile,
}) {
  const [timerSession, setTimerSession] = useState(null)
  const [now, setNow] = useState(Date.now())
  const lastSignalKeyRef = useRef(null)
  const completionHandledRef = useRef(false)

  const resolvedProgram = useMemo(
    () => buildIntervalProgram(intervalProgram),
    [intervalProgram]
  )

  const snapshot = useMemo(
    () => (timerSession ? getIntervalTimerSnapshot(timerSession, now) : null),
    [timerSession, now]
  )

  useEffect(() => {
    setTimerSession(null)
    setNow(Date.now())
    completionHandledRef.current = false
    lastSignalKeyRef.current = null
  }, [workoutLabel])

  useEffect(() => {
    if (!timerSession || timerSession.status !== "running") return

    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 250)

    return () => window.clearInterval(intervalId)
  }, [timerSession?.status, timerSession?.startedAt, timerSession?.pausedAt])

  useEffect(() => {
    if (!timerSession || timerSession.status !== "running") {
      releaseScreenWakeLock()
      return
    }

    requestScreenWakeLock()

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestScreenWakeLock()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      releaseScreenWakeLock()
    }
  }, [timerSession?.status])

  useEffect(() => {
    const phaseLabel = getPhaseDisplayLabel(snapshot)
    syncIntervalMediaSession({
      title: workoutLabel || "Intervallpass",
      artist: snapshot?.currentPhase?.intervalIndex
        ? `Intervall ${snapshot.currentPhase.intervalIndex} av ${snapshot.currentPhase.totalIntervals}`
        : "Löppass",
      phaseLabel,
      playbackState:
        timerSession?.status === "running"
          ? "playing"
          : timerSession?.status === "paused"
          ? "paused"
          : "none",
    })

    return () => {
      clearIntervalMediaSession()
    }
  }, [snapshot, timerSession?.status, workoutLabel])

  useEffect(() => {
    if (!snapshot || !timerSession) return

    const nextSignalKey = snapshot.isComplete
      ? "finish"
      : snapshot.currentPhase
      ? `${snapshot.currentPhase.key}:${timerSession.status}`
      : null

    if (!nextSignalKey || nextSignalKey === lastSignalKeyRef.current) return

    lastSignalKeyRef.current = nextSignalKey

    if (snapshot.isComplete) {
      playIntervalSignal("finish")
      return
    }

    if (timerSession.status === "running") {
      if (snapshot.currentPhase.kind === "rest" || snapshot.currentPhase.kind === "set_rest") {
        playIntervalSignal(snapshot.currentPhase.kind)
      } else if (snapshot.currentPhase.kind === "work") {
        playIntervalSignal("work")
      }
    }
  }, [snapshot, timerSession])

  useEffect(() => {
    if (!snapshot) return

    const totalSeconds = Math.round((snapshot.totalElapsedMs || 0) / 1000)
    onTotalTimeChange?.(formatSecondsAsClock(totalSeconds))
  }, [snapshot?.totalElapsedMs, onTotalTimeChange])

  useEffect(() => {
    if (!snapshot?.isComplete || !timerSession || completionHandledRef.current) return

    completionHandledRef.current = true
    setTimerSession((prev) => (prev ? completeIntervalTimerSession(prev, Date.now()) : prev))
    onStatusChange?.("Intervallpass klart ✅")
  }, [snapshot?.isComplete, timerSession, onStatusChange])

  const startTimer = async () => {
    if (!resolvedProgram) {
      onStatusChange?.("Välj ett giltigt intervallupplägg")
      return
    }

    completionHandledRef.current = false
    const createdSession = createIntervalTimerSession(resolvedProgram, Date.now())
    setTimerSession(createdSession)
    setNow(Date.now())
    playIntervalSignal("start")
    onStatusChange?.("Intervalltimer startad")
  }

  const pauseTimer = () => {
    setTimerSession((prev) => pauseIntervalTimerSession(prev, Date.now()))
    playIntervalSignal("pause")
    onStatusChange?.("Intervalltimer pausad")
  }

  const resumeTimer = async () => {
    setTimerSession((prev) => resumeIntervalTimerSession(prev, Date.now()))
    setNow(Date.now())
    playIntervalSignal("resume")
    onStatusChange?.("Intervalltimer återupptagen")
  }

  const isRunning = timerSession?.status === "running"
  const isPaused = timerSession?.status === "paused"
  const isComplete = timerSession?.status === "complete" || snapshot?.isComplete
  const showExpandedTimer = isRunning || isPaused || isComplete
  const currentPhase = snapshot?.currentPhase
  const nextPhaseLabel = snapshot?.nextPhase?.label || "Klar"
  const selectedIntervalSummary = resolvedProgram
    ? getIntervalProgramSummary(resolvedProgram)
    : "Välj giltigt intervallupplägg"

  return (
    <div style={workoutShellStyle}>
      <div style={workoutMetaStyle}>
        <div style={workoutKickerStyle}>Aktivt löppass</div>
        <h3 style={workoutTitleStyle}>{workoutLabel || "Intervallpass"}</h3>
        <div style={workoutSummaryStyle}>{selectedIntervalSummary}</div>
      </div>

      {!showExpandedTimer ? (
        <>
          <div style={timerCardStyle(false)}>
              <div style={timerPhaseLabelStyle(false)}>Valt upplägg</div>
              <div style={timerValueStyle(false)}>
              {resolvedProgram ? formatSecondsAsClock(resolvedProgram.totalDurationSeconds) : "00:00"}
              </div>
              <div style={timerMetaGridStyle(isMobile)}>
                <div style={timerMetaCellStyle(false)}>
                  <div style={timerMetaLabelStyle}>Start</div>
                  <div style={timerMetaValueStyle(false)}>
                  {resolvedProgram?.countdownSeconds ? `${resolvedProgram.countdownSeconds} sek` : "Direkt"}
                  </div>
                </div>
                <div style={timerMetaCellStyle(false)}>
                  <div style={timerMetaLabelStyle}>Intervaller</div>
                  <div style={timerMetaValueStyle(false)}>
                  {resolvedProgram ? `${resolvedProgram.totalIntervals} st` : "—"}
                  </div>
                </div>
                <div style={timerMetaCellStyle(false)}>
                <div style={timerMetaLabelStyle}>Block</div>
                <div style={timerMetaValueStyle(false)}>{resolvedProgram ? `${resolvedProgram.blocks.length} st` : "—"}</div>
                </div>
              </div>
            <div style={timerHintStyle(false)}>
              Timern följer det färdiga upplägget och räknar sedan ner i ett enda stort läge.
            </div>
          </div>

          <button type="button" onClick={startTimer} style={primaryButtonStyle}>
            Starta intervalltimer
          </button>
        </>
      ) : (
        <>
          <div style={timerCardStyle(true)}>
            <div style={timerPhaseLabelStyle(true)}>
              {isComplete ? "Pass klart" : currentPhase?.label || "Paus"}
            </div>
            <div style={timerValueStyle(true)}>
              {formatSecondsAsClock(
                Math.round((currentPhase ? snapshot.currentPhaseRemainingMs : snapshot?.remainingMs || 0) / 1000)
              )}
            </div>
            <div style={timerProgressTrackStyle(true)}>
              <div style={timerProgressFillStyle(snapshot?.progressRatio || 0)} />
            </div>
            <div style={timerMetaGridStyle(isMobile)}>
              <div style={timerMetaCellStyle(true)}>
                <div style={timerMetaLabelStyle}>Fas</div>
                <div style={timerMetaValueStyle(true)}>
                  {isComplete ? "Avslutat" : currentPhase?.label || "Paus"}
                </div>
              </div>
              <div style={timerMetaCellStyle(true)}>
                <div style={timerMetaLabelStyle}>Intervall</div>
                <div style={timerMetaValueStyle(true)}>
                  {currentPhase?.intervalIndex
                    ? `${currentPhase.intervalIndex} / ${currentPhase.totalIntervals}`
                    : "0 / 0"}
                </div>
              </div>
              <div style={timerMetaCellStyle(true)}>
                <div style={timerMetaLabelStyle}>Nästa</div>
                <div style={timerMetaValueStyle(true)}>{isComplete ? "Spara pass" : nextPhaseLabel}</div>
              </div>
            </div>
            <div style={timerHintStyle(true)}>
              {isComplete
                ? "Timern är klar. Du kan lägga till kommentar och avsluta passet nedan."
                : isPaused
                ? "Timern är pausad. Återuppta när du är redo."
                : "Timern håller skärmen vaken och fortsätter följa absoluta tidsstämplar."}
            </div>
          </div>

          {!isComplete ? (
            <div style={controlsGridStyle(isMobile)}>
              {isRunning ? (
                <button type="button" onClick={pauseTimer} style={secondaryButtonStyle}>
                  Pausa
                </button>
              ) : (
                <button type="button" onClick={resumeTimer} style={primaryButtonStyle}>
                  Återuppta
                </button>
              )}
              <div style={inlineHintStyle}>
                {isRunning
                  ? "Timern räknar ner i realtid."
                  : "Passet är pausat men tiden ligger kvar exakt där du stoppade."}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
