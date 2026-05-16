import { useEffect, useRef, useState } from "react"
import ActiveIntervalWorkout from "./ActiveIntervalWorkout"
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
import { formatSecondsAsClock, parseDurationToSeconds } from "../../running/intervalPrograms"

const workoutShellStyle = {
  display: "grid",
  gap: "18px",
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

const helperTextStyle = {
  fontSize: "14px",
  lineHeight: 1.6,
  fontWeight: 700,
  color: redesignBody,
}

const heroTimerStyle = {
  padding: "24px 22px",
  borderRadius: "28px",
  border: `1px solid rgba(217, 74, 31, 0.2)`,
  background: "linear-gradient(180deg, rgba(20, 18, 14, 0.98) 0%, rgba(40, 24, 14, 0.98) 100%)",
  boxShadow: "0 24px 54px rgba(26, 24, 20, 0.24)",
  display: "grid",
  gap: "12px",
  justifyItems: "center",
  textAlign: "center",
}

const heroTimerLabelStyle = {
  fontFamily: redesignMonoFont,
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "rgba(255, 255, 255, 0.74)",
}

const heroTimerValueStyle = {
  fontFamily: redesignMonoFont,
  fontSize: "clamp(72px, 22vw, 144px)",
  lineHeight: 0.88,
  fontWeight: 700,
  letterSpacing: "-0.06em",
  color: redesignAccent,
}

const statsGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
})

const statCardStyle = {
  padding: "14px 16px",
  borderRadius: "20px",
  border: `1px solid ${redesignLine}`,
  backgroundColor: redesignSurface,
  display: "grid",
  gap: "6px",
}

const statLabelStyle = {
  fontFamily: redesignMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: redesignMuted,
}

const statValueStyle = {
  fontFamily: redesignDisplayFont,
  fontSize: "28px",
  lineHeight: 1,
  fontWeight: 700,
  color: redesignInk,
}

const statHintStyle = {
  fontSize: "13px",
  lineHeight: 1.5,
  fontWeight: 700,
  color: redesignMuted,
}

const actionGridStyle = (isMobile) => ({
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

const infoPanelStyle = {
  padding: "16px 18px",
  borderRadius: "20px",
  border: `1px solid ${redesignLine}`,
  backgroundColor: redesignSurfaceSoft,
  display: "grid",
  gap: "8px",
}

const formatDistanceKm = (distanceKm) => {
  if (!Number.isFinite(distanceKm)) return "0.00"
  return distanceKm.toFixed(2)
}

const formatPaceFromDistance = (elapsedSeconds, distanceKm) => {
  if (!Number.isFinite(elapsedSeconds) || !Number.isFinite(distanceKm) || distanceKm <= 0) return "—"
  const secondsPerKm = elapsedSeconds / distanceKm
  return `${formatSecondsAsClock(secondsPerKm)}/km`
}

const calculateDistanceMeters = (from, to) => {
  if (!from || !to) return 0

  const earthRadiusMeters = 6371000
  const toRadians = (value) => (value * Math.PI) / 180
  const latDelta = toRadians(to.latitude - from.latitude)
  const lonDelta = toRadians(to.longitude - from.longitude)
  const startLat = toRadians(from.latitude)
  const endLat = toRadians(to.latitude)

  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lonDelta / 2) ** 2

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function ActiveDistanceRunningWorkout({
  workout,
  summaryText,
  input,
  onChangeField,
  onTotalTimeChange,
  onStatusChange,
  isMobile,
}) {
  const [elapsedMs, setElapsedMs] = useState(0)
  const [isLocationEnabled] = useState(Boolean(input.location_enabled))
  const [locationStatus, setLocationStatus] = useState("Platsdelning är avstängd")
  const stopwatchStartedAtRef = useRef(Date.now())
  const elapsedOffsetMsRef = useRef(0)
  const watchIdRef = useRef(null)
  const lastPointRef = useRef(null)
  const totalDistanceMetersRef = useRef(
    Number.parseFloat(String(input.running_distance || "").replace(",", ".")) * 1000 || 0
  )

  useEffect(() => {
    const initialElapsedSeconds = parseDurationToSeconds(input.running_time) || 0
    elapsedOffsetMsRef.current = initialElapsedSeconds * 1000
    stopwatchStartedAtRef.current = Date.now()
    setElapsedMs(elapsedOffsetMsRef.current)

    const intervalId = window.setInterval(() => {
      const nextElapsedMs = elapsedOffsetMsRef.current + (Date.now() - stopwatchStartedAtRef.current)
      setElapsedMs(nextElapsedMs)
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const nextElapsedSeconds = Math.round(elapsedMs / 1000)
    onTotalTimeChange?.(formatSecondsAsClock(nextElapsedSeconds))
  }, [elapsedMs, onTotalTimeChange])

  useEffect(() => {
    if (!isLocationEnabled) {
      if (watchIdRef.current != null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      watchIdRef.current = null
      lastPointRef.current = null
      setLocationStatus("Platsdelning är avstängd")
      return
    }

    if (typeof navigator === "undefined" || !navigator.geolocation?.watchPosition) {
        setLocationStatus("Den här enheten stödjer inte platsdelning")
        return
      }

    setLocationStatus("Hämtar position...")

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const currentPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }

        if (lastPointRef.current) {
          const deltaMeters = calculateDistanceMeters(lastPointRef.current, currentPoint)
          const accuracyPenalty = Math.max(lastPointRef.current.accuracy || 0, currentPoint.accuracy || 0)

          if (deltaMeters > 3 && deltaMeters < 1000 && accuracyPenalty < 120) {
            totalDistanceMetersRef.current += deltaMeters
            onChangeField("running_distance", formatDistanceKm(totalDistanceMetersRef.current / 1000))
          }
        }

        lastPointRef.current = currentPoint
        setLocationStatus(`Platsdelning aktiv${position.coords.accuracy ? ` · ±${Math.round(position.coords.accuracy)} m` : ""}`)
      },
      (error) => {
        console.error(error)
        setLocationStatus("Kunde inte hämta plats. Kontrollera GPS och behörighet.")
        onStatusChange?.("Kunde inte starta platsdelning")
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    )

    return () => {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      watchIdRef.current = null
    }
  }, [isLocationEnabled, onChangeField, onStatusChange])

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  const distanceKm =
    Number.parseFloat(String(input.running_distance || "").replace(",", ".")) ||
    totalDistanceMetersRef.current / 1000
  const elapsedSeconds = Math.round(elapsedMs / 1000)
  const currentPace = formatPaceFromDistance(elapsedSeconds, distanceKm)

  return (
    <div style={workoutShellStyle}>
      <div style={{ display: "grid", gap: "8px" }}>
        <div style={workoutKickerStyle}>Aktivt löppass</div>
        <h3 style={workoutTitleStyle}>{workout?.label || "Löppass"}</h3>
        <div style={helperTextStyle}>
          {summaryText || "Klockan är igång direkt. Slå på platsdelning om du vill se hur långt du springer live."}
        </div>
      </div>

      <div style={heroTimerStyle}>
        <div style={heroTimerLabelStyle}>Tid</div>
        <div style={heroTimerValueStyle}>{formatSecondsAsClock(elapsedSeconds)}</div>
        <div style={helperTextStyle}>Klockan går tills du avslutar passet.</div>
      </div>

      <div style={statsGridStyle(isMobile)}>
        <div style={statCardStyle}>
          <div style={statLabelStyle}>Distans</div>
          <div style={statValueStyle}>{`${formatDistanceKm(distanceKm)} km`}</div>
          <div style={statHintStyle}>
            {isLocationEnabled ? "Uppdateras live med platsdelning" : "Slå på platsdelning för att mäta löpningen live"}
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={statLabelStyle}>Tempo</div>
          <div style={statValueStyle}>{currentPace}</div>
          <div style={statHintStyle}>Visas när distans finns.</div>
        </div>

        <div style={statCardStyle}>
          <div style={statLabelStyle}>Plats</div>
          <div style={{ ...statValueStyle, fontSize: "20px", lineHeight: 1.2 }}>
            {isLocationEnabled ? "Delas" : "Av"}
          </div>
          <div style={statHintStyle}>{locationStatus}</div>
        </div>
      </div>

      <div style={actionGridStyle(isMobile)}>
        <div style={infoPanelStyle}>
          <div style={statLabelStyle}>Hur det fungerar</div>
          <div style={helperTextStyle}>
            Klockan startar automatiskt. Platsdelningen följer valet du gjorde innan passet startade.
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ActiveRunningWorkout(props) {
  if (props.workout?.runningType === "intervals") {
    return (
      <ActiveIntervalWorkout
        workoutLabel={props.workout?.label || "Intervallpass"}
        intervalProgram={props.workout?.runningConfig?.intervalProgram}
        onTotalTimeChange={props.onTotalTimeChange}
        onStatusChange={props.onStatusChange}
        isMobile={props.isMobile}
      />
    )
  }

  return <ActiveDistanceRunningWorkout {...props} />
}
