import { useEffect, useRef, useState } from "react"
import ActiveIntervalWorkout from "./ActiveIntervalWorkout"
import {
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
import { getCategoryAccent } from "../../ui/playerTrainingThemes"
import { formatSecondsAsClock, parseDurationToSeconds } from "../../running/intervalPrograms"

const runningAccent = getCategoryAccent("running")
const runningAccentTint = (opacity = 0.18) => `rgba(232, 122, 28, ${opacity})`

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
  border: `1px solid ${runningAccentTint(0.24)}`,
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
  color: runningAccent,
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
  border: `1px solid ${runningAccent}`,
  backgroundColor: runningAccent,
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

const getLocationErrorMessage = (error) => {
  if (error?.code === 1) return "Platsdelning nekades. Slå på platsåtkomst i webbläsaren och försök igen."
  if (error?.code === 2) return "Kunde inte hitta positionen just nu. Kontrollera GPS och täckning."
  if (error?.code === 3) return "GPS:en svarade inte i tid. Försök igen utomhus eller med bättre täckning."
  return "Kunde inte hämta plats. Kontrollera GPS och behörighet."
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
  const onChangeFieldRef = useRef(onChangeField)
  const onTotalTimeChangeRef = useRef(onTotalTimeChange)
  const onStatusChangeRef = useRef(onStatusChange)
  const stopwatchStartedAtRef = useRef(Date.now())
  const elapsedOffsetMsRef = useRef(0)
  const watchIdRef = useRef(null)
  const lastPointRef = useRef(null)
  const totalDistanceMetersRef = useRef(
    Number.parseFloat(String(input.running_distance || "").replace(",", ".")) * 1000 || 0
  )

  const clearLocationWatch = () => {
    const geolocation =
      typeof navigator !== "undefined" && navigator.geolocation ? navigator.geolocation : null

    if (watchIdRef.current != null && geolocation?.clearWatch) {
      geolocation.clearWatch(watchIdRef.current)
    }

    watchIdRef.current = null
  }

  useEffect(() => {
    onChangeFieldRef.current = onChangeField
  }, [onChangeField])

  useEffect(() => {
    onTotalTimeChangeRef.current = onTotalTimeChange
  }, [onTotalTimeChange])

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
  }, [onStatusChange])

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
    onTotalTimeChangeRef.current?.(formatSecondsAsClock(nextElapsedSeconds))
  }, [elapsedMs])

  useEffect(() => {
    let isActive = true
    const setSafeLocationStatus = (message) => {
      if (isActive) setLocationStatus(message)
    }

    if (!isLocationEnabled) {
      clearLocationWatch()
      lastPointRef.current = null
      setLocationStatus("Platsdelning är avstängd")
      return () => {
        isActive = false
      }
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setLocationStatus("Platsdelning kräver en säker anslutning")
      onStatusChangeRef.current?.("Platsdelning kräver en säker anslutning")
      return () => {
        isActive = false
      }
    }

    if (typeof navigator === "undefined" || !navigator.geolocation?.watchPosition) {
      setLocationStatus("Den här enheten stödjer inte platsdelning")
      return () => {
        isActive = false
      }
    }

    setSafeLocationStatus("Hämtar position...")

    try {
      clearLocationWatch()
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          if (!isActive) return
          if (
            !Number.isFinite(position?.coords?.latitude) ||
            !Number.isFinite(position?.coords?.longitude)
          ) {
            setSafeLocationStatus("GPS skickade ingen giltig position ännu")
            return
          }

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
              onChangeFieldRef.current?.(
                "running_distance",
                formatDistanceKm(totalDistanceMetersRef.current / 1000)
              )
            }
          }

          lastPointRef.current = currentPoint
          setSafeLocationStatus(
            `Platsdelning aktiv${position.coords.accuracy ? ` · ±${Math.round(position.coords.accuracy)} m` : ""}`
          )
        },
        (error) => {
          console.error(error)
          const message = getLocationErrorMessage(error)
          setSafeLocationStatus(message)
          onStatusChangeRef.current?.(message)
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 10000,
        }
      )
    } catch (error) {
      console.error(error)
      const message = "Platsdelning kunde inte startas på den här enheten"
      setSafeLocationStatus(message)
      onStatusChangeRef.current?.(message)
      clearLocationWatch()
      return () => {
        isActive = false
      }
    }

    return () => {
      isActive = false
      clearLocationWatch()
    }
  }, [isLocationEnabled])

  useEffect(() => {
    return () => {
      clearLocationWatch()
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
